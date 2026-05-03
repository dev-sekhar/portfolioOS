# Portfolio Strategies

This document outlines the portfolio strategies available in the Shadow Portfolio Strategy module and provides a glossary of all terms visible on the screen and used in the system.

## Portfolio Strategies

### Moderate Strategy
- **Description:** A balanced strategy designed for moderate risk. It selects up to 12 top-scored stocks based on super-investor buying signals.
- **Constraints:**
  - Individual stock target weights are capped at **8%**.
  - The total allocation for all selected stocks is scaled to a maximum of **80%**, leaving the remainder as a cash reserve (Moderate Cash Allocation).

### High Risk Strategy
- **Description:** A more aggressive strategy focused on stocks with strong buying signals. It selects up to 10 stocks where the total buying signal is at least 1%.
- **Constraints:**
  - Individual stock target weights are capped at **15%**.
  - The total allocation for all selected stocks is scaled to a maximum of **80%**, leaving the remainder as cash (High Risk Cash Allocation).

### Review Schedule
A set of recommended periodic checks for reviewing the portfolio:
- **Monthly light check:** Every 4 weeks (Purpose: Price drift, major news, thesis break check).
- **Quarterly signal review:** Every 3 months (Purpose: Refresh superstar buy/sell changes and rebalance if weights drift materially).
- **Semi-annual deep review:** Every 6 months (Purpose: Drop weak names, add new conviction names, review sector concentration).
- **Annual rebalance:** Every 12 months (Purpose: Reset strategy weights, review benchmark performance, tax-aware cleanup).
- **Event-driven review:** As needed (Purpose: Run immediately after earnings shock, governance issue, or 20%+ price move).

---

## Glossary of Terms

### Overview Metrics
- **Moderate Cash Allocation:** The recommended cash reserve percentage for the moderate-risk strategy, balancing growth with stability. It is calculated as 100% minus the sum of the target weights in the moderate strategy.
- **High Risk Cash Allocation:** The more aggressive cash allocation percentage for the high-risk strategy, allowing greater market exposure. It is calculated as 100% minus the sum of the target weights in the high-risk strategy.

### Table Columns
- **Stock:** The name of the company or equity being analyzed.
- **Investors:** The total number of unique trusted super-investors who have recently bought the stock.
- **Total Signal %:** The cumulative absolute percentage of portfolio value that trusted investors have recently allocated to buying this stock.
- **Est. Signal Value (Cr):** The estimated monetary value (in Crores) of the total buy signals for this stock across all tracked trusted investors.
- **Investors List:** A comma-separated list of the specific trusted investors who have bought the stock.
- **Sellers:** A comma-separated list of investors who have recently sold or reduced their holdings in the stock.
- **In Sell List:** A boolean indicator (True/False) denoting whether the stock appears in any recent sell transactions.
- **Score:** A computed metric used to rank the stocks. It is calculated as `(Investors * 2) + Total Signal %`.
- **Raw Weight %:** The initial, unconstrained weight of the stock in the portfolio, calculated proportionally based on its Score relative to the total score of all selected stocks.
- **YF Symbol:** The corresponding Yahoo Finance ticker symbol for the stock, used for fetching market data.
- **Target Weight (Target Weight Pct):** The final recommended allocation percentage for the stock in the strategy, after applying individual caps (8% for Moderate, 15% for High Risk) and scaling the total portfolio allocation to a maximum of 80%.

### Review Schedule Columns
- **Review Type:** The category or name of the review (e.g., Monthly light check, Annual rebalance).
- **Frequency:** How often the review should be conducted (e.g., Every 4 weeks, Every 12 months).
- **Purpose:** The specific goals and actions to be taken during the review.
- **Review Date:** The date when the review is scheduled or completed.
- **Review Action:** The action associated with the review.
