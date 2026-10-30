import json
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone

WORKFLOW_DEFINITIONS: Dict[str, Dict[str, Any]] = {
    "road_damage": {
        "category": "road_damage",
        "name": "Damaged Roads and Potholes",
        "workflow_type": "road_maintenance",
        "department": "Road Infrastructure & Pavement Maintenance Division",
        "assigned_team": "Road Maintenance Crew",
        "review_queue": "road_maintenance",
        "allowed_statuses": [
            "submitted",
            "pending_review",
            "corporator_queue",
            "assigned",
            "in_progress",
            "awaiting_inspection",
            "rework_required",
            "resolved",
            "rejected"
        ],
        "terminal_status": "resolved",
        "terminal_label": "Resolved — Engineer Verified",
        "evidence_required": [
            "before_photo",
            "after_photo",
            "crew_work_notes",
            "engineer_inspection_checklist"
        ],
        "model_name": "CivicLens-RoadInspect-v2.2",
        "model_version": "2.2.0",
        "sla_hours": 48,
        "is_restricted": False,
        "requires_police": False,
        "permitted_roles": ["admin", "engineer", "corporator", "crew"],
        "notification_template": "Road defect on {location} assigned to Road Maintenance Crew. Certified by Chief Engineer."
    },
    "pothole": {
        "category": "pothole",
        "name": "Damaged Roads and Potholes",
        "workflow_type": "road_maintenance",
        "department": "Road Infrastructure & Pavement Maintenance Division",
        "assigned_team": "Road Maintenance Crew",
        "review_queue": "road_maintenance",
        "allowed_statuses": [
            "submitted",
            "pending_review",
            "corporator_queue",
            "assigned",
            "in_progress",
            "awaiting_inspection",
            "rework_required",
            "resolved",
            "rejected"
        ],
        "terminal_status": "resolved",
        "terminal_label": "Resolved — Engineer Verified",
        "evidence_required": [
            "before_photo",
            "after_photo",
            "crew_work_notes",
            "engineer_inspection_checklist"
        ],
        "model_name": "CivicLens-RoadInspect-v2.2",
        "model_version": "2.2.0",
        "sla_hours": 48,
        "is_restricted": False,
        "requires_police": False,
        "permitted_roles": ["admin", "engineer", "corporator", "crew"],
        "notification_template": "Pothole on {location} repaired and certified."
    },
    "garbage_waste": {
        "category": "garbage_waste",
        "name": "Garbage and Waste Management",
        "workflow_type": "waste_management",
        "department": "Municipal Solid Waste & Sanitation Division",
        "assigned_team": "Sanitation & Waste Collection Team",
        "review_queue": "waste_management",
        "allowed_statuses": [
            "submitted",
            "pending_review",
            "corporator_queue",
            "assigned",
            "in_progress",
            "awaiting_inspection",
            "rework_required",
            "resolved",
            "rejected"
        ],
        "terminal_status": "resolved",
        "terminal_label": "Resolved — Sanitation Verified",
        "evidence_required": [
            "before_photo",
            "after_photo",
            "waste_clearance_receipt"
        ],
        "model_name": "CivicLens-WasteNet-v2.2",
        "model_version": "2.2.0",
        "sla_hours": 24,
        "is_restricted": False,
        "requires_police": False,
        "permitted_roles": ["admin", "engineer", "corporator", "crew"],
        "notification_template": "Waste pile cleared at {location} by Sanitation Crew."
    },
    "garbage": {
        "category": "garbage",
        "name": "Garbage and Waste Management",
        "workflow_type": "waste_management",
        "department": "Municipal Solid Waste & Sanitation Division",
        "assigned_team": "Sanitation & Waste Collection Team",
        "review_queue": "waste_management",
        "allowed_statuses": [
            "submitted",
            "pending_review",
            "corporator_queue",
            "assigned",
            "in_progress",
            "awaiting_inspection",
            "rework_required",
            "resolved",
            "rejected"
        ],
        "terminal_status": "resolved",
        "terminal_label": "Resolved — Sanitation Verified",
        "evidence_required": [
            "before_photo",
            "after_photo",
            "waste_clearance_receipt"
        ],
        "model_name": "CivicLens-WasteNet-v2.2",
        "model_version": "2.2.0",
        "sla_hours": 24,
        "is_restricted": False,
        "requires_police": False,
        "permitted_roles": ["admin", "engineer", "corporator", "crew"],
        "notification_template": "Waste cleared at {location}."
    },
    "streetlight": {
        "category": "streetlight",
        "name": "Broken Streetlights & Electrical Hazards",
        "workflow_type": "electrical_maintenance",
        "department": "Municipal Electrical & Street Lighting Department",
        "assigned_team": "Streetlight & Electrical Repair Crew",
        "review_queue": "electrical_maintenance",
        "allowed_statuses": [
            "submitted",
            "needs_field_verification",
            "corporator_queue",
            "assigned",
            "in_progress",
            "awaiting_inspection",
            "rework_required",
            "resolved"
        ],
        "terminal_status": "resolved",
        "terminal_label": "Resolved — Electrical Compliance Certified",
        "evidence_required": [
            "field_lux_verification",
            "after_photo",
            "electrical_continuity_test"
        ],
        "model_name": "CivicLens-LumenNet-v2.2",
        "model_version": "2.2.0",
        "sla_hours": 36,
        "is_restricted": False,
        "requires_police": False,
        "permitted_roles": ["admin", "engineer", "corporator", "crew"],
        "notification_template": "Streetlight luminaire and circuit restored on {location}."
    },
    "waterlogging_flood": {
        "category": "waterlogging_flood",
        "name": "Waterlogging, Flooding and Drainage",
        "workflow_type": "drainage_management",
        "department": "Stormwater Drainage & Flood Control Authority",
        "assigned_team": "Drainage & Stormwater Crew",
        "review_queue": "drainage_management",
        "allowed_statuses": [
            "submitted",
            "pending_review",
            "corporator_queue",
            "emergency_dispatch",
            "assigned",
            "in_progress",
            "awaiting_inspection",
            "resolved"
        ],
        "terminal_status": "resolved",
        "terminal_label": "Resolved — Drainage Restored",
        "evidence_required": [
            "water_level_reading",
            "after_clearance_photo",
            "pump_log"
        ],
        "model_name": "CivicLens-HydroNet-v2.2",
        "model_version": "2.2.0",
        "sla_hours": 12,
        "is_restricted": False,
        "requires_police": False,
        "permitted_roles": ["admin", "engineer", "corporator", "crew"],
        "notification_template": "Stormwater runoff cleared and catch-basins desilted at {location}."
    },
    "waterlogging": {
        "category": "waterlogging",
        "name": "Waterlogging, Flooding and Drainage",
        "workflow_type": "drainage_management",
        "department": "Stormwater Drainage & Flood Control Authority",
        "assigned_team": "Drainage & Stormwater Crew",
        "review_queue": "drainage_management",
        "allowed_statuses": [
            "submitted",
            "pending_review",
            "corporator_queue",
            "emergency_dispatch",
            "assigned",
            "in_progress",
            "awaiting_inspection",
            "resolved"
        ],
        "terminal_status": "resolved",
        "terminal_label": "Resolved — Drainage Restored",
        "evidence_required": [
            "water_level_reading",
            "after_clearance_photo"
        ],
        "model_name": "CivicLens-HydroNet-v2.2",
        "model_version": "2.2.0",
        "sla_hours": 12,
        "is_restricted": False,
        "requires_police": False,
        "permitted_roles": ["admin", "engineer", "corporator", "crew"],
        "notification_template": "Waterlogging resolved at {location}."
    },
    "drainage": {
        "category": "drainage",
        "name": "Waterlogging, Flooding and Drainage",
        "workflow_type": "drainage_management",
        "department": "Stormwater Drainage & Flood Control Authority",
        "assigned_team": "Drainage & Stormwater Crew",
        "review_queue": "drainage_management",
        "allowed_statuses": [
            "submitted",
            "pending_review",
            "corporator_queue",
            "emergency_dispatch",
            "assigned",
            "in_progress",
            "awaiting_inspection",
            "resolved"
        ],
        "terminal_status": "resolved",
        "terminal_label": "Resolved — Drainage Restored",
        "evidence_required": [
            "after_clearance_photo"
        ],
        "model_name": "CivicLens-HydroNet-v2.2",
        "model_version": "2.2.0",
        "sla_hours": 12,
        "is_restricted": False,
        "requires_police": False,
        "permitted_roles": ["admin", "engineer", "corporator", "crew"],
        "notification_template": "Drain blockage removed at {location}."
    },
    "traffic_safety": {
        "category": "traffic_safety",
        "name": "Traffic Congestion and Road Accidents",
        "workflow_type": "traffic_operations",
        "department": "Traffic Police & Intelligent Transit Operations Center",
        "assigned_team": "Traffic Management Quick Response Patrol",
        "review_queue": "traffic_management",
        "allowed_statuses": [
            "detected",
            "monitoring_queue",
            "traffic_review",
            "patrol_dispatched",
            "accident_emergency_escalated",
            "congestion_cleared",
            "closed"
        ],
        "terminal_status": "congestion_cleared",
        "terminal_label": "Traffic Normalized — Transit Flow Restored",
        "evidence_required": [
            "traffic_density_metrics",
            "incident_timestamp_clip"
        ],
        "model_name": "CivicLens-TrafficNet-v2.2",
        "model_version": "2.2.0",
        "sla_hours": 2,
        "is_restricted": False,
        "requires_police": True,
        "permitted_roles": ["admin", "engineer", "police"],
        "notification_template": "Traffic intervention deployed for {location} by Traffic Management."
    },
    "assault_violence": {
        "category": "assault_violence",
        "name": "Potential Assault & Physical Violence",
        "workflow_type": "public_safety_restricted",
        "department": "Cyber Crime & Video Surveillance Division",
        "assigned_team": "Police Control Room (PCR 112) / Territorial Police Station",
        "review_queue": "public_safety_review",
        "allowed_statuses": [
            "candidate_flagged",
            "restricted_safety_review",
            "inconclusive",
            "false_positive",
            "escalation_approved",
            "evidence_sealed",
            "submitted_to_police",
            "acknowledged",
            "under_investigation",
            "closed"
        ],
        "terminal_status": "closed",
        "terminal_label": "Case Closed — Police Disposition Recorded",
        "evidence_required": [
            "video_clip_sha256",
            "snapshot_sha256",
            "chain_of_custody_log"
        ],
        "model_name": "CivicLens-ActionSafety-v2.2",
        "model_version": "2.2.0",
        "sla_hours": 1,
        "is_restricted": True,
        "requires_police": True,
        "permitted_roles": ["admin", "engineer", "police"],
        "notification_template": "Restricted Incident Dossier transferred under FIR to Cyber Police."
    },
    "sexual_violence_sensitive": {
        "category": "sexual_violence_sensitive",
        "name": "Potential Sexual Violence (Restricted Safeguarding)",
        "workflow_type": "sensitive_safeguarding",
        "department": "Special Police Unit for Women & Children (SPUWAC / 1091)",
        "assigned_team": "Authorized Safeguarding Officer & Women Safety Cell",
        "review_queue": "sensitive_safeguarding",
        "allowed_statuses": [
            "candidate_flagged",
            "restricted_safeguarding_review",
            "inconclusive",
            "false_positive",
            "urgent_police_escalation",
            "evidence_sealed",
            "submitted_to_police",
            "under_investigation",
            "closed"
        ],
        "terminal_status": "closed",
        "terminal_label": "Case Closed — Safeguarding Judicial Disposal",
        "evidence_required": [
            "secure_video_hash",
            "safeguarding_audit_log",
            "judicial_chain_of_custody"
        ],
        "model_name": "CivicLens-RestrictedSafety-v2.2",
        "model_version": "2.2.0",
        "sla_hours": 1,
        "is_restricted": True,
        "requires_police": True,
        "permitted_roles": ["admin", "police"],
        "notification_template": "Sensitive safeguarding dossier transferred to SPUWAC Women Safety Command."
    },
    "forced_movement": {
        "category": "forced_movement",
        "name": "Possible Kidnapping or Forced Movement",
        "workflow_type": "public_safety_restricted",
        "department": "Police Crime Branch / Urgent Anti-Kidnapping Squad",
        "assigned_team": "Police Emergency Quick Response Unit (112)",
        "review_queue": "public_safety_review",
        "allowed_statuses": [
            "candidate_flagged",
            "urgent_safety_review",
            "inconclusive",
            "false_positive",
            "urgent_police_escalation",
            "evidence_sealed",
            "submitted_to_police",
            "active_intercept",
            "closed"
        ],
        "terminal_status": "closed",
        "terminal_label": "Intercept Concluded — Subject Safeguarded",
        "evidence_required": [
            "trajectory_tracking_video",
            "evidence_hashes",
            "chain_of_custody"
        ],
        "model_name": "CivicLens-ForcedMotion-v2.2",
        "model_version": "2.2.0",
        "sla_hours": 1,
        "is_restricted": True,
        "requires_police": True,
        "permitted_roles": ["admin", "engineer", "police"],
        "notification_template": "Urgent forced-movement alert dispatched to Police Flying Squad."
    },
    "drug_activity": {
        "category": "drug_activity",
        "name": "Suspected Drug Dealing or Narcotics Activity",
        "workflow_type": "public_safety_restricted",
        "department": "Anti-Narcotics Task Force / Crime Intelligence Cell",
        "assigned_team": "Narcotics Intelligence Analysis Cell",
        "review_queue": "public_safety_review",
        "allowed_statuses": [
            "candidate_flagged",
            "suspicious_activity_review",
            "inconclusive",
            "false_positive",
            "intelligence_dossier_prepared",
            "submitted_to_police",
            "under_investigation",
            "closed"
        ],
        "terminal_status": "closed",
        "terminal_label": "Intelligence Report Closed",
        "evidence_required": [
            "surveillance_interval_clip",
            "covert_exchange_indicators"
        ],
        "model_name": "CivicLens-NarcoticsContext-v2.2",
        "model_version": "2.2.0",
        "sla_hours": 6,
        "is_restricted": True,
        "requires_police": True,
        "permitted_roles": ["admin", "police"],
        "notification_template": "Confidential narcotics observation logged for Crime Intelligence review."
    },
    "other_public_safety": {
        "category": "other_public_safety",
        "name": "Other Public-Safety Emergencies",
        "workflow_type": "public_safety_emergency",
        "department": "Integrated Emergency Response Authority (Disaster Management, 108 Ambulance, Fire 101)",
        "assigned_team": "Emergency Response Medical / Rescue Unit",
        "review_queue": "public_safety_review",
        "allowed_statuses": [
            "candidate_flagged",
            "emergency_triage",
            "ambulance_dispatched",
            "fire_rescue_dispatched",
            "police_unit_on_scene",
            "resolved",
            "false_alarm"
        ],
        "terminal_status": "resolved",
        "terminal_label": "Emergency Resolved — Casualty Assisted",
        "evidence_required": [
            "incident_timestamp_snapshot",
            "dispatch_log"
        ],
        "model_name": "CivicLens-CrowdHazard-v2.2",
        "model_version": "2.2.0",
        "sla_hours": 1,
        "is_restricted": False,
        "requires_police": True,
        "permitted_roles": ["admin", "engineer", "police"],
        "notification_template": "Emergency services dispatched for {location}."
    }
}


class WorkflowRoutingEngine:
    """
    Central Workflow Routing Engine.
    Maps verified incident categories to independent workflow definitions, enforcing:
    - Dedicated departmental assignments
    - Distinct review queues
    - Role-based visibility and access guards
    - Explicit valid state transitions
    """

    @classmethod
    def get_workflow(cls, category: str) -> Dict[str, Any]:
        cat_key = category.lower().replace(" ", "_").strip()
        if cat_key in WORKFLOW_DEFINITIONS:
            return WORKFLOW_DEFINITIONS[cat_key]

        # Aliases
        if "road" in cat_key or "pothole" in cat_key:
            return WORKFLOW_DEFINITIONS["road_damage"]
        if "garbage" in cat_key or "waste" in cat_key or "dumping" in cat_key:
            return WORKFLOW_DEFINITIONS["garbage_waste"]
        if "light" in cat_key or "lamp" in cat_key:
            return WORKFLOW_DEFINITIONS["streetlight"]
        if "water" in cat_key or "flood" in cat_key or "drain" in cat_key:
            return WORKFLOW_DEFINITIONS["waterlogging_flood"]
        if "traffic" in cat_key or "accident" in cat_key or "vehicle" in cat_key or "congestion" in cat_key:
            return WORKFLOW_DEFINITIONS["traffic_safety"]
        if "assault" in cat_key or "violenc" in cat_key or "fight" in cat_key:
            return WORKFLOW_DEFINITIONS["assault_violence"]
        if "sex" in cat_key or "harass" in cat_key or "rape" in cat_key:
            return WORKFLOW_DEFINITIONS["sexual_violence_sensitive"]
        if "kidnap" in cat_key or "forced" in cat_key or "coerc" in cat_key:
            return WORKFLOW_DEFINITIONS["forced_movement"]
        if "drug" in cat_key or "narcotic" in cat_key:
            return WORKFLOW_DEFINITIONS["drug_activity"]

        # Default fallback
        return WORKFLOW_DEFINITIONS["road_damage"]

    @classmethod
    def route_detection(cls, category: str, subcategory: Optional[str] = None) -> Dict[str, Any]:
        """
        Determines the routing attributes for a fresh AI detection.
        """
        wf = cls.get_workflow(category)
        initial_status = "candidate_flagged" if wf["is_restricted"] else "pending_review"
        if wf["workflow_type"] == "traffic_operations":
            initial_status = "monitoring_queue"

        return {
            "workflow_type": wf["workflow_type"],
            "assigned_department": wf["department"],
            "assigned_user_or_team": wf["assigned_team"],
            "review_queue": wf["review_queue"],
            "current_status": initial_status,
            "is_restricted": wf["is_restricted"],
            "requires_police": wf["requires_police"],
            "model_name": wf["model_name"],
            "model_version": wf["model_version"],
            "evidence_required": wf["evidence_required"]
        }

    @classmethod
    def validate_state_transition(
        cls,
        category: str,
        current_status: str,
        target_status: str,
        user_role: str
    ) -> Tuple[bool, Optional[str]]:
        """
        Verifies whether transitioning from current_status to target_status is permitted
        under this category's workflow definition and by this user role.
        """
        wf = cls.get_workflow(category)
        
        # 1. Role permission check
        # Engineer has cross-portal visibility, Admin has superuser
        if user_role == "admin":
            pass
        elif user_role == "engineer" and wf["workflow_type"] == "sensitive_safeguarding":
            # Sensitive safeguarding is restricted strictly to Safeguarding Officer & Police
            return False, "Access denied: Sensitive sexual violence safeguarding is restricted to authorized Police / Safeguarding Officers."
        elif user_role not in wf["permitted_roles"]:
            return False, f"Access denied: User role '{user_role}' is not authorized to modify cases in '{wf['name']}'."

        # 2. Status existence check
        if target_status not in wf["allowed_statuses"]:
            return False, f"Invalid status: '{target_status}' is not permitted in the {wf['name']} workflow. Allowed: {wf['allowed_statuses']}"

        # 3. Municipal repair crew cannot resolve public safety or self-verify
        if user_role == "crew" and target_status in ["resolved", "closed", "charges_filed"]:
            return False, "Field Crew cannot self-verify resolution. Must submit 'awaiting_inspection' for Chief Engineer."

        # 4. Corporator cannot close or route public-safety cases
        if user_role == "corporator" and wf["requires_police"]:
            return False, "Public-safety cases must be reviewed and escalated by Police / Authorized Safety Reviewers, not Municipal Corporator."

        return True, None

    @classmethod
    def get_permitted_queues(cls, user_role: str) -> List[str]:
        """
        Returns the review queues that this role is authorized to inspect.
        """
        if user_role == "admin":
            return [
                "road_maintenance",
                "waste_management",
                "electrical_maintenance",
                "drainage_management",
                "traffic_management",
                "public_safety_review",
                "sensitive_safeguarding",
                "police_submission_tracking"
            ]
        if user_role == "engineer":
            # Engineer has cross-portal municipal & operational visibility
            return [
                "road_maintenance",
                "waste_management",
                "electrical_maintenance",
                "drainage_management",
                "traffic_management",
                "public_safety_review",
                "police_submission_tracking"
            ]
        if user_role == "corporator":
            # Municipal infrastructure queues only
            return [
                "road_maintenance",
                "waste_management",
                "electrical_maintenance",
                "drainage_management"
            ]
        if user_role == "crew":
            # Work items assigned to field operations
            return [
                "road_maintenance",
                "waste_management",
                "electrical_maintenance",
                "drainage_management"
            ]
        if user_role == "police":
            # Public safety, traffic, safeguarding, and submission tracking
            return [
                "public_safety_review",
                "sensitive_safeguarding",
                "traffic_management",
                "police_submission_tracking"
            ]
        if user_role == "citizen":
            return []

        return ["road_maintenance"]
