from sqlalchemy import Column, Integer, String, Float
from app.core.database import Base
from app.utils.helpers import last_market_close_date
from datetime import date
from app.services.price_feed import get_company_name

class Portfolio(Base):
    __tablename__ = "portfolio"

    id = Column(Integer, primary_key=True, index=True)
    owner_email = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    value = Column(Float, nullable=False)
    total_qty = Column(Float, nullable=True)
    average_cost_price = Column(Float, nullable=True)
    current_market_price = Column(Float, nullable=True)
    market = Column(String, nullable=True)
    transaction_date = Column(String, nullable=True)
    category = Column(String, nullable=False)

    @property
    def stock_symbol(self):
        return self.name

    @property
    def company_name(self):
        return get_company_name(self.stock_symbol)

    @property
    def resolved_total_qty(self):
        return self.total_qty if self.total_qty and self.total_qty > 0 else 1.0

    @property
    def resolved_average_cost_price(self):
        if self.average_cost_price and self.average_cost_price > 0:
            return self.average_cost_price
        return self.value / self.resolved_total_qty

    @property
    def resolved_current_market_price(self):
        if self.current_market_price and self.current_market_price > 0:
            return self.current_market_price
        return self.value / self.resolved_total_qty

    @property
    def value_at_cost(self):
        return self.resolved_total_qty * self.resolved_average_cost_price

    @property
    def value_at_market_price(self):
        return self.resolved_total_qty * self.resolved_current_market_price

    @property
    def profit_loss_actual(self):
        return self.value_at_market_price - self.value_at_cost

    @property
    def profit_loss_percentage(self):
        if self.value_at_cost == 0:
            return 0.0
        return (self.profit_loss_actual / self.value_at_cost) * 100

    @property
    def avg_cost_price(self):
        return self.resolved_average_cost_price

    @property
    def portfolio_valuation_date(self):
        return last_market_close_date(self.market or "global")

    @property
    def resolved_transaction_date(self):
        return self.transaction_date or date.today().isoformat()