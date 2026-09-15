"""Factory for instantiating the active AI service provider."""

import os
from .base import BaseAIService
from .mock import MockAIService
from .openai_provider import OpenAIAIService
from ...core.config import settings


def get_ai_service() -> BaseAIService:
    """Return the configured AI service instance."""
    ai_provider = getattr(settings, "AI_PROVIDER", "mock").lower()
    api_key = getattr(settings, "AI_API_KEY", None) or os.getenv("OPENAI_API_KEY")

    if ai_provider == "openai" and api_key:
        return OpenAIAIService(api_key=api_key)
    
    return MockAIService()
