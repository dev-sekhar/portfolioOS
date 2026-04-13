from app.services.builder import get_target_allocation


def _market_value(stock):
    qty = getattr(stock, "total_qty", None)
    cmp = getattr(stock, "current_market_price", None)
    if qty and cmp:
        return qty * cmp
    return stock.value


def analyze_portfolio(data, risk="medium"):
    total = sum([_market_value(s) for s in data])

    if total == 0:
        return 0, {}, {k: 0 for k in get_target_allocation(risk).keys()}

    allocation = {}
    for s in data:
        allocation[s.category] = allocation.get(s.category, 0) + _market_value(s)

    allocation = {k: v / total for k, v in allocation.items()}

    target = get_target_allocation(risk)
    rebalance = {}
    for k, v in target.items():
        current = allocation.get(k, 0)
        rebalance[k] = (v - current) * total

    return total, allocation, rebalance


def health_score(allocation):
    score = 0
    if allocation.get("global", 0) > 0.1:
        score += 2
    if allocation.get("hedge", 0) > 0.05:
        score += 2
    if allocation.get("defensive", 0) > 0.05:
        score += 2
    if allocation.get("core", 0) > 0.2:
        score += 2
    if allocation.get("cash", 0) > 0.03:
        score += 2
    return score