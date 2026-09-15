"""Deterministic mock AI provider for testing and offline fallback."""

import math
import hashlib
from typing import Dict, Any, List
from .base import BaseAIService
from ...models.complaint import ComplaintCategoryEnum, ComplaintPriorityEnum


class MockAIService(BaseAIService):
    """Mock implementation of BaseAIService providing deterministic text analysis and embeddings."""

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
