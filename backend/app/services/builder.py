from app.services.price_feed import resolve_symbol_candidates
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
import logging
import time

logger = logging.getLogger(__name__)

# Seed queries by locale and risk bucket; results are fetched dynamically.
BUCKET_QUERY_SEEDS = {
    "india": {
        "core": ["Nifty 50 ETF", "Sensex ETF", "large cap index fund"],
        "growth": ["Nifty Next 50 ETF", "midcap index fund", "tech fund india"],
        "defensive": ["low volatility ETF india", "dividend yield fund india", "fmcg fund"],
        "global": ["Nasdaq 100 ETF india", "S&P 500 ETF india", "US total market fund"],
    },
    "us": {
        "core": ["S&P 500 ETF", "total market ETF", "dow jones ETF"],
        "growth": ["nasdaq 100", "semiconductor ETF", "growth index fund"],
        "defensive": ["dividend appreciation ETF", "low volatility ETF", "value fund"],
        "global": ["international equity ETF", "developed markets ETF", "emerging markets fund"],
    },
    "global": {
        "core": ["world index ETF", "global equity ETF", "broad market fund"],
        "growth": ["tech ETF", "innovation fund", "growth ETF"],
        "defensive": ["dividend aristocrats ETF", "low volatility fund", "value ETF"],
        "global": ["international ETF", "developed market fund", "emerging markets fund"],
    },
}

_BUCKET_GENERIC_TERMS = {
    "core": ["index fund", "broad market ETF", "large cap fund"],
    "growth": ["growth fund", "innovation ETF", "midcap fund"],
    "defensive": ["low volatility fund", "dividend fund", "value ETF"],
    "global": ["international fund", "world ETF", "global equity fund"],
}

BUCKET_REASONING = {
    "core": "Foundation of the portfolio using broad-market index funds for stable, long-term growth with lower costs.",
    "growth": "Focuses on high-growth sectors and mid-cap companies to capture capital appreciation in expanding markets.",
    "defensive": "Low-volatility and value-oriented funds designed to provide stability and downside protection during market downturns.",
    "global": "Provides geographic diversification across international markets to reduce dependency on a single country's economy.",
}


_BUILD_QUERY_LIMIT = 2
_BUILD_QUERY_TIMEOUT_SEC = 0.8
_BUILD_BUCKET_TIMEOUT_SEC = 1.8


def build_portfolio(amount, risk):

    if risk == "low":
        return {
            "core": 0.5,
            "defensive": 0.4,
            "global": 0.1,
        }

    elif risk == "medium":
        return {
            "core": 0.4,
            "growth": 0.3,
            "defensive": 0.2,
            "global": 0.1,
        }

    elif risk == "high":
        return {
            "growth": 0.6,
            "core": 0.2,
            "global": 0.2,
        }

    else:
        raise ValueError("Invalid risk level")


def allocate_amount(amount, allocation):
    return {k: v * amount for k, v in allocation.items()}


def get_target_allocation(risk):
    return build_portfolio(1, risk)


def _build_query_plan(locale, bucket):
    query_map = BUCKET_QUERY_SEEDS.get(locale, BUCKET_QUERY_SEEDS["global"])
    seeds = query_map.get(bucket, [])
    locale_hint = "india" if locale == "india" else "us" if locale == "us" else "global"

    # Live-only discovery plan: bucket-specific seeds + runtime-expanded generic terms.
    generic = [f"{term} {locale_hint}" for term in _BUCKET_GENERIC_TERMS.get(bucket, [])]
    broad = [f"{bucket} {locale_hint} ETF", f"{bucket} {locale_hint} index fund"]

    plan = []
    seen = set()
    for query in [*seeds, *generic, *broad]:
        normalized = query.strip().lower()
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        plan.append(query)
    return plan


def _get_dynamic_bucket_suggestions(locale, bucket, limit=6):
    started_at = time.perf_counter()
    queries = _build_query_plan(locale, bucket)

    collected = []
    seen = set()

    for idx, query in enumerate(queries):
        if (time.perf_counter() - started_at) >= _BUILD_BUCKET_TIMEOUT_SEC:
            logger.warning(
                "[builder] bucket timeout bucket=%s locale=%s timeout_sec=%s",
                bucket,
                locale,
                _BUILD_BUCKET_TIMEOUT_SEC,
            )
            break

        if idx >= _BUILD_QUERY_LIMIT:
            break

        # Build flow prioritizes responsiveness; live quote checks happen when user adds instruments.
        executor = ThreadPoolExecutor(max_workers=1)
        future = executor.submit(
            resolve_symbol_candidates,
            query,
            locale,
            6,
            False,
        )
        try:
            query_started_at = time.perf_counter()
            candidates = future.result(timeout=_BUILD_QUERY_TIMEOUT_SEC)
            query_elapsed_ms = round((time.perf_counter() - query_started_at) * 1000)
            logger.info(
                "[builder] query bucket=%s locale=%s query=%s candidates=%s elapsed_ms=%s",
                bucket,
                locale,
                query,
                len(candidates),
                query_elapsed_ms,
            )
        except FuturesTimeoutError:
            candidates = []
            logger.warning(
                "[builder] query timeout bucket=%s locale=%s query=%s timeout_sec=%s",
                bucket,
                locale,
                query,
                _BUILD_QUERY_TIMEOUT_SEC,
            )
        except Exception:
            candidates = []
            logger.exception(
                "[builder] query failed bucket=%s locale=%s query=%s",
                bucket,
                locale,
                query,
            )
        finally:
            executor.shutdown(wait=False, cancel_futures=True)

        for candidate in candidates:
            symbol = candidate["symbol"]
            if symbol in seen:
                continue
            seen.add(symbol)
            collected.append(symbol)
            if len(collected) >= limit:
                return collected

    elapsed_ms = round((time.perf_counter() - started_at) * 1000)
    logger.info(
        "[builder] bucket done bucket=%s locale=%s suggestions=%s elapsed_ms=%s",
        bucket,
        locale,
        len(collected),
        elapsed_ms,
    )
    return collected


def get_bucket_suggestions(locale, bucket):
    return _get_dynamic_bucket_suggestions(locale, bucket, limit=6)


def build_bucket_recommendations(amount, risk, locale):
    started_at = time.perf_counter()
    allocation = build_portfolio(amount, risk)
    amounts = allocate_amount(amount, allocation)

    buckets = [
        {
            "bucket": bucket,
            "amount": bucket_amount,
            "logic": BUCKET_REASONING.get(bucket, ""),
            "suggestions": get_bucket_suggestions(locale, bucket)
        }
        for bucket, bucket_amount in amounts.items()
    ]

    elapsed_ms = round((time.perf_counter() - started_at) * 1000)
    logger.info(
        "[builder] recommendations done locale=%s risk=%s buckets=%s elapsed_ms=%s",
        locale,
        risk,
        len(buckets),
        elapsed_ms,
    )
    return buckets