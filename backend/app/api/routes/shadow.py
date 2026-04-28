from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import pandas as pd
from io import StringIO
from app.services.shadow_strategy import build_strategy
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/shadow-strategy")
async def generate_shadow_strategy(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
    try:
        content = await file.read()
        df = pd.read_csv(StringIO(content.decode("utf-8")))
        
        required_cols = {'portfolio_value', 'investor', 'recently_bought', 'recently_sold'}
        if not required_cols.issubset(set(df.columns)):
            raise HTTPException(status_code=400, detail=f"CSV must contain columns: {', '.join(required_cols)}")
            
        result = build_strategy(df)
        return JSONResponse(content=result)
    except Exception as e:
        logger.error(f"Error processing shadow strategy CSV: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/shadow-strategy/auto-fetch")
async def auto_fetch_shadow_strategy():
    try:
        from app.services.mock_trendlyne import generate_mock_superstar_data
        df = generate_mock_superstar_data()
        result = build_strategy(df)
        return JSONResponse(content=result)
    except Exception as e:
        logger.error(f"Error auto-fetching shadow strategy: {e}")
        raise HTTPException(status_code=500, detail=str(e))
