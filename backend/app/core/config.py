from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+psycopg2://itros:itros_secret@localhost:5432/itros"
    jwt_secret: str = "change-me-in-production"
    jwt_expire_minutes: int = 30
    jwt_refresh_expire_days: int = 7
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    ml_model_path: str = "app/ml/models"
    routing_max_active_tasks: int = 10
    seed_demo_password: str = "itros123"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
