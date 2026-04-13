def stress_test(total, mild_drop=10, recession_drop=20, crash_drop=30):
    return {
        "mild": total * (1 - mild_drop / 100),
        "recession": total * (1 - recession_drop / 100),
        "crash": total * (1 - crash_drop / 100),
        "levels": {
            "mild_drop": mild_drop,
            "recession_drop": recession_drop,
            "crash_drop": crash_drop,
        },
    }


def event_risk(total):
    # Historical-style scenario assumptions for event-based drawdowns.
    events = {
        "pandemic_2020": 34,
        "bank_meltdown_2007": 52,
        "war_2026": 18,
    }
    return {name: total * (1 - drop / 100) for name, drop in events.items()}