from typing import List
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.models.portfolio import Portfolio
from app.schemas.portfolio import (
    BuildPortfolioResponse,
    DeleteResponse,
    PortfolioBulkDelete,
    PortfolioCreate,
    PortfolioResponse,
)
from app.api.deps import get_db
from app.services.analyzer import analyze_portfolio, health_score
from app.services.projections import estimate_portfolio_cagr, future_value, inflation_adjusted_value
from app.services.risk import event_risk, stress_test
from app.services.builder import build_bucket_recommendations
from app.utils.helpers import infer_market_from_symbol
from app.services.price_feed import fetch_live_price, is_valid_ticker, resolve_symbol_candidates
from app.services.arbitrage import build_arbitrage_snapshot

router = APIRouter()

@router.post("/add", response_model=PortfolioResponse)
def add_stock(data: PortfolioCreate, db: Session = Depends(get_db)):
    stock_symbol = data.stock_symbol or data.name
    if not stock_symbol:
        raise HTTPException(status_code=400, detail="stock_symbol is required")

    market = data.market or infer_market_from_symbol(stock_symbol)
    if not is_valid_ticker(stock_symbol, market):
        raise HTTPException(status_code=400, detail=f"Invalid ticker for market '{market}': {stock_symbol}")

    if data.total_qty and data.average_cost_price and data.current_market_price:
        total_qty = data.total_qty
        average_cost_price = data.average_cost_price
        current_market_price = data.current_market_price
    elif data.value:
        total_qty = 1.0
        average_cost_price = data.value
        current_market_price = data.value
    else:
        raise HTTPException(
            status_code=400,
            detail="Provide either total_qty/average_cost_price/current_market_price or legacy value",
        )

    market_value = total_qty * current_market_price
    transaction_date = data.transaction_date or date.today().isoformat()

    stock = Portfolio(
        owner_email=data.owner_email.strip().lower(),
        name=stock_symbol,
        value=market_value,
        total_qty=total_qty,
        average_cost_price=average_cost_price,
        current_market_price=current_market_price,
        market=market,
        transaction_date=transaction_date,
        category=data.category,
    )
    db.add(stock)
    db.commit()
    db.refresh(stock)
    return stock


@router.get("/portfolio", response_model=List[PortfolioResponse])
def list_stocks(owner_email: str, refresh_prices: bool = True, db: Session = Depends(get_db)):
    rows = (
        db.query(Portfolio)
        .filter(Portfolio.owner_email == owner_email.strip().lower())
        .order_by(Portfolio.id.desc())
        .all()
    )

    if refresh_prices and rows:
        updated = False
        for stock in rows:
            try:
                quote = fetch_live_price(stock.name, stock.market or "global")
                price = float(quote["price"])
                if price <= 0:
                    continue

                qty = stock.total_qty if stock.total_qty and stock.total_qty > 0 else 1.0
                stock.current_market_price = price
                stock.value = qty * price
                updated = True
            except Exception:
                # Keep previously stored values when live feed is unavailable.
                continue

        if updated:
            db.commit()
            for stock in rows:
                db.refresh(stock)

    return rows


@router.delete("/portfolio/{stock_id}", response_model=DeleteResponse)
def delete_stock(stock_id: int, owner_email: str, db: Session = Depends(get_db)):
    stock = (
        db.query(Portfolio)
        .filter(
            Portfolio.id == stock_id,
            Portfolio.owner_email == owner_email.strip().lower(),
        )
        .first()
    )
    if stock is None:
        raise HTTPException(status_code=404, detail="Stock not found")

    db.delete(stock)
    db.commit()
    return {"message": "Deleted", "deleted_count": 1}


@router.delete("/portfolio", response_model=DeleteResponse)
def delete_stocks(data: PortfolioBulkDelete, owner_email: str, db: Session = Depends(get_db)):
    stocks = (
        db.query(Portfolio)
        .filter(
            Portfolio.id.in_(data.ids),
            Portfolio.owner_email == owner_email.strip().lower(),
        )
        .all()
    )
    if not stocks:
        raise HTTPException(status_code=404, detail="No matching stocks found")

    deleted_count = len(stocks)
    for stock in stocks:
        db.delete(stock)

    db.commit()
    return {"message": "Deleted", "deleted_count": deleted_count}

@router.get("/analyze")
def analyze(
    owner_email: str,
    risk: str = "medium",
    inflation: float = 6.0,
    cagr: float | None = None,
    mild_drop: float = 10.0,
    recession_drop: float = 20.0,
    crash_drop: float = 30.0,
    db: Session = Depends(get_db),
):
    data = (
        db.query(Portfolio)
        .filter(Portfolio.owner_email == owner_email.strip().lower())
        .all()
    )

    total, allocation, rebalance = analyze_portfolio(data, risk)

    sector_estimation = estimate_portfolio_cagr(data)
    if cagr is None:
        cagr_5y = sector_estimation["cagr_5y"]
        cagr_10y = sector_estimation["cagr_10y"]
        cagr_source = "sector_estimated"
    else:
        cagr_5y = cagr / 100
        cagr_10y = cagr / 100
        cagr_source = "user_input"

    inflation_rate = inflation / 100
    projection_5y = future_value(total, cagr_5y, 5)
    projection_10y = future_value(total, cagr_10y, 10)

    return {
        "total": total,
        "risk": risk,
        "allocation": allocation,
        "rebalance": rebalance,
        "projection_5y": projection_5y,
        "projection_10y": projection_10y,
        "real_projection_5y": inflation_adjusted_value(projection_5y, inflation_rate, 5),
        "real_projection_10y": inflation_adjusted_value(projection_10y, inflation_rate, 10),
        "stress": stress_test(total, mild_drop, recession_drop, crash_drop),
        "event_risk": event_risk(total),
        "assumptions": {
            "inflation": inflation,
            "cagr_source": cagr_source,
            "cagr_5y": round(cagr_5y * 100, 2),
            "cagr_10y": round(cagr_10y * 100, 2),
            "sector_mix": sector_estimation["sector_mix"],
        },
        "health": health_score(allocation)
    }



@router.get("/build", response_model=BuildPortfolioResponse)
def build(amount: float, risk: str, locale: str = "global"):
    return {
        "risk": risk,
        "locale": locale,
        "amount": amount,
        "buckets": build_bucket_recommendations(amount, risk, locale)
    }


@router.get("/price/{symbol}")
def get_price(symbol: str, market: str = "global"):
    try:
        data = fetch_live_price(symbol, market)
        return data
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/symbol-search")
def symbol_search(query: str, market: str = "global", limit: int = 8):
    if not query or len(query.strip()) < 2:
        return {"query": query, "market": market, "candidates": []}

    return {
        "query": query,
        "market": market,
        "candidates": resolve_symbol_candidates(query, market, limit=limit),
    }


@router.get("/arbitrage")
def arbitrage_snapshot(symbols: str | None = None, threshold: float = 1.0):
    parsed_symbols = None
    if symbols:
        parsed_symbols = [part.strip() for part in symbols.split(",") if part.strip()]

    return build_arbitrage_snapshot(parsed_symbols, threshold)