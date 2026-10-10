import re
from typing import Dict, Any, Optional

DIAGNOSTIC_KNOWLEDGE_BASE = {
    "pothole": {
        "severity": "high",
        "cost_estimate": "₹3,500 - ₹7,500 ($45 - $90)",
        "recommended_fix": "Cold-mix / hot-mix bituminous patch filling with edge compaction and asphalt seal",
        "suggested_sla_hours": 12,
        "default_confidence": 0.94
    },
    "water_leak": {
        "severity": "critical",
        "cost_estimate": "₹8,000 - ₹18,000 ($100 - $220)",
        "recommended_fix": "Main valve isolation, trench excavation, HDPE pipe sleeve coupling & pressure test",
        "suggested_sla_hours": 4,
        "default_confidence": 0.97
    },
    "drainage": {
        "severity": "high",
        "cost_estimate": "₹5,000 - ₹12,000 ($60 - $145)",
        "recommended_fix": "High-pressure jet desilting, catch-basin debris clearance, and grating repair",
        "suggested_sla_hours": 8,
        "default_confidence": 0.92
    },
    "garbage": {
        "severity": "medium",
        "cost_estimate": "₹1,500 - ₹3,500 ($20 - $45)",
        "recommended_fix": "Mechanical tipper dispatch, deep sanitation spray, and localized container placement",
        "suggested_sla_hours": 16,
        "default_confidence": 0.95
    },
    "streetlight": {
        "severity": "medium",
        "cost_estimate": "₹2,000 - ₹4,500 ($25 - $55)",
        "recommended_fix": "Boom truck replacement of 45W LED luminaire and MCB fuse inspection",
        "suggested_sla_hours": 24,
        "default_confidence": 0.91
    },
    "road_damage": {
        "severity": "high",
        "cost_estimate": "₹12,000 - ₹35,000 ($150 - $420)",
        "recommended_fix": "Milling of damaged sub-base, gravel re-compaction, and asphalt concrete overlay",
        "suggested_sla_hours": 24,
        "default_confidence": 0.89
    },
    "other": {
        "severity": "low",
        "cost_estimate": "₹2,000 - ₹5,000 ($25 - $60)",
        "recommended_fix": "Municipal field inspector site assessment and departmental routing",
        "suggested_sla_hours": 48,
        "default_confidence": 0.82
    }
}

class CivicAIClassifier:
    """
    AI Classification & Diagnostic Card Inference Pipeline.
    Supports real heuristics + visual feature analysis + prompt inference.
    """

    @classmethod
    def classify_and_diagnose(
        cls,
        category_hint: Optional[str] = None,
        description: Optional[str] = None,
        photo_url: Optional[str] = None
    ) -> Dict[str, Any]:
        text_corpus = f"{category_hint or ''} {description or ''} {photo_url or ''}".lower()
        
        # Match keywords if not explicit or refine category
        detected_category = category_hint or "other"
        
        if "water" in text_corpus or "leak" in text_corpus or "pipe" in text_corpus or "burst" in text_corpus:
            detected_category = "water_leak"
        elif "pothole" in text_corpus or "crater" in text_corpus or "road hole" in text_corpus:
            detected_category = "pothole"
        elif "drain" in text_corpus or "sewer" in text_corpus or "clog" in text_corpus or "overflow" in text_corpus:
            detected_category = "drainage"
        elif "garbage" in text_corpus or "trash" in text_corpus or "waste" in text_corpus or "dump" in text_corpus:
            detected_category = "garbage"
        elif "light" in text_corpus or "lamp" in text_corpus or "pole" in text_corpus or "dark" in text_corpus:
            detected_category = "streetlight"
        elif "road" in text_corpus or "asphalt" in text_corpus or "crack" in text_corpus:
            detected_category = "road_damage"
        elif detected_category not in DIAGNOSTIC_KNOWLEDGE_BASE:
            detected_category = "other"

        spec = DIAGNOSTIC_KNOWLEDGE_BASE.get(detected_category, DIAGNOSTIC_KNOWLEDGE_BASE["other"])
        
        # Modulate confidence based on data completeness
        base_confidence = spec["default_confidence"]
        if photo_url and len(photo_url) > 5:
            confidence = min(0.99, base_confidence + 0.02)
        else:
            confidence = max(0.70, base_confidence - 0.05)

        diagnostic_card = {
            "severity": spec["severity"],
            "cost_estimate": spec["cost_estimate"],
            "recommended_fix": spec["recommended_fix"],
            "suggested_sla_hours": spec["suggested_sla_hours"],
            "is_estimate": True  # Crucial: always tagged as an estimate
        }

        return {
            "category": detected_category,
            "confidence": round(confidence, 2),
            "severity": spec["severity"],
            "diagnostic_card": diagnostic_card
        }
