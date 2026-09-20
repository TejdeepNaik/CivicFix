"""AI Services package initialization."""

try:
    from .base import BaseAIService
    from .mock import MockAIService
    from .openai_provider import OpenAIAIService
    from .factory import get_ai_service
except Exception:  # pragma: no cover
    # Provide minimal stubs for environments without optional AI dependencies
    BaseAIService = object
    MockAIService = object
    OpenAIAIService = object
    def get_ai_service(*args, **kwargs):
        raise NotImplementedError('AI service not available')

__all__ = [
    "BaseAIService",
    "MockAIService",
    "OpenAIAIService",
    "get_ai_service"
]
