from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import pandas as pd
from io import StringIO
from app.services.shadow_strategy import build_strategy
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/shadow-strategy")
async def generate_shadow_strategy(
    file: UploadFile = File(...),
    moderate_limit: int = 12,
    high_risk_limit: int = 10
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
    try:
        content = await file.read()
        df = pd.read_csv(StringIO(content.decode("utf-8")))
        
        required_cols = {'portfolio_value', 'investor', 'recently_bought', 'recently_sold'}
        if not required_cols.issubset(set(df.columns)):
            raise HTTPException(status_code=400, detail=f"CSV must contain columns: {', '.join(required_cols)}")
            
        result = build_strategy(df, moderate_limit=moderate_limit, high_risk_limit=high_risk_limit)
        return JSONResponse(content=result)
    except Exception as e:
        logger.error(f"Error processing shadow strategy CSV: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/shadow-strategy/auto-fetch")
async def auto_fetch_shadow_strategy(
    moderate_limit: int = 12,
    high_risk_limit: int = 10
):
    try:
        from app.services.mock_trendlyne import generate_mock_superstar_data
        df = generate_mock_superstar_data()
        result = build_strategy(df, moderate_limit=moderate_limit, high_risk_limit=high_risk_limit)
        return JSONResponse(content=result)
    except Exception as e:
        logger.error(f"Error auto-fetching shadow strategy: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/shadow-strategy/optimize-weights")
async def optimize_shadow_weights(payload: dict):
    """
    Generate optimized portfolio weights from shadow strategy data.
    Filters by signal strength, removes conflicts, caps per-stock limits, and applies tilt.
    """
    try:
        items = payload.get("items", [])
        signal_threshold = payload.get("signal_threshold", 20)
        
        if not items:
            raise HTTPException(status_code=400, detail="No strategy items provided")
        
        df = pd.DataFrame(items)
        
        # 1. Filter and rank
        df = df[df["total_signal_pct"] >= signal_threshold]
        df = df.sort_values("score", ascending=False)
        df = df.head(20)
        
        if len(df) == 0:
            raise HTTPException(status_code=400, detail=f"No stocks meet the minimum signal threshold ({signal_threshold}%)")
        
        # 2. Drop conflicted names (in sell list)
        df = df[df["appears_in_sell_list"] == False]
        
        if len(df) == 0:
            raise HTTPException(status_code=400, detail="No stocks remain after removing conflicted names")
        
        # 3. Use Target Weight Pct as base
        weights = df["target_weight_pct"].astype(float).copy()
        
        # 4. Enforce hard caps (8% per stock)
        max_per_stock = 0.08
        weights = weights.clip(upper=max_per_stock)
        
        # 5. Re-normalize to 100%
        weights = weights / weights.sum()
        
        # 6. Apply tilt based on Est. Signal Value
        tilt = df["est_signal_value_cr"].astype(float) / df["est_signal_value_cr"].astype(float).max()
        weights = weights * (1 + 0.5 * tilt)
        weights = weights / weights.sum()
        
        # Build result with stock symbols and weights
        result = []
        for idx, row in df.iterrows():
            result.append({
                "stock": row["stock"],
                "yf_symbol": row.get("yf_symbol", ""),
                "optimized_weight_pct": round(weights.iloc[len(result)] * 100, 2),
                "total_signal_pct": row["total_signal_pct"],
                "est_signal_value_cr": row["est_signal_value_cr"],
                "investors": row.get("investors", 0)
            })
        
        total_weight = sum(r["optimized_weight_pct"] for r in result)
        cash_allocation = round(100 - total_weight, 2)
        
        return {
            "success": True,
            "portfolio_weights": result,
            "cash_allocation": cash_allocation,
            "total_weight": total_weight,
            "stock_count": len(result)
        }
    except Exception as e:
        logger.error(f"Error optimizing shadow weights: {e}")
        raise HTTPException(status_code=500, detail=str(e))
