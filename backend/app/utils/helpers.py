from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo


MARKET_CONFIG = {
	"india": {"timezone": "Asia/Kolkata", "close_time": time(15, 30)},
	"us": {"timezone": "America/New_York", "close_time": time(16, 0)},
	"global": {"timezone": "UTC", "close_time": time(16, 0)},
}


def infer_market_from_symbol(stock_symbol: str) -> str:
	symbol = (stock_symbol or "").strip().upper()
	if symbol.endswith(".NS") or symbol.endswith(".BO"):
		return "india"
	return "global"


def _previous_business_day(reference: datetime) -> datetime:
	current = reference
	while current.weekday() >= 5:
		current = current - timedelta(days=1)
	return current


def last_market_close_date(market: str) -> str:
	normalized_market = (market or "global").lower()
	config = MARKET_CONFIG.get(normalized_market, MARKET_CONFIG["global"])
	now = datetime.now(ZoneInfo(config["timezone"]))
	close_time = config["close_time"]

	if now.weekday() >= 5:
		close_day = _previous_business_day(now)
	elif now.time() >= close_time:
		close_day = now
	else:
		close_day = _previous_business_day(now - timedelta(days=1))

	return close_day.date().isoformat()
