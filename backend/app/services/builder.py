from app.services.price_feed import resolve_symbol_candidates
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
import logging
import time

logger = logging.getLogger(__name__)


# Seed queries by locale and risk bucket; results are fetched dynamically.
BUCKET_QUERY_SEEDS = {
    "india": {
        "core": ["Nifty ETF", "Sensex ETF", "large cap india"],
        "growth": ["technology india", "midcap india", "growth india"],
        "defensive": ["FMCG india", "healthcare india", "consumer staples india"],
        "global": ["Nasdaq India ETF", "S&P 500 India ETF", "US index india"],
        "hedge": ["gold india", "silver india", "commodity india"],
        "cash": ["liquid bees", "treasury india", "short term debt india"],
    },
    "us": {
        "core": ["S&P 500 ETF", "total market ETF", "dow jones ETF"],
        "growth": ["nasdaq 100", "semiconductor ETF", "cloud computing ETF"],
        "defensive": ["consumer staples ETF", "healthcare ETF", "utilities ETF"],
        "global": ["international equity ETF", "developed markets ETF", "world ETF"],
        "hedge": ["gold ETF", "silver ETF", "commodity ETF"],
        "cash": ["treasury bill ETF", "ultra short bond ETF", "money market ETF"],
    },
    "global": {
        "core": ["world index ETF", "global equity ETF", "broad market ETF"],
        "growth": ["technology ETF", "innovation ETF", "growth ETF"],
        "defensive": ["consumer staples ETF", "healthcare ETF", "dividend ETF"],
        "global": ["international ETF", "developed market ETF", "emerging markets ETF"],
        "hedge": ["gold ETF", "commodity ETF", "inflation ETF"],
        "cash": ["short term bond ETF", "treasury ETF", "money market ETF"],
    },
}


_BUCKET_GENERIC_TERMS = {
    "core": ["index fund", "bluechip", "broad market"],
    "growth": ["technology", "innovation", "momentum"],
    "defensive": ["consumer staples", "healthcare", "dividend"],
    "global": ["international", "world", "developed markets"],
    "hedge": ["gold", "commodity", "inflation"],
    "cash": ["money market", "treasury", "ultra short"],
}


_BUILD_QUERY_LIMIT = 2
_BUILD_QUERY_TIMEOUT_SEC = 0.8
_BUILD_BUCKET_TIMEOUT_SEC = 1.8


def build_portfolio(amount, risk):

    if risk == "low":
        return {
            "core": 0.4,
            "defensive": 0.3,
            "global": 0.1,
            "hedge": 0.1,
            "cash": 0.1
        }

    elif risk == "medium":
        return {
            "core": 0.3,
            "growth": 0.3,
            "global": 0.2,
            "hedge": 0.1,
            "cash": 0.1
        }

    elif risk == "high":
        return {
            "growth": 0.5,
            "core": 0.2,
            "global": 0.2,
            "hedge": 0.05,
            "cash": 0.05
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
    broad = [f"{bucket} {locale_hint} ETF", f"{bucket} {locale_hint} stock"]

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