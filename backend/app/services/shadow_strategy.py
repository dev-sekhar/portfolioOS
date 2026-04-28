import pandas as pd
import re
from pathlib import Path

TRUSTED_INVESTORS = [
    "Ashish Kacholia",
    "Mukul Agrawal",
    "Vijay Kishanlal Kedia",
    "Rakesh Jhunjhunwala and Associates",
    "Rekha Jhunjhunwala",
    "Madhusudan Kela",
    "Ashish Dhawan",
    "Ajay Upadhyaya",
    "Sunil Singhania",
    "Amit Gupta",
]

ITEM_RE = re.compile(r'(.+?)\s+([+-]?\d+(?:\.\d+)?)%')
PCT_RE = re.compile(r'([+-]?\d+(?:\\.\\d+)?)%')
VALUE_RE = re.compile(r'([\\d,]+(?:\\.\\d+)?)\\s*Cr')


def parse_portfolio_value(text):
    if pd.isna(text):
        return None
    m = VALUE_RE.search(str(text))
    return float(m.group(1).replace(',', '')) if m else None


def split_items(text):
    if pd.isna(text) or str(text).strip() == '-':
        return []
    s = str(text).replace('…', '')
    matches = list(ITEM_RE.finditer(s))
    items = []
    for i, m in enumerate(matches):
        start = m.start()
        prev_end = matches[i - 1].end() if i > 0 else 0
        name = (s[prev_end:start] + m.group(1)) if i > 0 else m.group(1)
        name = re.sub(r'\\s+', ' ', name).strip()
        items.append((name, float(m.group(2))))
    if not items:
        parts = re.split(r'\\s{2,}', s)
        i = 0
        while i < len(parts) - 1:
            name = parts[i].strip()
            pct_match = PCT_RE.search(parts[i + 1])
            if name and pct_match:
                items.append((name, float(pct_match.group(1))))
                i += 2
            else:
                i += 1
    return items


def build_transaction_table(df, action):
    rows = []
    col = 'recently_bought' if action == 'buy' else 'recently_sold'
    for _, row in df.iterrows():
        pv = row['portfolio_value_cr']
        for stock, pct in split_items(row[col]):
            pct_abs = abs(pct)
            rows.append({
                'investor': row['investor'],
                'stock': stock,
                'action': action,
                'signal_pct': pct,
                'signal_abs_pct': pct_abs,
                'portfolio_value_cr': pv,
                'estimated_signal_value_cr': None if pv is None else pv * pct_abs / 100.0,
            })
    if not rows:
        return pd.DataFrame(columns=['investor', 'stock', 'action', 'signal_pct', 'signal_abs_pct', 'portfolio_value_cr', 'estimated_signal_value_cr'])
    return pd.DataFrame(rows)


def build_strategy(df):
    df['portfolio_value_cr'] = df['portfolio_value'].apply(parse_portfolio_value)
    buys = build_transaction_table(df, 'buy')
    sells = build_transaction_table(df, 'sell')

    trusted_buys = buys[buys['investor'].isin(TRUSTED_INVESTORS)].copy()
    grouped = trusted_buys.groupby('stock').agg(
        investors=('investor', 'nunique'),
        total_signal_pct=('signal_abs_pct', 'sum'),
        est_signal_value_cr=('estimated_signal_value_cr', 'sum'),
    ).reset_index()

    investor_names = trusted_buys.groupby('stock')['investor'].apply(lambda s: ', '.join(sorted(set(s)))).reset_index(name='investors_list')
    grouped = grouped.merge(investor_names, on='stock', how='left')

    sell_names = sells.groupby('stock')['investor'].apply(lambda s: ', '.join(sorted(set(s)))).reset_index(name='sellers_list')
    grouped = grouped.merge(sell_names, on='stock', how='left')
    grouped['appears_in_sell_list'] = grouped['sellers_list'].notna()

    grouped['score'] = grouped['investors'] * 2 + grouped['total_signal_pct']
    grouped = grouped.sort_values(['investors', 'total_signal_pct', 'est_signal_value_cr'], ascending=False)
    grouped['raw_weight_pct'] = grouped['score'] / grouped['score'].sum() * 100

    moderate = grouped.copy().head(12)
    moderate['target_weight_pct'] = moderate['raw_weight_pct'].clip(upper=8)
    moderate_total = moderate['target_weight_pct'].sum()
    if moderate_total > 80:
        moderate['target_weight_pct'] = moderate['target_weight_pct'] / moderate_total * 80
    cash_moderate = round(100 - moderate['target_weight_pct'].sum(), 2)

    high_risk = grouped[grouped['total_signal_pct'] >= 1].copy().head(10)
    high_risk['target_weight_pct'] = high_risk['raw_weight_pct'].clip(upper=15)
    high_total = high_risk['target_weight_pct'].sum()
    if high_total > 80:
        high_risk['target_weight_pct'] = high_risk['target_weight_pct'] / high_total * 80
    cash_high = round(100 - high_risk['target_weight_pct'].sum(), 2)

    review_schedule = pd.DataFrame([
        {'review_type': 'Monthly light check', 'frequency': 'Every 4 weeks', 'purpose': 'Price drift, major news, thesis break check'},
        {'review_type': 'Quarterly signal review', 'frequency': 'Every 3 months', 'purpose': 'Refresh superstar buy/sell changes and rebalance if weights drift materially'},
        {'review_type': 'Semi-annual deep review', 'frequency': 'Every 6 months', 'purpose': 'Drop weak names, add new conviction names, review sector concentration'},
        {'review_type': 'Annual rebalance', 'frequency': 'Every 12 months', 'purpose': 'Reset strategy weights, review benchmark performance, tax-aware cleanup'},
        {'review_type': 'Event-driven review', 'frequency': 'As needed', 'purpose': 'Run immediately after earnings shock, governance issue, or 20%+ price move'},
    ])

    return {
        "moderate": moderate.fillna("").to_dict(orient="records"),
        "cash_moderate": cash_moderate,
        "high_risk": high_risk.fillna("").to_dict(orient="records"),
        "cash_high": cash_high,
        "review_schedule": review_schedule.fillna("").to_dict(orient="records")
    }
