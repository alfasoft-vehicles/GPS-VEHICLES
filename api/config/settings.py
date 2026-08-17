from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # JWT y Seguridad de Tokens
    SECRET_KEY_JWT: str
    SECRET_KEY_REFRESH: str

    # Configuración de Cookies
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"
    COOKIE_PATH: str = "/users"
    ACCESS_TOKEN_EXPIRE_SECONDS: int = 30
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 600

    # Base de Datos
    DB_URL: Optional[str] = None
    DB_TYPE: str
    DB_USER: str
    DB_PASSWORD: str
    DB_HOST: str
    DB_PORT: str
    DB_NAME: str

    # Rutas y Variables del Sistema
    ROUTE_API: Optional[str] = None
    ROUTE_APP: Optional[str] = None
    DIRECTORY_DOC: Optional[str] = None
    DEBUG: bool = False

    @property
    def DATABASE_URL(self) -> str:
        if self.DB_URL:
            return self.DB_URL
        return f"{self.DB_TYPE}://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()