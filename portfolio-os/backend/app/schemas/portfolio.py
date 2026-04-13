from typing import List

from pydantic import BaseModel, Field

class PortfolioCreate(BaseModel):
    owner_email: str = Field(..., min_length=3, max_length=200)
    stock_symbol: str | None = Field(default=None, min_length=1, max_length=30)
    total_qty: float | None = Field(default=None, gt=0)
    average_cost_price: float | None = Field(default=None, gt=0)
    current_market_price: float | None = Field(default=None, gt=0)
    market: str | None = Field(default=None, pattern="^(india|us|global)$")
    transaction_date: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    category: str = Field(..., pattern="^(core|growth|defensive|global|hedge|cash)$")
    name: str | None = Field(default=None, min_length=1, max_length=100)
    value: float | None = Field(default=None, gt=0)

class PortfolioResponse(BaseModel):
    id: int
    stock_symbol: str
    company_name: str
    total_qty: float
    average_cost_price: float
    avg_cost_price: float
    current_market_price: float
    portfolio_valuation_date: str
    transaction_date: str
    market: str
    value_at_cost: float
    value_at_market_price: float
    profit_loss_actual: float
    profit_loss_percentage: float
    category: str
    name: str
    value: float

    class Config:
        from_attributes = True


class PortfolioBulkDelete(BaseModel):
    ids: List[int] = Field(..., min_length=1)


class DeleteResponse(BaseModel):
    message: str
    deleted_count: int


class BuildBucketRecommendation(BaseModel):
    bucket: str
    amount: float
    suggestions: List[str]


class BuildPortfolioResponse(BaseModel):
    risk: str
    locale: str
    amount: float
    buckets: List[BuildBucketRecommendation]