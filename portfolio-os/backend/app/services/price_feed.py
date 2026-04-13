import math
from functools import lru_cache

import yfinance as yf


_MARKET_SUFFIX = {
    "india": ".NS",
    "us": "",
    "global": "",
}


def _market_match(symbol: str, exchange: str, market: str) -> bool:
    normalized_market = (market or "global").lower()
    if normalized_market == "india":
        return symbol.endswith(".NS") or symbol.endswith(".BO") or exchange in {"NSE", "BSE"}
    if normalized_market == "us":
        return not symbol.endswith(".NS") and not symbol.endswith(".BO")
    return True


@lru_cache(maxsize=1024)
def _ticker_has_usable_price(symbol: str) -> bool:
    """Return True only if Yahoo has recent usable close/price data for symbol."""
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="5d")
        if not hist.empty:
            close_vals = hist["Close"].dropna()
            if not close_vals.empty:
                candidate = float(close_vals.iloc[-1])
                if _is_valid(candidate):
                    return True

        candidate = ticker.fast_info.last_price
        return _is_valid(candidate)
    except Exception:
        return False


def _resolve_yf_symbol(symbol: str, market: str) -> str:
    sym = symbol.strip().upper()
    if "." in sym:
        # already has exchange suffix (e.g. RELIANCE.NS, RELIANCE.BO)
        return sym
    suffix = _MARKET_SUFFIX.get((market or "global").lower(), "")
    return sym + suffix


def resolve_symbol_candidates(query: str, market: str = "global", limit: int = 8) -> list[dict]:
    cleaned_query = (query or "").strip()
    if len(cleaned_query) < 2:
        return []

    try:
        search = yf.Search(
            query=cleaned_query,
            max_results=25,
            news_count=0,
            include_cb=False,
            include_nav_links=False,
            enable_fuzzy_query=True,
        )
        quotes = getattr(search, "quotes", []) or []
    except Exception:
        return []

    query_upper = cleaned_query.upper()
    candidates = []
    seen = set()

    for item in quotes:
        symbol = str(item.get("symbol") or "").upper()
        if not symbol or symbol in seen:
            continue

        exchange = str(item.get("exchangeDisp") or item.get("exchange") or "").upper()
        if not _market_match(symbol, exchange, market):
            continue

        if not _ticker_has_usable_price(symbol):
            continue

        name = str(item.get("longname") or item.get("shortname") or symbol)
        score = 0
        if symbol == query_upper:
            score += 100
        elif symbol.startswith(query_upper):
            score += 70
        if query_upper in name.upper():
            score += 40
        if symbol.endswith(".NS"):
            score += 5

        seen.add(symbol)
        candidates.append(
            {
                "symbol": symbol,
                "name": name,
                "exchange": exchange,
                "score": score,
            }
        )

    candidates.sort(key=lambda c: (c["score"], c["symbol"]), reverse=True)
    return candidates[:limit]


def is_valid_ticker(symbol: str, market: str = "global") -> bool:
    """Strict validity check for requested market + ticker data availability."""
    cleaned = (symbol or "").strip().upper()
    if not cleaned:
        return False

    exchange = ""
    if cleaned.endswith(".NS"):
        exchange = "NSE"
    elif cleaned.endswith(".BO"):
        exchange = "BSE"

    if not _market_match(cleaned, exchange, market):
        return False

    return _ticker_has_usable_price(cleaned)


@lru_cache(maxsize=1024)
def get_company_name(symbol: str) -> str:
    """Resolve a human-friendly company/security name for a ticker symbol."""
    cleaned = (symbol or "").strip().upper()
    if not cleaned:
        return ""

    try:
        search = yf.Search(
            query=cleaned,
            max_results=10,
            news_count=0,
            include_cb=False,
            include_nav_links=False,
            enable_fuzzy_query=False,
        )
        quotes = getattr(search, "quotes", []) or []
        for item in quotes:
            item_symbol = str(item.get("symbol") or "").upper()
            if item_symbol == cleaned:
                return str(item.get("longname") or item.get("shortname") or cleaned)
    except Exception:
        pass

    return cleaned


def _is_valid(val) -> bool:
    """Return True only for a finite positive number."""
    try:
        f = float(val)
        return not math.isnan(f) and not math.isinf(f) and f > 0
    except (TypeError, ValueError):
        return False


def _to_float_or_none(val):
    try:
        f = float(val)
        return f if _is_valid(f) else None
    except (TypeError, ValueError):
        return None


def fetch_quote(symbol: str, market: str = "global") -> dict:
    """Fetch quote with LTP and optional bid/ask for arbitrage decisions."""
    resolved_input = symbol
    if "." not in (symbol or ""):
        candidates = resolve_symbol_candidates(symbol, market, limit=1)
        if candidates:
            resolved_input = candidates[0]["symbol"]

    yf_symbol = _resolve_yf_symbol(resolved_input, market)
    ticker = yf.Ticker(yf_symbol)

    last_price = None
    source = "unknown"

    try:
        hist = ticker.history(period="5d")
        if not hist.empty:
            close_vals = hist["Close"].dropna()
            if not close_vals.empty:
                candidate = float(close_vals.iloc[-1])
                if _is_valid(candidate):
                    last_price = candidate
                    source = "last_close"
    except Exception:
        pass

    bid = None
    ask = None
    try:
        fi = ticker.fast_info
        bid = _to_float_or_none(getattr(fi, "bid", None))
        ask = _to_float_or_none(getattr(fi, "ask", None))
        fi_price = _to_float_or_none(getattr(fi, "last_price", None))
        if fi_price is not None:
            last_price = fi_price
            source = "live"
    except Exception:
        pass

    if last_price is None:
        raise ValueError(f"Could not fetch quote for {yf_symbol}")

    currency = "INR" if (market or "").lower() == "india" else "USD"
    try:
        c = ticker.fast_info.currency
        if c:
            currency = c
    except Exception:
        pass

    return {
        "symbol": symbol.upper(),
        "resolved_symbol": yf_symbol,
        "yf_symbol": yf_symbol,
        "price": round(float(last_price), 4),
        "bid": round(float(bid), 4) if bid is not None else None,
        "ask": round(float(ask), 4) if ask is not None else None,
        "currency": currency,
        "source": source,
    }


def fetch_live_price(symbol: str, market: str = "global") -> dict:
    quote = fetch_quote(symbol, market)
    return {
        "symbol": quote["symbol"],
        "resolved_symbol": quote["resolved_symbol"],
        "yf_symbol": quote["yf_symbol"],
        "price": quote["price"],
        "currency": quote["currency"],
        "source": quote["source"],
    }
