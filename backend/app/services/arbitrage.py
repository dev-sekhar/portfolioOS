from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from app.services.price_feed import fetch_live_price, get_company_name


def _normalize_symbols(symbols: list[str] | None) -> list[str]:
    raw = symbols or []
    normalized = []
    seen = set()
    for symbol in raw:
        base = (symbol or "").strip().upper().replace(".NS", "").replace(".BO", "")
        if not base or base in seen:
            continue
        seen.add(base)
        normalized.append(base)
    return normalized


def _is_india_market_open(now_utc: datetime | None = None) -> bool:
    now_utc = now_utc or datetime.now(timezone.utc)
    ist = now_utc.astimezone(ZoneInfo("Asia/Kolkata"))

    # NSE/BSE regular cash session: Mon-Fri, 09:15 to 15:30 IST
    if ist.weekday() >= 5:
        return False

    minutes = ist.hour * 60 + ist.minute
    return (9 * 60 + 15) <= minutes <= (15 * 60 + 30)


def build_arbitrage_snapshot(symbols: list[str] | None = None, threshold: float = 1.0) -> dict:
    watchlist = _normalize_symbols(symbols)
    now_utc = datetime.now(timezone.utc)
    market_open = _is_india_market_open(now_utc)
    rows = []

    for base_symbol in watchlist:
        nse_symbol = f"{base_symbol}.NS"
        bse_symbol = f"{base_symbol}.BO"

        try:
            nse = fetch_live_price(nse_symbol, "india")
            bse = fetch_live_price(bse_symbol, "india")
        except Exception:
            continue

        nse_price = float(nse["price"])
        bse_price = float(bse["price"])
        spread_abs = abs(nse_price - bse_price)
        reference = ((nse_price + bse_price) / 2) if (nse_price + bse_price) else 0.0
        spread_pct = (spread_abs / reference * 100) if reference else 0.0
        buy_exchange = "NSE" if nse_price < bse_price else "BSE"
        sell_exchange = "BSE" if nse_price < bse_price else "NSE"

        rows.append(
            {
                "symbol": base_symbol,
                "company_name": get_company_name(nse_symbol),
                "nse_symbol": nse_symbol,
                "bse_symbol": bse_symbol,
                "nse_price": round(nse_price, 4),
                "bse_price": round(bse_price, 4),
                "spread_abs": round(spread_abs, 4),
                "spread_pct": round(spread_pct, 4),
                "buy_exchange": buy_exchange,
                "sell_exchange": sell_exchange,
                "arbitrage_action": f"Buy on {buy_exchange}, sell on {sell_exchange}",
                "status": "ALERT" if spread_abs >= threshold else "OK",
            }
        )

    rows.sort(key=lambda row: row["spread_abs"], reverse=True)

    active_alerts = [row for row in rows if row["status"] == "ALERT"] if market_open else []
    max_spread = rows[0]["spread_abs"] if rows else 0.0
    avg_spread = sum(row["spread_abs"] for row in rows) / len(rows) if rows else 0.0
    top_row = rows[0] if rows else None

    return {
        "updated_at": now_utc.isoformat(),
        "threshold": threshold,
        "market_open": market_open,
        "market_status": "open" if market_open else "closed",
        "tracked_count": len(rows),
        "active_alert_count": len(active_alerts),
        "max_spread": round(max_spread, 4),
        "avg_spread": round(avg_spread, 4),
        "top_spread_symbol": top_row["symbol"] if top_row else None,
        "rows": rows,
        "alerts": active_alerts[:20],
    }
