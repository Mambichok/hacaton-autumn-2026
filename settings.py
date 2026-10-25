import os


def get_openrouter_api_key() -> str:
    api_key = os.getenv("OPENROUTER_API_KEY") or os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError(
            "Задайте OPENROUTER_API_KEY в .env или окружении."
        )
    return api_key
