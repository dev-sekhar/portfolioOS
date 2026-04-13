from dotenv import load_dotenv
import os

load_dotenv()


def _to_int(value: str | None, default: int) -> int:
    try:
        return int(value) if value is not None else default
    except ValueError:
        return default


def _csv_to_list(value: str | None) -> list[str]:
    if not value:
        return []
    return [part.strip() for part in value.split(",") if part.strip()]


class Settings:
    DB_URL = os.getenv("DB_URL", "sqlite:///./portfolio.db")

    BACKEND_HOST = os.getenv("BACKEND_HOST", "127.0.0.1")
    BACKEND_PORT = _to_int(os.getenv("BACKEND_PORT"), 8000)

    FRONTEND_HOST = os.getenv("FRONTEND_HOST", "127.0.0.1")
    FRONTEND_PORT = _to_int(os.getenv("FRONTEND_PORT"), 5173)

    FRONTEND_ORIGIN_INTERNAL = os.getenv(
        "FRONTEND_ORIGIN_INTERNAL",
        f"http://localhost:{FRONTEND_PORT}",
    )
    FRONTEND_ORIGIN_EXTERNAL = os.getenv(
        "FRONTEND_ORIGIN_EXTERNAL",
        f"http://{FRONTEND_HOST}:{FRONTEND_PORT}",
    )

    ALLOWED_ORIGINS = _csv_to_list(os.getenv("ALLOWED_ORIGINS"))

    @property
    def cors_origins(self) -> list[str]:
        if self.ALLOWED_ORIGINS:
            return self.ALLOWED_ORIGINS
        return [
            self.FRONTEND_ORIGIN_INTERNAL,
            self.FRONTEND_ORIGIN_EXTERNAL,
            "http://localhost:5174",
            "http://127.0.0.1:5174",
        ]

settings = Settings()