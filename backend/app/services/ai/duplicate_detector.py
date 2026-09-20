"""Duplicate complaint detection engine using native pgvector operators, image embeddings, persistent clustering, and automatic priority escalation."""

import math
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text, func

from ...models.complaint import Complaint, ComplaintCategoryEnum, ComplaintPriorityEnum, ComplaintStatusEnum
from ...models.cluster import IssueCluster
# Imported lazily in find_duplicate_complaints to avoid heavy dependencies during pure unit tests


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


def cosine_similarity(vec1: Optional[List[float]], vec2: Optional[List[float]]) -> float:
    """Calculate cosine similarity between two vector embeddings."""
    if vec1 is None or vec2 is None or len(vec1) == 0 or len(vec2) == 0 or len(vec1) != len(vec2):
        return 0.0

    dot = sum(a * b for a, b in zip(vec1, vec2))
    norm_a = math.sqrt(sum(a * a for a in vec1))
    norm_b = math.sqrt(sum(b * b for b in vec2))

    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0

    return dot / (norm_a * norm_b)


def calculate_cluster_priority(
    base_priority: ComplaintPriorityEnum,
    report_count: int,
    density_count: int = 0,
    recent_count: int = 0
) -> ComplaintPriorityEnum:
    """
    Pure, deterministic cluster priority calculation.

    Args:
        base_priority: The highest individual complaint priority in the cluster.
        report_count: Total number of reports in the cluster.
        density_count: Number of reports within 200m of the centroid.
        recent_count: Number of reports created in the past 48 hours.

    Returns:
        Calculated ComplaintPriorityEnum.
    """
    priority_weights = {
        ComplaintPriorityEnum.LOW: 1,
        ComplaintPriorityEnum.MEDIUM: 2,
        ComplaintPriorityEnum.HIGH: 3,
        ComplaintPriorityEnum.CRITICAL: 4,
    }
    base_score = priority_weights.get(base_priority, 2)

    # CRITICAL base priority always floors to CRITICAL
    if base_priority == ComplaintPriorityEnum.CRITICAL:
        return ComplaintPriorityEnum.CRITICAL

    # Volume escalation bonus
    if report_count >= 10:
        volume_bonus = 3
    elif report_count >= 5:
        volume_bonus = 2
    elif report_count >= 3:
        volume_bonus = 1
    else:
        volume_bonus = 0

    # Proximity concentration bonus
    density_bonus = 1 if density_count >= 3 else 0

    # Recency bonus
    recency_bonus = 1 if recent_count >= 3 else 0

    total_score = base_score + volume_bonus + density_bonus + recency_bonus

    # Thresholds calibrated so that:
    #   LOW + 5 reports + density=5 → 1+2+1=4 → HIGH (≥4)
    #   MEDIUM + 10 reports + density=10 → 2+3+1=6 → CRITICAL (≥6)
    #   LOW + 3 reports + density=3 → 1+1+1=3 → MEDIUM (≥3)
    #   LOW + 1 report + density=1 → 1+0+0=1 → LOW
    if total_score >= 6:
        return ComplaintPriorityEnum.CRITICAL
    elif total_score >= 4:
        return ComplaintPriorityEnum.HIGH
    elif total_score >= 3:
        return ComplaintPriorityEnum.MEDIUM
    else:
        return ComplaintPriorityEnum.LOW


def _recalculate_cluster_priority_from_db(db: Session, cluster: IssueCluster) -> ComplaintPriorityEnum:
    """Fetch cluster complaints from DB and recalculate priority, persisting the result."""
    complaints = db.query(Complaint).filter(Complaint.cluster_id == cluster.id).all()
    if not complaints:
        return cluster.calculated_priority or ComplaintPriorityEnum.MEDIUM

    report_count = len(complaints)
    cluster.report_count = report_count

    # Base priority: highest priority across cluster complaints
    priority_weights = {
        ComplaintPriorityEnum.LOW: 1,
        ComplaintPriorityEnum.MEDIUM: 2,
        ComplaintPriorityEnum.HIGH: 3,
        ComplaintPriorityEnum.CRITICAL: 4,
    }
    base_priority = max(
        (c.priority for c in complaints),
        key=lambda p: priority_weights.get(p, 2)
    )

    # Proximity concentration: reports within 200m of centroid
    close_reports = sum(
        1 for c in complaints
        if calculate_haversine_distance_meters(
            cluster.centroid_latitude, cluster.centroid_longitude,
            c.latitude, c.longitude
        ) <= 200.0
    )

    # Recency: reports in past 48 hours
    now = datetime.now(timezone.utc)
    recent_cutoff = now - timedelta(hours=48)
    recent_reports = sum(
        1 for c in complaints
        if c.created_at and (
            c.created_at.replace(tzinfo=timezone.utc) if c.created_at.tzinfo is None else c.created_at
        ) >= recent_cutoff
    )

    calculated = calculate_cluster_priority(
        base_priority=base_priority,
        report_count=report_count,
        density_count=close_reports,
        recent_count=recent_reports
    )

    cluster.calculated_priority = calculated
    db.add(cluster)
    db.commit()
    db.refresh(cluster)
    return calculated


def assign_or_create_cluster(db: Session, complaint: Complaint) -> IssueCluster:
    """Attach complaint to an existing nearby IssueCluster or create a new IssueCluster."""
    if not IssueCluster:
        raise RuntimeError('IssueCluster model not available. Ensure database dependencies are installed.')
    if complaint.cluster_id:
        existing_cluster = db.query(IssueCluster).filter(IssueCluster.id == complaint.cluster_id).first()
        if existing_cluster:
            _recalculate_cluster_priority_from_db(db, existing_cluster)
            return existing_cluster

    # Search nearby clusters of same category
    max_distance_km = 1.0
    lat_deg_per_km = 1.0 / 111.0
    cos_lat = math.cos(math.radians(complaint.latitude))
    lon_deg_per_km = 1.0 / (111.0 * max(0.01, abs(cos_lat)))

    min_lat = complaint.latitude - (max_distance_km * lat_deg_per_km)
    max_lat = complaint.latitude + (max_distance_km * lat_deg_per_km)
    min_lon = complaint.longitude - (max_distance_km * lon_deg_per_km)
    max_lon = complaint.longitude + (max_distance_km * lon_deg_per_km)

    candidate_clusters = db.query(IssueCluster).filter(
        IssueCluster.category == complaint.category,
        IssueCluster.centroid_latitude.between(min_lat, max_lat),
        IssueCluster.centroid_longitude.between(min_lon, max_lon)
    ).all()

    best_cluster: Optional[IssueCluster] = None
    best_dist = 999999.0

    for candidate in candidate_clusters:
        dist_m = calculate_haversine_distance_meters(
            complaint.latitude, complaint.longitude,
            candidate.centroid_latitude, candidate.centroid_longitude
        )
        if dist_m <= 1000.0 and dist_m < best_dist:
            best_dist = dist_m
            best_cluster = candidate

    if best_cluster:
        complaint.cluster_id = best_cluster.id
        # Recalculate cluster centroid
        cluster_complaints = db.query(Complaint).filter(Complaint.cluster_id == best_cluster.id).all()
        all_complaints = cluster_complaints + [complaint]
        best_cluster.centroid_latitude = sum(c.latitude for c in all_complaints) / len(all_complaints)
        best_cluster.centroid_longitude = sum(c.longitude for c in all_complaints) / len(all_complaints)
        best_cluster.report_count = len(all_complaints)
        db.add(complaint)
        db.add(best_cluster)
        db.commit()
        db.refresh(best_cluster)
        _recalculate_cluster_priority_from_db(db, best_cluster)
        return best_cluster

    # Create new IssueCluster
    if not IssueCluster:
        raise RuntimeError('IssueCluster model not available. Cannot create new cluster.')
    new_cluster = IssueCluster(
        representative_complaint_id=complaint.id,
        category=complaint.category,
        status=complaint.status,
        calculated_priority=complaint.priority,
        centroid_latitude=complaint.latitude,
        centroid_longitude=complaint.longitude,
        report_count=1
    )
    db.add(new_cluster)
    db.commit()
    db.refresh(new_cluster)

    complaint.cluster_id = new_cluster.id
    db.add(complaint)
    db.commit()

    return new_cluster


def find_duplicate_complaints(
    db: Session,
    target_complaint: Complaint,
    similarity_threshold: float = 0.65,
    max_distance_km: float = 1.0,
    limit: int = 5
) -> Dict[str, Any]:
    """Identify potential duplicate complaints using multi-signal text/image pgvector embeddings, location, and category."""
    # Import here to avoid heavyweight imports when only pure logic is used
    from .factory import get_ai_service
    ai_service = get_ai_service()

    # Generate text embedding if missing
    if target_complaint.embedding is None:
        text_content = f"{target_complaint.title} {target_complaint.description}"
        target_complaint.embedding = ai_service.generate_embedding(text_content)
        db.add(target_complaint)
        db.commit()

    # Generate image embedding if evidence_url present and missing
    if target_complaint.evidence_url and target_complaint.image_embedding is None:
        target_complaint.image_embedding = ai_service.generate_image_embedding(target_complaint.evidence_url)
        db.add(target_complaint)
        db.commit()

    # Attach/Update IssueCluster
    cluster = assign_or_create_cluster(db, target_complaint)

    target_vec = target_complaint.embedding
    max_distance_m = max_distance_km * 1000.0

    # Bounding box calculation for database pre-filtering
    lat_deg_per_km = 1.0 / 111.0
    cos_lat = math.cos(math.radians(target_complaint.latitude))
    lon_deg_per_km = 1.0 / (111.0 * max(0.01, abs(cos_lat)))

    min_lat = target_complaint.latitude - (max_distance_km * lat_deg_per_km)
    max_lat = target_complaint.latitude + (max_distance_km * lat_deg_per_km)
    min_lon = target_complaint.longitude - (max_distance_km * lon_deg_per_km)
    max_lon = target_complaint.longitude + (max_distance_km * lon_deg_per_km)

    # Check candidates missing text embeddings
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
            if cand.evidence_url and cand.image_embedding is None:
                cand.image_embedding = ai_service.generate_image_embedding(cand.evidence_url)
            db.add(cand)
        db.commit()

    bind = db.get_bind()
    is_sqlite = bind and bind.dialect.name == "sqlite"

    if is_sqlite:
        import json
        candidates = db.query(Complaint).filter(
            Complaint.id != target_complaint.id,
            Complaint.embedding.isnot(None),
            Complaint.latitude.between(min_lat, max_lat),
            Complaint.longitude.between(min_lon, max_lon)
        ).all()
        results = []
        for cand in candidates:
            emb = cand.embedding
            if isinstance(emb, str):
                try:
                    emb = json.loads(emb)
                except Exception:
                    emb = None
            if emb is not None and len(emb) > 0:
                sim = cosine_similarity(target_vec, emb)
                dist = 1.0 - sim
            else:
                dist = 1.0
            results.append((cand, dist))
    else:
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
        dist_m = calculate_haversine_distance_meters(
            target_complaint.latitude, target_complaint.longitude,
            candidate.latitude, candidate.longitude
        )

        if dist_m > max_distance_m:
            continue

        text_sim = max(0.0, 1.0 - float(cos_dist))
        geo_sim = max(0.0, 1.0 - (dist_m / max_distance_m))
        cat_match = 1.0 if candidate.category == target_complaint.category else 0.0

        image_sim: Optional[float] = None
        if target_complaint.image_embedding and candidate.image_embedding:
            image_sim = cosine_similarity(target_complaint.image_embedding, candidate.image_embedding)

        # Multi-signal weighted similarity score
        if image_sim is not None:
            combined_score = 0.40 * text_sim + 0.30 * image_sim + 0.20 * geo_sim + 0.10 * cat_match
        else:
            combined_score = 0.55 * text_sim + 0.35 * geo_sim + 0.10 * cat_match

        if combined_score >= similarity_threshold:
          signals = [f"Geographic proximity within {dist_m:.0f}m"]
          if text_sim >= 0.6:
              signals.append(f"{text_sim * 100:.0f}% text description match")
          if image_sim is not None:
              signals.append(f"{image_sim * 100:.0f}% photo visual similarity match")
          if cat_match:
              signals.append("Identical service category")

          duplicate_candidates.append({
              "complaint_id": str(candidate.id),
              "title": candidate.title,
              "status": candidate.status.value if hasattr(candidate.status, "value") else str(candidate.status),
              "category": candidate.category.value if hasattr(candidate.category, "value") else str(candidate.category),
              "similarity_score": round(combined_score, 3),
              "text_similarity": round(text_sim, 3),
              "image_similarity": round(image_sim, 3) if image_sim is not None else None,
              "distance_meters": round(dist_m, 1),
              "reasoning_signals": signals
          })

    duplicate_candidates.sort(key=lambda x: x["similarity_score"], reverse=True)
    duplicate_candidates = duplicate_candidates[:limit]

    return {
        "cluster_id": str(cluster.id),
        "cluster_report_count": cluster.report_count,
        "cluster_priority": cluster.calculated_priority.value if hasattr(cluster.calculated_priority, "value") else str(cluster.calculated_priority),
        "is_duplicate_likely": len(duplicate_candidates) > 0,
        "potential_duplicates": duplicate_candidates,
        "threshold_used": similarity_threshold,
        "max_distance_km": max_distance_km
    }
