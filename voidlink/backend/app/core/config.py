from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List
import secrets


class Settings(BaseSettings):
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False

    SECRET_KEY: str = secrets.token_urlsafe(32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 43200  # 30 days

    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "changeme"

    OLLAMA_BASE_URL: str = "http://localhost:11434"

    DATABASE_URL: str = "sqlite+aiosqlite:///./voidlink.db"

    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 50

    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:8081,exp://localhost:8081"

    TAILSCALE_HOSTNAME: str = ""

    EXPO_PUSH_TOKEN: str = ""

    RATE_LIMIT_PER_MINUTE: int = 60

    MONITOR_INTERVAL: int = 5

    @property
    def allowed_origins_list(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    @property
    def max_upload_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
