import json
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models.ward import WardModel
from app.models.crew import CrewModel
from app.models.user import UserModel
from app.models.issue import IssueModel
from app.models.work_order import WorkOrderModel
from app.models.status_event import StatusEventModel
from app.ml.classifier import CivicAIClassifier

def seed_database(db: Session):
    # Check if Indian wards are already seeded
    existing_delhi = db.query(WardModel).filter(WardModel.id == "WARD-DL-01").first()
    if existing_delhi:
        return

    # Clear old legacy seed data if only 4 generic wards existed
    if db.query(WardModel).count() <= 4:
        db.query(StatusEventModel).delete()
        db.query(WorkOrderModel).delete()
        db.query(IssueModel).delete()
        db.query(CrewModel).delete()
        db.query(UserModel).delete()
        db.query(WardModel).delete()
        db.commit()

    # 1. Real Indian Wards & Global Cities
    wards = [
        WardModel(
            id="WARD-DL-01",
            name="New Delhi - Connaught Place & Central",
            city="New Delhi, India",
            boundary=json.dumps({
                "type": "Polygon",
                "coordinates": [[[28.62, 77.20], [28.65, 77.20], [28.65, 77.23], [28.62, 77.23], [28.62, 77.20]]]
            })
        ),
        WardModel(
            id="WARD-MH-02",
            name="Mumbai - Bandra & Coastal Corridor",
            city="Mumbai, India",
            boundary=json.dumps({
                "type": "Polygon",
                "coordinates": [[[19.04, 72.81], [19.08, 72.81], [19.08, 72.85], [19.04, 72.85], [19.04, 72.81]]]
            })
        ),
        WardModel(
            id="WARD-KA-03",
            name="Bengaluru - Indiranagar & Tech Park",
            city="Bengaluru, India",
            boundary=json.dumps({
                "type": "Polygon",
                "coordinates": [[[12.96, 77.62], [13.00, 77.62], [13.00, 77.66], [12.96, 77.66], [12.96, 77.62]]]
            })
        ),
        WardModel(
            id="WARD-MH-04",
            name="Pune - Shivajinagar & Kothrud",
            city="Pune, India",
            boundary=json.dumps({
                "type": "Polygon",
                "coordinates": [[[18.51, 73.82], [18.55, 73.82], [18.55, 73.86], [18.51, 73.86], [18.51, 73.82]]]
            })
        ),
        WardModel(
            id="WARD-GL-05",
            name="London - Westminster & Central",
            city="London, UK",
            boundary=json.dumps({
                "type": "Polygon",
                "coordinates": [[[51.49, -0.15], [51.52, -0.15], [51.52, -0.10], [51.49, -0.10], [51.49, -0.15]]]
            })
        ),
        WardModel(
            id="WARD-GL-06",
            name="New York - Manhattan District",
            city="New York, USA",
            boundary=json.dumps({
                "type": "Polygon",
                "coordinates": [[[40.70, -74.02], [40.76, -74.02], [40.76, -73.96], [40.70, -73.96], [40.70, -74.02]]]
            })
        )
    ]
    for w in wards:
        db.add(w)

    # 2. Seed Users
    users = [
        UserModel(
            id="USER-ADMIN",
            phone="+919811122233",
            name="Director Sarah Vance (Municipal Commissioner)",
            role="admin",
            ward_id="WARD-DL-01"
        ),
        UserModel(
            id="USER-ENGINEER",
            phone="+919833344455",
            name="Er. Rajesh Sharma (Chief Engineer)",
            role="engineer",
            ward_id="WARD-DL-01"
        ),
        UserModel(
            id="USER-CREW",
            phone="+919855566677",
            name="Crew Chief Dave / Vikram Singh",
            role="crew",
            ward_id="WARD-DL-01"
        ),
        UserModel(
            id="USER-CITIZEN",
            phone="+919877788899",
            name="Anya Sharma / Citizen Reporter",
            role="citizen",
            ward_id="WARD-DL-01"
        )
    ]
    for u in users:
        db.add(u)

    # 3. Real Municipal Crews across India
    crews = [
        CrewModel(
            id="CREW-01",
            name="Delhi NDMC Asphalt Quick-Patch Team",
            ward_id="WARD-DL-01",
            latitude=28.6320,
            longitude=77.2180,
            status="available",
            contact_phone="+919811190001"
        ),
        CrewModel(
            id="CREW-02",
            name="Mumbai BMC Hydraulic & Storm Drainage Unit",
            ward_id="WARD-MH-02",
            latitude=19.0610,
            longitude=72.8310,
            status="dispatched",
            contact_phone="+919811190002"
        ),
        CrewModel(
            id="CREW-03",
            name="Bengaluru BBMP Electric & Streetlight Rapid Squad",
            ward_id="WARD-KA-03",
            latitude=12.9790,
            longitude=77.6420,
            status="available",
            contact_phone="+919811190003"
        ),
        CrewModel(
            id="CREW-04",
            name="Pune PMC Sanitation & Cleanliness Taskforce",
            ward_id="WARD-MH-04",
            latitude=18.5320,
            longitude=73.8460,
            status="available",
            contact_phone="+919811190004"
        )
    ]
    for c in crews:
        db.add(c)

    db.commit()

    # 4. Realistic Real-World Issues
    sample_issues_data = [
        {
            "id": "ISSUE-IN-101",
            "title": "Severe Crater Pothole on Connaught Outer Circle",
            "description": "Deep asphalt crater (approx 14cm depth) damaging vehicle axles near Barakhamba road junction.",
            "category": "pothole",
            "severity": "high",
            "status": "in_progress",
            "latitude": 28.6318,
            "longitude": 77.2205,
            "ward_id": "WARD-DL-01",
            "source": "citizen",
            "photo_url": "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80",
            "priority_score": 86.5
        },
        {
            "id": "ISSUE-IN-102",
            "title": "Potable Drinking Pipeline Rupture on Bandra Hill Road",
            "description": "High-pressure municipal potable water main leak flooding pedestrian promenade.",
            "category": "water_leak",
            "severity": "critical",
            "status": "acknowledged",
            "latitude": 19.0585,
            "longitude": 72.8305,
            "ward_id": "WARD-MH-02",
            "source": "citizen",
            "photo_url": "https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=600&q=80",
            "priority_score": 94.0
        },
        {
            "id": "ISSUE-IN-103",
            "title": "Broken Streetlight Hanging by Wire on 100ft Road",
            "description": "Damaged luminaire casing dangling over traffic lane creating acute hazard for vehicles and pedestrians.",
            "category": "streetlight",
            "severity": "high",
            "status": "reported",
            "latitude": 12.9775,
            "longitude": 77.6415,
            "ward_id": "WARD-KA-03",
            "source": "citizen",
            "photo_url": "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=600&q=80",
            "priority_score": 82.0
        },
        {
            "id": "ISSUE-IN-104",
            "title": "Overflowing Commercial Trash Compactor",
            "description": "Uncollected garbage spillover near FC Road market blocking storm drain channel.",
            "category": "garbage",
            "severity": "medium",
            "status": "reported",
            "latitude": 18.5295,
            "longitude": 73.8430,
            "ward_id": "WARD-MH-04",
            "source": "citizen",
            "photo_url": "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=600&q=80",
            "priority_score": 53.0
        },
        {
            "id": "ISSUE-GL-105",
            "title": "CCTV Detection: Submerged Storm Drain Inundation",
            "description": "High-speed road camera automated detection of clogged iron storm grate during rain.",
            "category": "drainage",
            "severity": "high",
            "status": "reported",
            "latitude": 51.5015,
            "longitude": -0.1265,
            "ward_id": "WARD-GL-05",
            "source": "cctv",
            "photo_url": "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80",
            "priority_score": 78.5
        }
    ]

    for item in sample_issues_data:
        diag = CivicAIClassifier.classify_and_diagnose(
            category_hint=item["category"],
            description=item["description"],
            photo_url=item["photo_url"]
        )
        issue = IssueModel(
            id=item["id"],
            reporter_id="USER-CITIZEN",
            reporter_phone="+919877788899",
            title=item["title"],
            description=item["description"],
            category=item["category"],
            severity=item["severity"],
            status=item["status"],
            latitude=item["latitude"],
            longitude=item["longitude"],
            ward_id=item["ward_id"],
            photo_url=item["photo_url"],
            ai_confidence=diag["confidence"],
            source=item["source"],
            priority_score=item["priority_score"],
            diagnostic_card=json.dumps(diag["diagnostic_card"]),
            created_at=datetime.now(timezone.utc) - timedelta(hours=6),
            resolved_at=(datetime.now(timezone.utc) - timedelta(hours=1)) if item["status"] == "resolved" else None
        )
        db.add(issue)

        # Status event
        event = StatusEventModel(
            issue_id=issue.id,
            old_status=None,
            new_status="reported",
            actor_id="USER-CITIZEN",
            actor_role="citizen",
            comment="Initial field report"
        )
        db.add(event)

        if item["status"] == "in_progress":
            wo = WorkOrderModel(
                id=f"WO-{issue.id[-3:]}",
                issue_id=issue.id,
                assigned_crew_id="CREW-01",
                priority_score=issue.priority_score,
                status="in_progress",
                created_at=datetime.now(timezone.utc) - timedelta(hours=4)
            )
            db.add(wo)
        elif item["status"] == "acknowledged":
            wo = WorkOrderModel(
                id=f"WO-{issue.id[-3:]}",
                issue_id=issue.id,
                assigned_crew_id="CREW-02",
                priority_score=issue.priority_score,
                status="assigned",
                created_at=datetime.now(timezone.utc) - timedelta(hours=2)
            )
            db.add(wo)

    db.commit()
