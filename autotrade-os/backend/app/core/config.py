from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "AutoTrade OS"
    api_prefix: str = "/api"
    database_url: str = "sqlite:///./autotrade.db"
    cors_origins: list[str] | str = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    enable_live_trading: bool = False
    paper_starting_cash: float = 100_000.0
    default_fees_bps: float = 1.0
    default_slippage_bps: float = 2.0
    default_max_risk_per_trade: float = 0.02
    market_timezone: str = "America/New_York"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @field_validator("cors_origins")
    @classmethod
    def parse_cors_origins(cls, value: list[str] | str) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()

