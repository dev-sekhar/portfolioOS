from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from app.services.bulkdeals.extractor import extract_bulk_deals
from datetime import datetime

router = APIRouter()

@router.get("/bulk-deals")
def get_bulk_deals(
    from_date: str = Query(..., description="From date in DD-MM-YYYY format"),
    to_date: str = Query(..., description="To date in DD-MM-YYYY format")
):
    try:
        df, errors = extract_bulk_deals(from_date, to_date)
        data = df.to_dict(orient="records")
        return {"data": data, "errors": errors}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
