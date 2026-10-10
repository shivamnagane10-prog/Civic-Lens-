import math
from typing import List, Dict, Any
from app.models.crew import CrewModel

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    # Earth radius in kilometers
    r = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2.0) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(r * c, 2)

class CrewDispatchService:
    @staticmethod
    def rank_crews_for_issue(issue_lat: float, issue_lon: float, crews: List[CrewModel]) -> List[Dict[str, Any]]:
        suggestions = []
        for crew in crews:
            dist = haversine_distance_km(issue_lat, issue_lon, crew.latitude, crew.longitude)
            # Estimated speed 25 km/h in city + 5 min prep
            eta_minutes = int(max(5, round((dist / 25.0) * 60 + 5)))
            
            # Score: closer + available is higher
            status_multiplier = 1.0 if crew.status == "available" else 0.5
            dist_score = max(10.0, 100.0 - (dist * 10.0))
            recommended_score = round(dist_score * status_multiplier, 1)

            suggestions.append({
                "crew": crew,
                "distance_km": dist,
                "estimated_eta_minutes": eta_minutes,
                "recommended_score": recommended_score
            })

        suggestions.sort(key=lambda s: s["recommended_score"], reverse=True)
        return suggestions
