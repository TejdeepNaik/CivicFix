"""Configurable external AI service provider with graceful fallback handling."""

import os
import base64
import json
import logging
from typing import Dict, Any, List, Optional
import httpx

from .base import BaseAIService
from .mock import MockAIService
from ...models.complaint import ComplaintCategoryEnum, ComplaintPriorityEnum
from ...core.config import settings

logger = logging.getLogger(__name__)

# Valid category values for prompt constraint
_VALID_CATEGORIES = [c.value for c in ComplaintCategoryEnum]
_VALID_PRIORITIES = [p.value for p in ComplaintPriorityEnum]
_VALID_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

# Department mapping used in the vision prompt so the model picks from real options
_DEPARTMENT_OPTIONS = [
    "Roads & Infrastructure Department",
    "Water & Sewerage Department",
    "Sanitation & Solid Waste Department",
    "Street Lighting Department",
    "Traffic Engineering Department",
    "Drainage & Stormwater Department",
    "Parks & Public Spaces Department",
    "Building & Construction Inspection",
    "Environmental Services Department",
    "General Municipal Services",
]

# Vision analysis system prompt — instructs the model to analyse civic defects only
_VISION_SYSTEM_PROMPT = """You are CivicFix's municipal infrastructure inspection AI.

Your task is to examine a photograph submitted by a citizen and determine whether it shows a civic infrastructure problem.

SEVERITY DETERMINATION RULES (independent of confidence):
- LOW: Minor cosmetic damage, no immediate safety risk, can wait weeks.
- MEDIUM: Moderate damage, inconvenient, should be fixed within days.
- HIGH: Significant damage posing risk to vehicles/pedestrians, fix within 24 hours.
- CRITICAL: Immediate safety hazard, risk to life or property, requires emergency response.

CONFIDENCE rules:
- confidence = your certainty that what you see matches your primary_issue label (0.0–1.0)
- A clearly-visible minor pothole: high confidence, LOW severity
- A blurry but likely burst water main: lower confidence, CRITICAL severity

You must return ONLY a valid JSON object with this exact structure:
{
  "is_civic_issue": true/false,
  "primary_issue": "concise label e.g. 'Large pothole' or null if none",
  "confidence": 0.0-1.0,
  "severity": "LOW|MEDIUM|HIGH|CRITICAL",
  "suggested_category": "one of: """ + ", ".join(_VALID_CATEGORIES) + """ or null",
  "suggested_department": "one of the listed departments or null",
  "detections": [
    {
      "label": "defect description",
      "confidence": 0.0-1.0,
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "bounding_box": {"x": 0.0, "y": 0.0, "width": 1.0, "height": 1.0} or null
    }
  ],
  "reasoning": "1-3 sentence explanation of what you observed and why"
}

IMPORTANT RULES:
- If the image does NOT show a civic infrastructure problem, set is_civic_issue=false, primary_issue=null, confidence to your certainty it is NOT a civic issue.
- Never invent defects not visible in the image.
- Bounding boxes must be normalized 0.0–1.0 (x, y = top-left corner, width, height). Only include if you can genuinely estimate location.
- suggested_department must be one of: """ + ", ".join(_DEPARTMENT_OPTIONS) + """
- If uncertain about department, use "General Municipal Services".
- Output ONLY the JSON object — no markdown, no preamble, no explanation outside the JSON.
"""


class OpenAIAIService(BaseAIService):
    """External AI Provider with fallback to MockAIService on network/credential failures."""

    def __init__(self, api_key: str = None):
        self.api_key = api_key or getattr(settings, "AI_API_KEY", None) or os.getenv("OPENAI_API_KEY")
        self.fallback = MockAIService()
        # Model names — configurable via settings, with sensible defaults
        self.embedding_model: str = getattr(settings, "AI_EMBEDDING_MODEL", "text-embedding-3-small")
        self.chat_model: str = getattr(settings, "AI_CHAT_MODEL", "gpt-4o-mini")
        self.vision_model: str = getattr(settings, "AI_VISION_MODEL", "gpt-4o-mini")

    # ─── Text Embedding ────────────────────────────────────────────────────────

    def generate_embedding(self, text: str) -> List[float]:
        """Generate vector embedding, falling back to mock provider if API key missing or request fails."""
        if not self.api_key or self.api_key == "change-this-ai-api-key":
            return self.fallback.generate_embedding(text)

        try:
            url = "https://api.openai.com/v1/embeddings"
            headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
            payload = {
                "input": text,
                "model": self.embedding_model,
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

    # ─── Image Embedding (for duplicate detection) ─────────────────────────────



    # ─── Category / Priority Suggestion ───────────────────────────────────────

    def suggest_category_and_priority(self, title: str, description: str) -> Dict[str, Any]:
        """Suggest category and priority via Chat Completions API with structured validation and graceful fallback."""
        if not self.api_key or self.api_key == "change-this-ai-api-key":
            return self.fallback.suggest_category_and_priority(title, description)

        try:
            url = "https://api.openai.com/v1/chat/completions"
            headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}

            system_prompt = (
                "You are an AI assistant for a civic issue reporting platform. "
                "Analyze the issue title and description and output a valid JSON object with fields:\n"
                f"- category: one of {_VALID_CATEGORIES}\n"
                f"- priority: one of {_VALID_PRIORITIES}\n"
                "- confidence: float between 0.0 and 1.0"
            )

            user_prompt = f"Title: {title}\nDescription: {description}"

            payload = {
                "model": self.chat_model,
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

                    category = ComplaintCategoryEnum(category_str) if category_str in _VALID_CATEGORIES else ComplaintCategoryEnum.OTHER
                    priority = ComplaintPriorityEnum(priority_str) if priority_str in _VALID_PRIORITIES else ComplaintPriorityEnum.MEDIUM

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

    # ─── Summary Generation ────────────────────────────────────────────────────

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
                "model": self.chat_model,
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

    # ─── Vision Analysis (NEW) ─────────────────────────────────────────────────

    def analyze_image_for_civic_issue(
        self,
        image_bytes: bytes,
        content_type: str,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        user_context: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Analyze a photograph for civic infrastructure defects using GPT-4o vision.

        Sends the image as a base64-encoded data URL to the OpenAI Chat Completions
        Vision API. The model is prompted with the structured JSON schema and civic
        domain rules defined in _VISION_SYSTEM_PROMPT.

        Location (latitude/longitude) is NEVER generated by the AI — it is passed
        through from the caller (device geolocation, map pin, or EXIF). If no
        location is provided, the fields remain None.

        Falls back to mock (analysis_available=False) on any failure.
        """
        if not self.api_key or self.api_key == "change-this-ai-api-key":
            logger.info("No OpenAI API key configured — vision analysis not available.")
            result = self.fallback.analyze_image_for_civic_issue(
                image_bytes, content_type, latitude, longitude, user_context
            )
            return result

        # Encode the image as base64 data URL
        b64_image = base64.b64encode(image_bytes).decode("utf-8")
        image_data_url = f"data:{content_type};base64,{b64_image}"

        user_prompt = "Please analyze this photograph for civic infrastructure problems."
        if user_context and user_context.strip():
            user_prompt += f" Citizen context/note: {user_context.strip()}"

        try:
            url = "https://api.openai.com/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }

            payload = {
                "model": self.vision_model,
                "messages": [
                    {
                        "role": "system",
                        "content": _VISION_SYSTEM_PROMPT,
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": user_prompt,
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": image_data_url,
                                    "detail": "high",  # Request high-detail analysis
                                },
                            },
                        ],
                    },
                ],
                "response_format": {"type": "json_object"},
                "max_tokens": 1024,
                "temperature": 0.1,  # Low temperature for consistent structured output
            }

            with httpx.Client(timeout=30.0) as client:  # Longer timeout for vision
                response = client.post(url, json=payload, headers=headers)

            if response.status_code != 200:
                logger.warning(
                    "OpenAI Vision API returned HTTP %s: %s",
                    response.status_code,
                    response.text[:200],
                )
                return self._vision_fallback(latitude, longitude, f"Vision API HTTP {response.status_code}")

            raw_content = response.json()["choices"][0]["message"]["content"]
            model_used = response.json().get("model", self.vision_model)

            try:
                parsed = json.loads(raw_content)
            except json.JSONDecodeError as e:
                logger.warning("Vision API response was not valid JSON: %s | raw: %s", e, raw_content[:300])
                return self._vision_fallback(latitude, longitude, "Model returned non-JSON response")

            # ── Extract and validate each field from model output ──────────────

            is_civic_issue = bool(parsed.get("is_civic_issue", False))
            primary_issue = parsed.get("primary_issue") or None
            if primary_issue is not None:
                primary_issue = str(primary_issue).strip() or None

            # Confidence: clamp to [0, 1]
            try:
                confidence = float(parsed.get("confidence", 0.0))
                confidence = max(0.0, min(1.0, confidence))
            except (ValueError, TypeError):
                confidence = 0.0

            # Severity: must be one of the valid values
            severity_raw = str(parsed.get("severity", "LOW")).upper()
            severity = severity_raw if severity_raw in _VALID_SEVERITIES else "LOW"

            # Suggested category: must match enum
            cat_raw = str(parsed.get("suggested_category", "")).lower().strip()
            suggested_category: Optional[str] = cat_raw if cat_raw in _VALID_CATEGORIES else None

            # Suggested department: free string from restricted list
            dept_raw = str(parsed.get("suggested_department", "")).strip()
            suggested_department: Optional[str] = dept_raw if dept_raw else None

            # Reasoning
            reasoning = str(parsed.get("reasoning", "No reasoning provided.")).strip()

            # Detections list — validate each entry
            raw_detections = parsed.get("detections", [])
            detections = []
            if isinstance(raw_detections, list):
                for det in raw_detections:
                    if not isinstance(det, dict):
                        continue
                    det_label = str(det.get("label", "")).strip()
                    if not det_label:
                        continue
                    try:
                        det_conf = float(det.get("confidence", 0.0))
                        det_conf = max(0.0, min(1.0, det_conf))
                    except (ValueError, TypeError):
                        det_conf = 0.0
                    det_sev_raw = str(det.get("severity", "LOW")).upper()
                    det_sev = det_sev_raw if det_sev_raw in _VALID_SEVERITIES else "LOW"

                    # Bounding box — validate all four fields exist and are in [0,1]
                    bb_raw = det.get("bounding_box")
                    bounding_box = None
                    if isinstance(bb_raw, dict):
                        try:
                            bx = float(bb_raw["x"])
                            by = float(bb_raw["y"])
                            bw = float(bb_raw["width"])
                            bh = float(bb_raw["height"])
                            if all(0.0 <= v <= 1.0 for v in (bx, by, bw, bh)):
                                bounding_box = {"x": bx, "y": by, "width": bw, "height": bh}
                        except (KeyError, ValueError, TypeError):
                            bounding_box = None

                    detections.append({
                        "label": det_label,
                        "confidence": det_conf,
                        "severity": det_sev,
                        "bounding_box": bounding_box,
                    })

            # Sort detections by confidence descending
            detections.sort(key=lambda d: d["confidence"], reverse=True)

            return {
                "primary_issue": primary_issue,
                "is_civic_issue": is_civic_issue,
                "confidence": confidence,
                "severity": severity,
                "suggested_category": suggested_category,
                "suggested_department": suggested_department,
                "detections": detections,
                "reasoning": reasoning,
                "latitude": latitude,
                "longitude": longitude,
                "vision_model": model_used,
                "vision_provider": "openai",
                "analysis_available": True,
            }

        except (httpx.TimeoutException, httpx.RequestError) as e:
            logger.warning("OpenAI Vision API network error: %s", e)
            return self._vision_fallback(latitude, longitude, f"Network error: {type(e).__name__}")
        except (KeyError, IndexError) as e:
            logger.warning("Unexpected OpenAI Vision API response structure: %s", e)
            return self._vision_fallback(latitude, longitude, f"Unexpected API response: {e}")
        except Exception as e:
            logger.warning("OpenAI Vision API unexpected exception: %s", e)
            return self._vision_fallback(latitude, longitude, f"Unexpected error: {type(e).__name__}")

    def _vision_fallback(
        self,
        latitude: Optional[float],
        longitude: Optional[float],
        reason: str,
    ) -> Dict[str, Any]:
        """Return a safe no-analysis response when vision fails. Never fabricates detections."""
        return {
            "primary_issue": None,
            "is_civic_issue": False,
            "confidence": 0.0,
            "severity": None,
            "suggested_category": None,
            "suggested_department": None,
            "detections": [],
            "reasoning": f"Vision analysis unavailable: {reason}. No civic issue determination was made.",
            "latitude": latitude,
            "longitude": longitude,
            "vision_model": self.vision_model,
            "vision_provider": "openai",
            "analysis_available": False,
        }





    def generate_image_embedding(self, image_input: str) -> Optional[List[float]]:
        """Generate 384-dimensional vector embedding for image input, with provider fallback."""
        if not image_input or not isinstance(image_input, str):
            return None
        return self.fallback.generate_image_embedding(image_input)

