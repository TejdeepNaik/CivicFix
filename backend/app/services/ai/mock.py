"""Deterministic mock AI provider for testing and offline fallback."""

import math
import hashlib
from typing import Dict, Any, List, Optional
from .base import BaseAIService
from ...models.complaint import ComplaintCategoryEnum, ComplaintPriorityEnum



class MockAIService(BaseAIService):
    """Mock implementation of BaseAIService providing deterministic text/image embeddings and analysis."""

    EMBEDDING_DIM = 384

    def generate_embedding(self, text: str) -> List[float]:
        """Generate a 384-dimensional normalized vector deterministically derived from text tokens."""
        tokens = [token.strip().lower() for token in text.split() if len(token.strip()) > 2]
        vector = [0.0] * self.EMBEDDING_DIM
        
        if not tokens:
            tokens = ["complaint", "issue"]

        for token in tokens:
            token_hash = int(hashlib.md5(token.encode("utf-8")).hexdigest(), 16)
            for i in range(4):
                index = (token_hash + i * 97) % self.EMBEDDING_DIM
                val = ((token_hash >> (i * 8)) & 0xFF) / 255.0
                vector[index] += val

        # Normalize to unit length
        norm = math.sqrt(sum(x * x for x in vector))
        if norm > 0:
            vector = [x / norm for x in vector]
        else:
            vector[0] = 1.0

        return vector

    def generate_image_embedding(self, image_input: str) -> Optional[List[float]]:
        """Generate a 384-dimensional normalized perceptual vector from image data URL/path."""
        if not image_input or not isinstance(image_input, str):
            return None

        vector = [0.0] * self.EMBEDDING_DIM
        # Hash image string payload
        img_hash = hashlib.sha256(image_input.encode("utf-8")).hexdigest()
        raw_val = int(img_hash, 16)

        for i in range(32):
            idx = (raw_val + i * 13) % self.EMBEDDING_DIM
            val = ((raw_val >> (i * 7)) & 0xFF) / 255.0
            vector[idx] += val

        norm = math.sqrt(sum(x * x for x in vector))
        if norm > 0:
            return [x / norm for x in vector]
        return None

    def suggest_category_and_priority(self, title: str, description: str) -> Dict[str, Any]:
        """Suggest category and priority based on text keywords."""
        combined = f"{title} {description}".lower()

        # Category keyword matching
        if "water" in combined or "leak" in combined or "pipe" in combined:
            category = ComplaintCategoryEnum.WATER_LEAK
        elif "garbage" in combined or "trash" in combined or "waste" in combined:
            category = ComplaintCategoryEnum.GARBAGE
        elif "light" in combined or "lamp" in combined or "dark" in combined:
            category = ComplaintCategoryEnum.STREETLIGHT
        elif "traffic" in combined or "signal" in combined:
            category = ComplaintCategoryEnum.TRAFFIC_SIGNAL
        elif "drain" in combined or "sewer" in combined or "flood" in combined:
            category = ComplaintCategoryEnum.DRAINAGE
        elif "noise" in combined or "loud" in combined:
            category = ComplaintCategoryEnum.NOISE_POLLUTION
        elif "pothole" in combined or "hole" in combined or "road" in combined:
            category = ComplaintCategoryEnum.POTHOLE
        else:
            category = ComplaintCategoryEnum.OTHER

        # Priority keyword matching
        if "urgent" in combined or "hazard" in combined or "danger" in combined or "burst" in combined or "critical" in combined:
            priority = ComplaintPriorityEnum.CRITICAL
        elif "severe" in combined or "blocked" in combined or "major" in combined:
            priority = ComplaintPriorityEnum.HIGH
        elif "minor" in combined or "small" in combined:
            priority = ComplaintPriorityEnum.LOW
        else:
            priority = ComplaintPriorityEnum.MEDIUM

        return {
            "suggested_category": category,
            "suggested_priority": priority,
            "confidence": 0.88
        }

    def generate_summary(self, title: str, description: str) -> str:
        """Generate a concise summary of the complaint."""
        desc_snippet = description[:100] + "..." if len(description) > 100 else description
        return f"AI Summary: {title} - {desc_snippet}"

    def analyze_image_for_civic_issue(
        self,
        image_bytes: bytes,
        content_type: str,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        user_context: Optional[str] = None,
    ) -> dict:
        """
        Mock implementation: no vision model is available.

        Returns analysis_available=False and a clear message.
        Never fabricates detections or civic issue results.
        """
        return {
            "primary_issue": None,
            "is_civic_issue": False,
            "confidence": 0.0,
            "severity": None,
            "suggested_category": None,
            "suggested_department": None,
            "detections": [],
            "reasoning": (
                "No vision AI model is configured. "
                "Set OPENAI_API_KEY in your .env file to enable real image analysis. "
                "The MockAIService does not fabricate image analysis results."
            ),
            "latitude": latitude,
            "longitude": longitude,
            "vision_model": "none",
            "vision_provider": "mock",
            "analysis_available": False,
        }
