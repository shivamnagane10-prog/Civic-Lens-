from datetime import datetime, timezone

CATEGORY_WEIGHTS = {
    "water_leak": 40.0,    # Water safety & infrastructure hazard (Highest)
    "pothole": 35.0,       # Traffic safety hazard
    "road_damage": 30.0,   # Road mobility hazard
    "drainage": 25.0,      # Flooding & sanitary hazard
    "streetlight": 20.0,   # Public security hazard
    "garbage": 15.0,       # Quality of life / sanitation
    "other": 10.0
}

SEVERITY_WEIGHTS = {
    "critical": 35.0,
    "high": 25.0,
    "medium": 15.0,
    "low": 5.0
}

SOURCE_WEIGHTS = {
    "iot": 15.0,
    "cctv": 12.0,
    "satellite": 10.0,
    "citizen": 8.0
}

class PrioritizationService:
    @staticmethod
    def calculate_priority_score(
        category: str,
        severity: str,
        source: str = "citizen",
        created_at: datetime = None,
        ai_confidence: float = 0.9
    ) -> float:
        cat_score = CATEGORY_WEIGHTS.get(category.lower(), 10.0)
        sev_score = SEVERITY_WEIGHTS.get(severity.lower(), 15.0)
        src_score = SOURCE_WEIGHTS.get(source.lower(), 8.0)
        conf_boost = min(10.0, ai_confidence * 10.0)

        # Aging factor: issues pending for more than 12/24 hours get urgency increase
        age_boost = 0.0
        if created_at:
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
            hours_open = (datetime.now(timezone.utc) - created_at).total_seconds() / 3600.0
            age_boost = min(15.0, hours_open * 0.5)

        total = cat_score + sev_score + src_score + conf_boost + age_boost
        # Normalization between 10.0 and 100.0
        return round(min(100.0, max(10.0, total)), 1)
