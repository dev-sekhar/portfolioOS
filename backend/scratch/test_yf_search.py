import yfinance as yf
import json

search = yf.Search(query="Nifty ETF", max_results=5)
print(json.dumps(search.quotes, indent=2))
