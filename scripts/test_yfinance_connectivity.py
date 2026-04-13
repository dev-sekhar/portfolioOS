import time
from typing import Iterable

import yfinance as yf


def check_ticker_history(symbol: str, period: str = "5d") -> tuple[bool, str, float]:
    started = time.perf_counter()
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period=period)
        elapsed = (time.perf_counter() - started) * 1000
        if hist.empty:
            return False, "history is empty", elapsed
        close = hist.get("Close")
        last_close = float(close.dropna().iloc[-1]) if close is not None and not close.dropna().empty else None
        return True, f"rows={len(hist)} last_close={last_close}", elapsed
    except Exception as exc:
        elapsed = (time.perf_counter() - started) * 1000
        return False, f"exception={type(exc).__name__}: {exc}", elapsed


def check_search(query: str, max_results: int = 5) -> tuple[bool, str, float]:
    started = time.perf_counter()
    try:
        search = yf.Search(
            query=query,
            max_results=max_results,
            news_count=0,
            include_cb=False,
            include_nav_links=False,
            enable_fuzzy_query=True,
        )
        quotes = getattr(search, "quotes", []) or []
        elapsed = (time.perf_counter() - started) * 1000
        symbols = [str(item.get("symbol", "")) for item in quotes[:max_results]]
        return True, f"quotes={len(quotes)} symbols={symbols}", elapsed
    except Exception as exc:
        elapsed = (time.perf_counter() - started) * 1000
        return False, f"exception={type(exc).__name__}: {exc}", elapsed


def print_result(name: str, ok: bool, detail: str, elapsed_ms: float) -> None:
    status = "OK" if ok else "FAIL"
    print(f"[{status}] {name} ({elapsed_ms:.0f} ms) -> {detail}")


def run_tests(symbols: Iterable[str], queries: Iterable[str]) -> int:
    failures = 0

    for symbol in symbols:
        ok, detail, elapsed = check_ticker_history(symbol)
        print_result(f"history:{symbol}", ok, detail, elapsed)
        if not ok:
            failures += 1

    for query in queries:
        ok, detail, elapsed = check_search(query)
        print_result(f"search:{query}", ok, detail, elapsed)
        if not ok:
            failures += 1

    return failures


def main() -> int:
    print("Testing yfinance connectivity...")
    symbols = ["AAPL", "MSFT", "RELIANCE.NS"]
    queries = ["Nifty ETF", "S&P 500 ETF", "gold india"]

    started = time.perf_counter()
    failures = run_tests(symbols, queries)
    total_elapsed = (time.perf_counter() - started) * 1000

    print(f"Completed in {total_elapsed:.0f} ms with failures={failures}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
