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

    else:  # high
        return {
            "growth": 0.5,
            "core": 0.2,
            "global": 0.2,
            "hedge": 0.05,
            "cash": 0.05
        }


def allocate_amount(amount, allocation):
    return {k: v * amount for k, v in allocation.items()}