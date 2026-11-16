from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    groq_api_key: str = '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'
    gpt_model: str = 'openai/gpt-oss-120b'
    class ConfigDict:
        env_file = '.env'

settings = Settings()
