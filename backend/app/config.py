import os
from typing import List, Union
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_DEV_SECRET = "dev-super-secret-key-change-in-prod-1234567890abcdef"

class Settings(BaseSettings):
    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env", extra="ignore")

    PROJECT_NAME: str = "Grand Horizon Hotel Booking System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = "development"
    
    # Security
    SECRET_KEY: str = DEFAULT_DEV_SECRET
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # CORS Configuration
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True

    # Database
    DATABASE_URL: str = "sqlite:///./hotel_booking.db"
    
    # Cancellation Policy
    FREE_CANCELLATION_HOURS: int = 24

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    @model_validator(mode="after")
    def validate_production_secret_key(self):
        env_clean = self.ENVIRONMENT.lower().strip()
        if env_clean in ["production", "prod", "staging"]:
            if self.SECRET_KEY == DEFAULT_DEV_SECRET or len(self.SECRET_KEY) < 32:
                raise ValueError(
                    f"CRITICAL SECURITY CONFIGURATION ERROR: You cannot run in '{self.ENVIRONMENT}' "
                    "mode with the default or weak SECRET_KEY. Please set a random SECRET_KEY (min 32 characters) in your environment or .env file."
                )
        return self

settings = Settings()
