SECTOR_RETURNS = {
    "technology": {"5y": 0.18, "10y": 0.15},
    "finance": {"5y": 0.12, "10y": 0.10},
    "energy": {"5y": 0.10, "10y": 0.08},
    "healthcare": {"5y": 0.11, "10y": 0.09},
    "consumer": {"5y": 0.10, "10y": 0.09},
    "industrial": {"5y": 0.09, "10y": 0.08},
    "broad_market": {"5y": 0.12, "10y": 0.11},
    "gold": {"5y": 0.08, "10y": 0.07},
    "cash": {"5y": 0.05, "10y": 0.05},
}

KEYWORD_TO_SECTOR = {
    "nasdaq": "technology",
    "tech": "technology",
    "software": "technology",
    "ai": "technology",
    "bank": "finance",
    "financial": "finance",
    "insurance": "finance",
    "energy": "energy",
    "oil": "energy",
    "gas": "energy",
    "pharma": "healthcare",
    "health": "healthcare",
    "fmcg": "consumer",
    "consumer": "consumer",
    "utility": "industrial",
    "industrial": "industrial",
    "index": "broad_market",
    "nifty": "broad_market",
    "sensex": "broad_market",
    "etf": "broad_market",
    "gold": "gold",
    "silver": "gold",
    "bond": "cash",
    "cash": "cash",
    "liquid": "cash",
    "deposit": "cash",
}

CATEGORY_TO_SECTOR = {
    "core": "broad_market",
    "growth": "technology",
    "defensive": "consumer",
    "global": "broad_market",
    "hedge": "gold",
    "cash": "cash",
}


def future_value(pv, rate, years):
    return pv * (1 + rate) ** years


def inflation_adjusted_value(nominal, inflation_rate, years):
    return nominal / ((1 + inflation_rate) ** years)


def _detect_sector(name, category):
    normalized_name = (name or "").lower()
    for keyword, sector in KEYWORD_TO_SECTOR.items():
        if keyword in normalized_name:
            return sector
    return CATEGORY_TO_SECTOR.get(category, "broad_market")


def estimate_portfolio_cagr(holdings):
    total = sum(item.value for item in holdings)
    if total == 0:
        return {
            "cagr_5y": 0.12,
            "cagr_10y": 0.12,
            "sector_mix": {},
        }

    sector_weights = {}
    for holding in holdings:
        sector = _detect_sector(holding.name, holding.category)
        sector_weights[sector] = sector_weights.get(sector, 0) + (holding.value / total)

    cagr_5y = 0
    cagr_10y = 0
    for sector, weight in sector_weights.items():
        cagr_5y += weight * SECTOR_RETURNS[sector]["5y"]
        cagr_10y += weight * SECTOR_RETURNS[sector]["10y"]

    return {
        "cagr_5y": cagr_5y,
        "cagr_10y": cagr_10y,
        "sector_mix": {k: round(v, 3) for k, v in sector_weights.items()},
    }