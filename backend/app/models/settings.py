from sqlalchemy import Column, String
from app.core.database import Base

class UserSettings(Base):
    __tablename__ = "user_settings"

    owner_email = Column(String, primary_key=True, index=True)
    arbitrage_watchlist = Column(String, nullable=True)
