"""Configurable external AI service provider with graceful fallback handling."""

import os
import json
import logging
from typing import Dict, Any, List
import httpx

from .base import BaseAIService
from .mock import MockAIService
from ...models.complaint import ComplaintCategoryEnum, ComplaintPriorityEnum
from ...core.config import settings

logger = logging.getLogger(__name__)


class OpenAIAIService(BaseAIService):
    """External AI Provider with fallback to MockAIService on network/credential failures."""

    def __init__(self, api_key: str = None):
        self.api_key = api_key or getattr(settings, "AI_API_KEY", None) or os.getenv("OPENAI_API_KEY")
        self.fallback = MockAIService()

    def generate_embedding(self, text: str) -> List[float]:
        """Generate vector embedding, falling back to mock provider if API key missing or request fails."""
        if not self.api_key or self.api_key == "change-this-ai-api-key":
            return self.fallback.generate_embedding(text)

        try:
            url = "https://api.openai.com/v1/embeddings"
            headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
            # Request 384-dimensional embedding directly from text-embedding-3-small
            payload = {
                "input": text,
                "model": "text-embedding-3-small",
                "dimensions": 384
            }

            with httpx.Client(timeout=5.0) as client:
                response = client.post(url, json=payload, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    emb = data["data"][0]["embedding"]
                    if len(emb) >= 384:
                        return emb[:384]
                    else:
                        logger.warning("Returned vector dimension %d smaller than 384, falling back", len(emb))
                        return self.fallback.generate_embedding(text)
                else:
                    logger.warning("AI provider embedding HTTP error %s, falling back", response.status_code)
                    return self.fallback.generate_embedding(text)
        except (httpx.TimeoutException, httpx.RequestError, KeyError, Exception) as e:
            logger.warning("AI provider embedding exception %s, falling back to mock provider", e)
            return self.fallback.generate_embedding(text)

    def suggest_category_and_priority(self, title: str, description: str) -> Dict[str, Any]:
        """Suggest category and priority via Chat Completions API with structured validation and graceful fallback."""
        if not self.api_key or self.api_key == "change-this-ai-api-key":
            return self.fallback.suggest_category_and_priority(title, description)

        try:
            url = "https://api.openai.com/v1/chat/completions"
            headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
            
            valid_categories = [c.value for c in ComplaintCategoryEnum]
            valid_priorities = [p.value for p in ComplaintPriorityEnum]

            system_prompt = (
                "You are an AI assistant for a civic issue reporting platform. "
                "Analyze the issue title and description and output a valid JSON object with fields:\n"
                f"- category: one of {valid_categories}\n"
                f"- priority: one of {valid_priorities}\n"
                "- confidence: float between 0.0 and 1.0"
            )

            user_prompt = f"Title: {title}\nDescription: {description}"

            payload = {
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.2
            }

            with httpx.Client(timeout=5.0) as client:
                response = client.post(url, json=payload, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    raw_content = data["choices"][0]["message"]["content"]
                    content = json.loads(raw_content)

                    category_str = str(content.get("category", "")).lower()
                    priority_str = str(content.get("priority", "")).lower()
                    try:
                        confidence = float(content.get("confidence", 0.85))
                    except (ValueError, TypeError):
                        confidence = 0.85

                    category = ComplaintCategoryEnum(category_str) if category_str in valid_categories else ComplaintCategoryEnum.OTHER
                    priority = ComplaintPriorityEnum(priority_str) if priority_str in valid_priorities else ComplaintPriorityEnum.MEDIUM

                    return {
                        "suggested_category": category,
                        "suggested_priority": priority,
                        "confidence": min(1.0, max(0.0, confidence))
                    }
                else:
                    logger.warning("OpenAI category API returned HTTP %s, falling back", response.status_code)
                    return self.fallback.suggest_category_and_priority(title, description)
        except (httpx.TimeoutException, httpx.RequestError, json.JSONDecodeError, KeyError, Exception) as e:
            logger.warning("OpenAI category API exception %s, falling back to mock provider", e)
            return self.fallback.suggest_category_and_priority(title, description)

    def generate_summary(self, title: str, description: str) -> str:
        """Generate concise summary via Chat Completions API with graceful fallback."""
        if not self.api_key or self.api_key == "change-this-ai-api-key":
            return self.fallback.generate_summary(title, description)

        try:
            url = "https://api.openai.com/v1/chat/completions"
            headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}

            system_prompt = "You are a civic issue analyzer. Generate a 1-2 sentence summary of the reported issue."
            user_prompt = f"Title: {title}\nDescription: {description}"

            payload = {
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": 0.3
            }

            with httpx.Client(timeout=5.0) as client:
                response = client.post(url, json=payload, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    summary_text = data["choices"][0]["message"]["content"].strip()
                    return summary_text if summary_text else self.fallback.generate_summary(title, description)
                else:
                    logger.warning("OpenAI summary API returned HTTP %s, falling back", response.status_code)
                    return self.fallback.generate_summary(title, description)
        except (httpx.TimeoutException, httpx.RequestError, KeyError, Exception) as e:
            logger.warning("OpenAI summary API exception %s, falling back to mock provider", e)
            return self.fallback.generate_summary(title, description)
