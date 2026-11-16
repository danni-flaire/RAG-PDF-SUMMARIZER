from groq import AsyncGroq
from groq import (
    AuthenticationError,
    RateLimitError,
    APIConnectionError,
    APITimeoutError,
    APIStatusError,
)
from app.core.config import settings

class LLMService:
    def __init__(self):
        self.client = AsyncGroq(
            api_key=settings.groq_api_key
        )
    async def generate_text(self, prompt: str) -> str:
        try:
            response = await self.client.chat.completions.create(
                model=settings.gpt_model,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_completion_tokens=1000,
                temperature=0.4,
                top_p=0.88
            )
            content = response.choices[0].message.content
            if content is None:
                raise RuntimeError("The LLM returned an empty response.")
            return content
        except AuthenticationError as e:
            raise RuntimeError("Authentication failed.") from e
        except RateLimitError as e:
            raise RuntimeError("Rate limit exceeded.") from e
        except (APIConnectionError, APITimeoutError) as e:
            raise RuntimeError("Could not connect.") from e
        except APIStatusError as e:
            raise RuntimeError("API error occurred.") from e