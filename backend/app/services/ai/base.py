"""Abstract base class for AI intelligence providers."""

from abc import ABC, abstractmethod
from typing import Dict, Any, List
from ...models.complaint import ComplaintCategoryEnum, ComplaintPriorityEnum


class BaseAIService(ABC):
    """Abstract provider interface for AI classification, embedding, and summarization."""

    @abstractmethod
    def generate_embedding(self, text: str) -> List[float]:
        """Generate a 384-dimensional vector embedding for text."""
        pass

    @abstractmethod
    def suggest_category_and_priority(self, title: str, description: str) -> Dict[str, Any]:
        """Suggest category and priority based on complaint title and description."""
        pass

    @abstractmethod
    def generate_summary(self, title: str, description: str) -> str:
        """Generate a concise AI summary of the civic issue."""
        pass
