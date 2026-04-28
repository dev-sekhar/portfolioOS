import pandas as pd
import yfinance as yf
from collections import defaultdict
from app.models.portfolio import Portfolio
from datetime import datetime, timedelta
from app.services.price_feed import _resolve_yf_symbol

def get_portfolio_eod_performance(transactions: list[Portfolio], start_date: str = None, end_date: str = None):
    if not end_date:
        end_date = datetime.today().strftime('%Y-%m-%d')
    if not start_date:
        start_date = (datetime.today() - timedelta(days=7)).strftime('%Y-%m-%d')
        
    ticker_map = {}
    for t in transactions:
        yf_sym = _resolve_yf_symbol(t.name, t.market or "global")
        ticker_map[t.name] = yf_sym
        
    yf_symbols = list(set(ticker_map.values()))
    if not yf_symbols:
        return []
        
    try:
        # Download historical data
        data = yf.download(yf_symbols, start=start_date, end=(datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1)).strftime('%Y-%m-%d'), progress=False)
        
        if data.empty:
            return []
            
        if 'Close' in data.columns.levels[0]:
            close_prices = data['Close']
        else:
            close_prices = data
            
        if isinstance(close_prices, pd.Series):
            close_prices = close_prices.to_frame(name=yf_symbols[0])
            
        # Ensure timezone-naive dates
        if close_prices.index.tz is not None:
            close_prices.index = close_prices.index.tz_localize(None)
            
        # For missing data points, forward fill prices
        close_prices = close_prices.ffill()
            
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Error downloading EOD data: {e}")
        return []
        
    txs = sorted(transactions, key=lambda x: x.transaction_date or '1900-01-01')
    
    result = []
    for date_obj, row in close_prices.iterrows():
        date_str = date_obj.strftime('%Y-%m-%d')
        total_val = 0.0
        
        holdings = defaultdict(float)
        for tx in txs:
            tx_date = tx.transaction_date or '1900-01-01'
            if tx_date <= date_str:
                qty = tx.total_qty if tx.total_qty and tx.total_qty > 0 else 1.0
                holdings[tx.name] += qty
                
        has_value = False
        for name, qty in holdings.items():
            yf_sym = ticker_map[name]
            price = row.get(yf_sym)
            if pd.notna(price):
                total_val += qty * float(price)
                has_value = True
                
        if has_value:
            result.append({
                "date": date_str,
                "value": round(total_val, 2)
            })
            
    return result
