"""Abstract base class for AI intelligence providers."""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional


class BaseAIService(ABC):
    """Abstract provider interface for AI classification, text/image embeddings, and summarization."""

    @abstractmethod
    def generate_embedding(self, text: str) -> List[float]:
        """Generate a 384-dimensional vector embedding for text."""
        pass

    @abstractmethod
    def generate_image_embedding(self, image_input: str) -> Optional[List[float]]:
        """Generate a 384-dimensional vector embedding for an evidence image (data URL, path, or URL)."""
        pass

    @abstractmethod
    def suggest_category_and_priority(self, title: str, description: str) -> Dict[str, Any]:
        """Suggest category and priority based on complaint title and description."""
        pass

    @abstractmethod
    def generate_summary(self, title: str, description: str) -> str:
        """Generate a concise AI summary of the civic issue."""
        pass

    @abstractmethod
    def analyze_image_for_civic_issue(
        self,
        image_bytes: bytes,
        content_type: str,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        user_context: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Analyze a photograph for civic infrastructure defects using a vision-capable model.

        Args:
            image_bytes: Raw image bytes (JPEG, PNG, or WebP).
            content_type: MIME type of the image (e.g. 'image/jpeg').
            latitude: Optional latitude from device/user location. Never invented by AI.
            longitude: Optional longitude from device/user location. Never invented by AI.
            user_context: Optional text or voice dictation from the citizen describing the issue.

        Returns:
            Dict matching VisionAnalysisResponse fields:
              - primary_issue: str or None
              - is_civic_issue: bool
              - confidence: float 0.0–1.0
              - severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
              - suggested_category: ComplaintCategoryEnum value or None
              - suggested_department: str or None
              - detections: list of CivicDefectDetection dicts
              - reasoning: str
              - latitude: passed through, never modified
              - longitude: passed through, never modified
              - vision_model: str identifier of model used
              - vision_provider: str provider name
              - analysis_available: bool (False if no credentials configured)
        """
        pass

