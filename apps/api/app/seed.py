import json
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models.ward import WardModel
from app.models.crew import CrewModel
from app.models.user import UserModel
from app.models.issue import IssueModel
from app.models.work_order import WorkOrderModel
from app.models.status_event import StatusEventModel
from app.models.cctv import CameraModel, RecordingModel, CctvDetectionModel, IncidentReportModel
from app.ml.classifier import CivicAIClassifier

def seed_cctv_system(db: Session):
    existing_cam = db.query(CameraModel).first()
    if existing_cam:
        return

    now = datetime.now(timezone.utc)

    # 1. Seed Real Smart City CCTV Cameras
    cameras = [
        CameraModel(
            id="CAM-DL-101",
            name="CP-RADIAL-01 (Connaught Place Circle)",
            code="CAM-DEL-CP01",
            location_name="Radial Road 1, Block A, Connaught Place, New Delhi",
            ward_id="WARD-DL-01",
            latitude=28.6315,
            longitude=77.2167,
            stream_url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
            stream_type="mp4",
            status="online",
            capabilities=json.dumps({"live": True, "recording": True, "ptz": True, "night_vision": True, "ai_enabled": True}),
            resolution="1080p",
            fps=30,
            is_demo=False,
            created_at=now - timedelta(days=7)
        ),
        CameraModel(
            id="CAM-DL-102",
            name="JANPATH-INTERSECT-02",
            code="CAM-DEL-JP02",
            location_name="Janpath Road & Tolstoy Marg Intersection, New Delhi",
            ward_id="WARD-DL-01",
            latitude=28.6250,
            longitude=77.2185,
            stream_url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
            stream_type="mp4",
            status="incident_detected",
            capabilities=json.dumps({"live": True, "recording": True, "ptz": False, "night_vision": True, "ai_enabled": True}),
            resolution="1080p",
            fps=30,
            is_demo=False,
            created_at=now - timedelta(days=6)
        ),
        CameraModel(
            id="CAM-MH-201",
            name="BANDRA-HILL-RD-01",
            code="CAM-BOM-HR01",
            location_name="Hill Road Commercial Market, Bandra West, Mumbai",
            ward_id="WARD-MH-02",
            latitude=19.0560,
            longitude=72.8340,
            stream_url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
            stream_type="mp4",
            status="incident_detected",
            capabilities=json.dumps({"live": True, "recording": True, "ptz": True, "night_vision": True, "ai_enabled": True}),
            resolution="1080p",
            fps=30,
            is_demo=False,
            created_at=now - timedelta(days=5)
        ),
        CameraModel(
            id="CAM-MH-202",
            name="CARTER-PROMENADE-02",
            code="CAM-BOM-CR02",
            location_name="Carter Road Seafront Promenade & Joggers Bay, Mumbai",
            ward_id="WARD-MH-02",
            latitude=19.0680,
            longitude=72.8230,
            stream_url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackSeeTheWorld.mp4",
            stream_type="mp4",
            status="online",
            capabilities=json.dumps({"live": True, "recording": True, "ptz": False, "night_vision": True, "ai_enabled": True}),
            resolution="1080p",
            fps=25,
            is_demo=False,
            created_at=now - timedelta(days=5)
        ),
        CameraModel(
            id="CAM-KA-301",
            name="INDIRA-100FT-01",
            code="CAM-BLR-IN01",
            location_name="100 Feet Road, HAL 2nd Stage, Indiranagar, Bengaluru",
            ward_id="WARD-KA-03",
            latitude=12.9784,
            longitude=77.6408,
            stream_url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
            stream_type="mp4",
            status="online",
            capabilities=json.dumps({"live": True, "recording": True, "ptz": True, "night_vision": True, "ai_enabled": True}),
            resolution="1080p",
            fps=30,
            is_demo=False,
            created_at=now - timedelta(days=4)
        ),
        CameraModel(
            id="CAM-MH-401",
            name="PUNE-FC-RD-01",
            code="CAM-PUN-FC01",
            location_name="Fergusson College Road, Goodluck Chowk, Pune",
            ward_id="WARD-MH-04",
            latitude=18.5240,
            longitude=73.8410,
            stream_url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
            stream_type="mp4",
            status="incident_detected",
            capabilities=json.dumps({"live": True, "recording": True, "ptz": False, "night_vision": True, "ai_enabled": True}),
            resolution="1080p",
            fps=30,
            is_demo=False,
            created_at=now - timedelta(days=4)
        )
    ]
    for c in cameras:
        db.add(c)

    # 2. Seed Historical Recordings
    recordings = [
        RecordingModel(
            id="REC-DL-101-01",
            camera_id="CAM-DL-101",
            start_time=now - timedelta(hours=3),
            end_time=now - timedelta(hours=2),
            duration_seconds=3600,
            video_url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
            thumbnail_url="https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80",
            file_size_mb=210.5,
            is_demo=False,
            created_at=now - timedelta(hours=2)
        ),
        RecordingModel(
            id="REC-DL-102-01",
            camera_id="CAM-DL-102",
            start_time=now - timedelta(hours=2),
            end_time=now - timedelta(hours=1),
            duration_seconds=3600,
            video_url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
            thumbnail_url="https://images.unsplash.com/photo-1508847154043-be5407fcaa5a?auto=format&fit=crop&w=600&q=80",
            file_size_mb=340.0,
            is_demo=False,
            created_at=now - timedelta(hours=1)
        ),
        RecordingModel(
            id="REC-MH-201-01",
            camera_id="CAM-MH-201",
            start_time=now - timedelta(hours=4),
            end_time=now - timedelta(hours=3),
            duration_seconds=3600,
            video_url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
            thumbnail_url="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80",
            file_size_mb=180.2,
            is_demo=False,
            created_at=now - timedelta(hours=3)
        ),
        RecordingModel(
            id="REC-MH-401-01",
            camera_id="CAM-MH-401",
            start_time=now - timedelta(hours=1),
            end_time=now,
            duration_seconds=3600,
            video_url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
            thumbnail_url="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80",
            file_size_mb=290.0,
            is_demo=False,
            created_at=now
        )
    ]
    for r in recordings:
        db.add(r)

    # 3. Seed AI Detections across Civic and Public Safety
    detections = [
        CctvDetectionModel(
            id="EVT-CP-081",
            camera_id="CAM-DL-101",
            recording_id="REC-DL-101-01",
            category="civic_infrastructure",
            event_type="pothole",
            confidence=0.94,
            timestamp_offset_seconds=12,
            incident_time=now - timedelta(minutes=45),
            snapshot_url="https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80",
            video_url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
            description="Deep roadway asphalt cavity and fissure detected in high-density lane near inner circle junction.",
            observable_indicators=json.dumps([
                "Asphalt surface cavity > 12cm depth",
                "Repeated two-wheeler swerving observed",
                "Located within 15m of pedestrian crossing"
            ]),
            priority="high",
            review_status="pending_review",
            created_at=now - timedelta(minutes=45)
        ),
        CctvDetectionModel(
            id="EVT-JP-104",
            camera_id="CAM-DL-102",
            recording_id="REC-DL-102-01",
            category="public_safety",
            event_type="potential_assault",
            confidence=0.92,
            timestamp_offset_seconds=24,
            incident_time=now - timedelta(minutes=22),
            snapshot_url="https://images.unsplash.com/photo-1508847154043-be5407fcaa5a?auto=format&fit=crop&w=800&q=80",
            video_url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
            description="Observable physical altercation: rapid aggressive striking and shoving detected between two individuals near transit entry.",
            observable_indicators=json.dumps([
                "High-velocity arm motions consistent with punching/striking",
                "Physical grappling lasting over 7 seconds",
                "Surrounding pedestrians abruptly backing away"
            ]),
            priority="critical",
            review_status="pending_review",
            created_at=now - timedelta(minutes=22)
        ),
        CctvDetectionModel(
            id="EVT-BH-203",
            camera_id="CAM-MH-201",
            recording_id="REC-MH-201-01",
            category="public_safety",
            event_type="potential_forced_movement",
            confidence=0.88,
            timestamp_offset_seconds=35,
            incident_time=now - timedelta(minutes=15),
            snapshot_url="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80",
            video_url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
            description="Observable struggle: individual physically restrained and forcefully guided toward stopped dark vehicle.",
            observable_indicators=json.dumps([
                "Observable physical resistance and backward leaning posture",
                "Continuous wrist/arm grip maintained during movement",
                "Sudden vehicle door opening synchronized with approach",
                "Contextual human verification required"
            ]),
            priority="critical",
            review_status="pending_review",
            created_at=now - timedelta(minutes=15)
        ),
        CctvDetectionModel(
            id="EVT-CR-305",
            camera_id="CAM-MH-202",
            recording_id=None,
            category="public_safety",
            event_type="potential_harassment",
            confidence=0.86,
            timestamp_offset_seconds=18,
            incident_time=now - timedelta(minutes=8),
            snapshot_url="https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=800&q=80",
            video_url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackSeeTheWorld.mp4",
            description="Temporal tracking detected an individual persistently trailing a solo pedestrian with recurring path intercepts.",
            observable_indicators=json.dumps([
                "Consistent trailing distance (< 2.5m) through 3 directional turns",
                "Repetitive sudden acceleration matching pedestrian cadence",
                "Two physical path blocking attempts observed"
            ]),
            priority="high",
            review_status="pending_review",
            created_at=now - timedelta(minutes=8)
        ),
        CctvDetectionModel(
            id="EVT-IN-402",
            camera_id="CAM-KA-301",
            recording_id=None,
            category="public_safety",
            event_type="medical_collapse",
            confidence=0.95,
            timestamp_offset_seconds=15,
            incident_time=now - timedelta(minutes=30),
            snapshot_url="https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80",
            video_url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
            description="Sudden vertical drop and unresponsiveness: pedestrian collapsed onto sidewalk near metro stairs.",
            observable_indicators=json.dumps([
                "Rapid uncontrolled descent to ground without break-fall reflex",
                "Individual stationary/unresponsive > 45 seconds",
                "Bystanders gathering and gesturing for emergency assistance"
            ]),
            priority="critical",
            review_status="verified",
            created_at=now - timedelta(minutes=30)
        ),
        CctvDetectionModel(
            id="EVT-FC-501",
            camera_id="CAM-MH-401",
            recording_id="REC-MH-401-01",
            category="civic_infrastructure",
            event_type="waterlogging",
            confidence=0.93,
            timestamp_offset_seconds=10,
            incident_time=now - timedelta(minutes=50),
            snapshot_url="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80",
            video_url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
            description="Submerged drainage storm grate and water ponding across 2 traffic lanes causing vehicle deceleration.",
            observable_indicators=json.dumps([
                "Surface water accumulation spanning 35 sq meters",
                "Water depth estimated > 18cm covering vehicle wheel rims",
                "Clogged curb inlet grate with debris buildup"
            ]),
            priority="high",
            review_status="pending_review",
            created_at=now - timedelta(minutes=50)
        )
    ]
    for d in detections:
        db.add(d)

    # 4. Seed an active Incident Report with Emergency Escalation Dispatch
    report = IncidentReportModel(
        id="INC-20261018-001",
        detection_id="EVT-IN-402",
        camera_id="CAM-KA-301",
        location_text="100 Feet Road, HAL 2nd Stage, Indiranagar, Bengaluru",
        latitude=12.9784,
        longitude=77.6408,
        ward_id="WARD-KA-03",
        category="public_safety",
        event_type="medical_collapse",
        priority="critical",
        incident_timestamp=now - timedelta(minutes=30),
        summary="Emergency Medical Response: Citizen collapse observed at metro entrance. Immediate triage initiated.",
        observable_indicators=json.dumps([
            "Rapid uncontrolled descent to ground without break-fall reflex",
            "Individual stationary/unresponsive > 45 seconds",
            "Bystanders gathering and gesturing for emergency assistance"
        ]),
        snapshot_url="https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80",
        video_url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        video_timestamp_seconds=15,
        reviewer_id="USER-ADMIN",
        reviewer_name="Director Sarah Vance",
        review_decision="verified",
        reviewer_notes="Video verified by Operator Vance. Immediate dispatch triggered to 108 Ambulance & Nearest Traffic Beat.",
        escalation_channel="ambulance_108",
        escalation_status="unit_en_route",
        agency_reference_id="AMB-BLR-8921",
        created_at=now - timedelta(minutes=28),
        updated_at=now - timedelta(minutes=10),
    )
    db.add(report)

    db.commit()


def ensure_multi_category_recordings_seeded(db: Session):
    existing_rec = db.query(RecordingModel).filter(RecordingModel.id == "REC-DEMO-TRAFFIC").first()
    if existing_rec:
        return

    now = datetime.now(timezone.utc)
    demo_specs = [
        ("REC-DEMO-TRAFFIC", "CAM-DL-101", "http://localhost:8000/uploads/demo_traffic_safety.mp4", "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80", 1.1, "traffic_safety", "vehicle_congestion", "Deep urban traffic congestion and stationary queue formation detected.", 0.94, 6, "high", False, [
            "Vehicular velocity drop < 4 km/h across 3 transit lanes",
            "Continuous queue backlog extending beyond 60m intersection radius",
            "Normal traffic flow recognized as baseline; persistent stoppage triggered threshold"
        ]),
        ("REC-DEMO-GARBAGE", "CAM-MH-201", "http://localhost:8000/uploads/demo_garbage_waste.mp4", "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=600&q=80", 1.0, "garbage_waste", "garbage_pile_accumulation", "Substantial waste bag pile and overflowing container refuse accumulating near pedestrian sidewalk.", 0.91, 5, "medium", False, [
            "Stationary ground-level organic & plastic refuse cluster spanning > 3.8 sq meters",
            "Temporal comparison: refuse volume accumulated over consecutive frame intervals",
            "Absence of scheduled municipal collection receptacle at monitored corner"
        ]),
        ("REC-DEMO-WATERLOG", "CAM-MH-401", "http://localhost:8000/uploads/demo_waterlogging_flood.mp4", "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80", 3.2, "waterlogging_flood", "standing_water_roadway", "Extensive surface water ponding and clogged stormwater inlet causing significant traffic deceleration.", 0.93, 4, "high", False, [
            "Specular reflection & low-variance ground sheen covering > 28 sq meters of roadway",
            "Vehicle tire spray and water displacement observed during traffic transit",
            "Persistent standing pool depth estimated > 15cm; field verification recommended"
        ]),
        ("REC-DEMO-ROADDAMAGE", "CAM-DL-102", "http://localhost:8000/uploads/demo_road_damage.mp4", "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80", 1.1, "road_damage", "deep_pothole", "Deep asphalt cavity and surface pavement fracture detected in central transit lane.", 0.95, 7, "high", False, [
            "Morphological dark cavity depression with structural edge fissure > 14cm",
            "Repeated two-wheeler evasive swerving detected around rupture perimeter",
            "High impact damage risk for public transit buses and light vehicles"
        ]),
        ("REC-DEMO-ASSAULT", "CAM-KA-301", "http://localhost:8000/uploads/demo_assault_violence.mp4", "https://images.unsplash.com/photo-1508847154043-be5407fcaa5a?auto=format&fit=crop&w=600&q=80", 1.3, "assault_violence", "potential_physical_assault", "Observable rapid physical altercation: high-velocity striking motions and forceful struggle detected.", 0.92, 6, "critical", False, [
            "Temporal optical flow: sudden violent opposing kinetic energy vectors (jerk > 4.2 m/s²)",
            "Aggressive physical grappling and shoving lasting > 6 seconds",
            "Adjacent pedestrians rapidly clearing the altercation perimeter",
            "Neutral review classification: Potential Physical Assault — Authorized Human Review Required"
        ]),
        ("REC-DEMO-FORCEDMOVE", "CAM-MH-202", "http://localhost:8000/uploads/demo_forced_movement.mp4", "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80", 1.1, "forced_movement", "potential_forced_movement", "Observable physical interaction: individual restrained and forcibly guided along roadway toward vehicle.", 0.89, 5, "critical", False, [
            "Physical restraint trajectory: backward-leaning resistance posture with continuous arm grip",
            "Constrained directional path incongruent with voluntary pedestrian flow",
            "Synchronized vehicle door access observed at intercept locus",
            "Neutral review classification: Possible Forced Movement — Urgent Human Review"
        ]),
        ("REC-DEMO-SENSITIVE", "CAM-MH-201", "http://localhost:8000/uploads/demo_sensitive_incident.mp4", "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=600&q=80", 1.1, "sexual_violence_sensitive", "potential_sexual_violence_indicator", "Observable coercive physical contact and forceful restraint in isolated corridor. Restricted early-warning safeguarding review.", 0.88, 4, "critical", True, [
            "Coercive physical holding and distress indicators in shadowed perimeter zone",
            "Multi-frame temporal struggle with physical containment",
            "Restricted Safeguarding Classification: Possible Sexual Violence — Restricted Review",
            "Strict audit logging and supervisor credentials enforced for original evidence access"
        ]),
        ("REC-DEMO-COLLAPSE", "CAM-DL-101", "http://localhost:8000/uploads/demo_pedestrian_collapse.mp4", "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=600&q=80", 1.0, "other_public_safety", "medical_collapse_fall", "Sudden uncontrolled downward descent and unresponsiveness: pedestrian collapsed onto transit walkway.", 0.93, 8, "critical", False, [
            "Rapid vertical centroid descent (> 2.8 m/s²) without normal postural recovery",
            "Individual stationary in recumbent posture for > 20 seconds",
            "Surrounding bystanders gathering and signaling for emergency response"
        ]),
    ]

    for rec_id, cam_id, v_url, thumb_url, sz_mb, cat, etype, desc, conf, offset, prio, is_restr, indicators in demo_specs:
        rec = RecordingModel(
            id=rec_id,
            camera_id=cam_id,
            start_time=now - timedelta(minutes=15),
            end_time=now,
            duration_seconds=12,
            video_url=v_url,
            thumbnail_url=thumb_url,
            file_size_mb=sz_mb,
            is_demo=True,
            created_at=now
        )
        db.add(rec)

        det = CctvDetectionModel(
            id=f"EVT-SEED-{rec_id.split('-')[-1]}",
            camera_id=cam_id,
            recording_id=rec_id,
            category=cat,
            event_type=etype,
            confidence=conf,
            timestamp_offset_seconds=offset,
            incident_time=now - timedelta(minutes=10),
            snapshot_url=thumb_url,
            video_url=v_url,
            description=desc,
            observable_indicators=json.dumps(indicators),
            priority=prio,
            review_status="pending_review",
            model_name=f"CivicLens-{cat.split('_')[0].capitalize()}Net-v2.2",
            model_version="2.2.0",
            bounding_box=json.dumps({"x": 350, "y": 420, "w": 280, "h": 200}),
            is_restricted=is_restr,
            validation_metrics=json.dumps({"precision": 0.93, "recall": 0.91, "f1_score": 0.92, "false_positive_rate": 0.04}),
            created_at=now
        )
        db.add(det)

    db.commit()


def seed_database(db: Session):
    # Check and seed CCTV system
    seed_cctv_system(db)
    ensure_multi_category_recordings_seeded(db)

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
