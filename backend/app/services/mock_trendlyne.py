import pandas as pd
import random

def generate_mock_superstar_data():
    """
    Generates a mocked dataframe representing the Trendlyne superstar portfolios CSV.
    This is used for the Auto-Fetch feature since Trendlyne blocks automated scraping.
    """
    investors = [
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

    stocks = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "SBIN", "BHARTIARTL", "ITC", "L&T", "BAJFINANCE"]
    
    rows = []
    for investor in investors:
        # Mock random buys and sells
        num_buys = random.randint(1, 4)
        num_sells = random.randint(0, 2)
        
        buys = random.sample(stocks, num_buys)
        sells = random.sample([s for s in stocks if s not in buys], num_sells)

        recently_bought = "  ".join([f"{stock}  {round(random.uniform(0.1, 3.5), 2)}%" for stock in buys])
        recently_sold = "  ".join([f"{stock}  -{round(random.uniform(0.1, 2.5), 2)}%" for stock in sells])
        
        portfolio_value = f"{random.randint(500, 50000)} Cr"

        rows.append({
            "investor": investor,
            "portfolio_value": portfolio_value,
            "recently_bought": recently_bought,
            "recently_sold": recently_sold
        })

    return pd.DataFrame(rows)
