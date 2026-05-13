from sqlalchemy import Column, String, Integer
from app.core.database import Base

class UserSettings(Base):
    __tablename__ = "user_settings"

    owner_email = Column(String, primary_key=True, index=True)
    arbitrage_watchlist = Column(String, nullable=True)
    shadow_moderate_limit = Column(Integer, default=12)
    shadow_high_risk_limit = Column(Integer, default=10)
    shadow_signal_threshold = Column(Integer, default=20)
    shadow_investor_watchlist = Column(String, nullable=True)
    theme = Column(String, default="dark")
