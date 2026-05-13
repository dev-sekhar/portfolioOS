from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
import logging
from app.core.database import Base, engine
from app.core.config import settings
from app.models.portfolio import Portfolio
from app.models.settings import UserSettings
from app.api.routes.portfolio import router as portfolio_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)


def _migrate_sqlite_portfolio_table():
    if not str(engine.url).startswith("sqlite"):
        return

    with engine.begin() as conn:
        columns = {
            row[1]
            for row in conn.execute(text("PRAGMA table_info(portfolio)"))
        }

        if "total_qty" not in columns:
            conn.execute(text("ALTER TABLE portfolio ADD COLUMN total_qty FLOAT"))

        if "average_cost_price" not in columns:
            conn.execute(text("ALTER TABLE portfolio ADD COLUMN average_cost_price FLOAT"))

        if "current_market_price" not in columns:
            conn.execute(text("ALTER TABLE portfolio ADD COLUMN current_market_price FLOAT"))

        if "market" not in columns:
            conn.execute(text("ALTER TABLE portfolio ADD COLUMN market VARCHAR"))

        if "transaction_date" not in columns:
            conn.execute(text("ALTER TABLE portfolio ADD COLUMN transaction_date VARCHAR"))

        if "owner_email" not in columns:
            conn.execute(text("ALTER TABLE portfolio ADD COLUMN owner_email VARCHAR"))

        conn.execute(
            text(
                """
                UPDATE portfolio
                SET
                    total_qty = COALESCE(total_qty, 1.0),
                    average_cost_price = COALESCE(average_cost_price, value),
                    current_market_price = COALESCE(current_market_price, value),
                    market = COALESCE(market, 'global'),
                    transaction_date = COALESCE(transaction_date, DATE('now')),
                    owner_email = COALESCE(owner_email, 'legacy@local')
                """
            )
        )


# Create DB tables on startup
Base.metadata.create_all(bind=engine)
_migrate_sqlite_portfolio_table()

def _migrate_sqlite_user_settings_table():
    if not str(engine.url).startswith("sqlite"):
        return

    with engine.begin() as conn:
        try:
            columns = {
                row[1]
                for row in conn.execute(text("PRAGMA table_info(user_settings)"))
            }
            if "shadow_moderate_limit" not in columns:
                conn.execute(text("ALTER TABLE user_settings ADD COLUMN shadow_moderate_limit INTEGER DEFAULT 12"))
            if "shadow_high_risk_limit" not in columns:
                conn.execute(text("ALTER TABLE user_settings ADD COLUMN shadow_high_risk_limit INTEGER DEFAULT 10"))
        except Exception:
            pass

_migrate_sqlite_user_settings_table()

app = FastAPI(title="Portfolio OS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.routes.bulkdeals import router as bulkdeals_router
from app.api.routes.shadow import router as shadow_router

app.include_router(portfolio_router, prefix="", tags=["portfolio"])
app.include_router(bulkdeals_router, prefix="/api", tags=["bulkdeals"])
app.include_router(shadow_router, prefix="/api", tags=["shadow"])
