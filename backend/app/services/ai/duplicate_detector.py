"""Duplicate complaint detection engine using native pgvector operators and geographic proximity."""

import math
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text, func

from ...models.complaint import Complaint, ComplaintCategoryEnum
from .factory import get_ai_service


def calculate_haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in meters between two lat/lon coordinates using the Haversine formula."""
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """Calculate cosine similarity between two vector embeddings."""
    if not vec1 or not vec2 or len(vec1) != len(vec2):
        return 0.0

    dot = sum(a * b for a, b in zip(vec1, vec2))
    norm_a = math.sqrt(sum(a * a for a in vec1))
    norm_b = math.sqrt(sum(b * b for b in vec2))

    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0

    return dot / (norm_a * norm_b)


def find_duplicate_complaints(
    db: Session,
    target_complaint: Complaint,
    similarity_threshold: float = 0.70,
    max_distance_km: float = 1.0,
    limit: int = 5
) -> Dict[str, Any]:
    """Identify potential duplicate complaints using native pgvector similarity and geographic proximity."""
    ai_service = get_ai_service()

    # Generate embedding for target complaint if missing
    if target_complaint.embedding is None:
        text_content = f"{target_complaint.title} {target_complaint.description}"
        target_complaint.embedding = ai_service.generate_embedding(text_content)
        db.add(target_complaint)
        db.commit()

    target_vec = target_complaint.embedding
    max_distance_m = max_distance_km * 1000.0

    # 1. Bounding box calculation for database pre-filtering
    lat_deg_per_km = 1.0 / 111.0
    cos_lat = math.cos(math.radians(target_complaint.latitude))
    lon_deg_per_km = 1.0 / (111.0 * max(0.01, abs(cos_lat)))

    min_lat = target_complaint.latitude - (max_distance_km * lat_deg_per_km)
    max_lat = target_complaint.latitude + (max_distance_km * lat_deg_per_km)
    min_lon = target_complaint.longitude - (max_distance_km * lon_deg_per_km)
    max_lon = target_complaint.longitude + (max_distance_km * lon_deg_per_km)

    # 2. Check candidates in geographic bounding box missing embeddings and compute them
    unembedded_candidates = db.query(Complaint).filter(
        Complaint.id != target_complaint.id,
        Complaint.embedding.is_(None),
        Complaint.latitude.between(min_lat, max_lat),
        Complaint.longitude.between(min_lon, max_lon)
    ).all()

    if unembedded_candidates:
        for cand in unembedded_candidates:
            cand_text = f"{cand.title} {cand.description}"
            cand.embedding = ai_service.generate_embedding(cand_text)
            db.add(cand)
        db.commit()

    # 3. Query native pgvector cosine distance (<=>) with SQL bounding box pre-filtering
    # cosine_distance is in [0.0, 2.0], cosine_similarity = 1.0 - cosine_distance
    distance_expr = Complaint.embedding.cosine_distance(target_vec).label("cos_dist")

    results = db.query(Complaint, distance_expr).filter(
        Complaint.id != target_complaint.id,
        Complaint.embedding.isnot(None),
        Complaint.latitude.between(min_lat, max_lat),
        Complaint.longitude.between(min_lon, max_lon)
    ).order_by(
        distance_expr.asc()
    ).limit(max(20, limit * 4)).all()

    duplicate_candidates = []

    for candidate, cos_dist in results:
        # Calculate precise Haversine distance
        dist_m = calculate_haversine_distance_meters(
            target_complaint.latitude,
            target_complaint.longitude,
            candidate.latitude,
            candidate.longitude
        )

        if dist_m > max_distance_m:
            continue

        sim_score = max(0.0, 1.0 - float(cos_dist))

        # Apply category matching boost
        if candidate.category == target_complaint.category:
            sim_score = min(1.0, sim_score + 0.05)

        if sim_score >= similarity_threshold:
            duplicate_candidates.append({
                "complaint_id": str(candidate.id),
                "title": candidate.title,
                "status": candidate.status.value if hasattr(candidate.status, "value") else str(candidate.status),
                "category": candidate.category.value if hasattr(candidate.category, "value") else str(candidate.category),
                "similarity_score": round(sim_score, 3),
                "distance_meters": round(dist_m, 1)
            })

    # Sort by similarity score descending
    duplicate_candidates.sort(key=lambda x: x["similarity_score"], reverse=True)
    duplicate_candidates = duplicate_candidates[:limit]

    return {
        "is_duplicate_likely": len(duplicate_candidates) > 0,
        "potential_duplicates": duplicate_candidates,
        "threshold_used": similarity_threshold,
        "max_distance_km": max_distance_km
    }
