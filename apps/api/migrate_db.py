import os
import sqlite3
import uuid

def migrate_file(db_path):
    if not os.path.exists(db_path):
        return
    print(f"Migrating {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 1. cctv_detections migration
    cursor.execute('PRAGMA table_info(cctv_detections)')
    cctv_cols = [r[1] for r in cursor.fetchall()]
    new_cctv_cols = [
        ('model_name', 'VARCHAR(100) DEFAULT "CivicLens-MultiVision-v2.2"'),
        ('model_version', 'VARCHAR(30) DEFAULT "2.2.0"'),
        ('bounding_box', 'TEXT'),
        ('is_restricted', 'BOOLEAN DEFAULT 0'),
        ('validation_metrics', 'TEXT'),
        ('subcategory', 'VARCHAR(60)'),
        ('source_type', 'VARCHAR(30) DEFAULT "cctv"'),
        ('source_camera_id', 'VARCHAR(36)'),
        ('workflow_type', 'VARCHAR(50) DEFAULT "municipal_infrastructure"'),
        ('assigned_department', 'VARCHAR(150)'),
        ('assigned_user_or_team', 'VARCHAR(150)'),
        ('current_status', 'VARCHAR(50) DEFAULT "pending_review"'),
        ('updated_at', 'DATETIME')
    ]
    for col_name, col_type in new_cctv_cols:
        if col_name not in cctv_cols:
            print(f'Adding column {col_name} to cctv_detections...')
            cursor.execute(f'ALTER TABLE cctv_detections ADD COLUMN {col_name} {col_type}')

    # 1b. issues table migration
    cursor.execute('PRAGMA table_info(issues)')
    issue_cols = [r[1] for r in cursor.fetchall()]
    new_issue_cols = [
        ('department', 'VARCHAR(150)'),
        ('workflow_type', 'VARCHAR(50) DEFAULT "road_maintenance"')
    ]
    for col_name, col_type in new_issue_cols:
        if col_name not in issue_cols:
            print(f'Adding column {col_name} to issues...')
            cursor.execute(f'ALTER TABLE issues ADD COLUMN {col_name} {col_type}')

    # 1c. workflow_rules table creation & seed
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS workflow_rules (
        id VARCHAR(36) PRIMARY KEY,
        category VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        workflow_type VARCHAR(50) NOT NULL,
        department VARCHAR(150) NOT NULL,
        assigned_team VARCHAR(150) NOT NULL,
        review_queue VARCHAR(60) NOT NULL,
        allowed_statuses TEXT NOT NULL,
        evidence_required TEXT NOT NULL,
        is_restricted BOOLEAN DEFAULT 0,
        requires_police BOOLEAN DEFAULT 0,
        sla_hours INTEGER DEFAULT 24,
        notification_channels TEXT,
        model_name VARCHAR(100),
        model_version VARCHAR(30),
        created_at DATETIME,
        updated_at DATETIME
    )
    ''')

    # Seed workflow rules
    import json
    from app.services.workflow_routing_service import WORKFLOW_DEFINITIONS
    for cat_key, wf in WORKFLOW_DEFINITIONS.items():
        cursor.execute("SELECT count(*) FROM workflow_rules WHERE category = ?", (cat_key,))
        if cursor.fetchone()[0] == 0:
            cursor.execute('''
            INSERT INTO workflow_rules (
                id, category, name, workflow_type, department, assigned_team,
                review_queue, allowed_statuses, evidence_required, is_restricted,
                requires_police, sla_hours, notification_channels, model_name, model_version,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            ''', (
                f"WFR-{uuid.uuid4().hex[:8].upper()}",
                cat_key,
                wf["name"],
                wf["workflow_type"],
                wf["department"],
                wf["assigned_team"],
                wf["review_queue"],
                json.dumps(wf["allowed_statuses"]),
                json.dumps(wf["evidence_required"]),
                1 if wf["is_restricted"] else 0,
                1 if wf["requires_police"] else 0,
                wf["sla_hours"],
                json.dumps(["sms", "websocket", "email"]),
                wf["model_name"],
                wf["model_version"]
            ))

    # 2. users table migration
    cursor.execute('PRAGMA table_info(users)')
    user_cols = [r[1] for r in cursor.fetchall()]
    new_user_cols = [
        ('email', 'VARCHAR(120)'),
        ('password_hash', 'VARCHAR(200)'),
        ('google_id', 'VARCHAR(100)'),
        ('police_badge_id', 'VARCHAR(50)'),
        ('department', 'VARCHAR(100)')
    ]
    for col_name, col_type in new_user_cols:
        if col_name not in user_cols:
            print(f'Adding column {col_name} to users...')
            cursor.execute(f'ALTER TABLE users ADD COLUMN {col_name} {col_type}')

    # 3. police_evidence_packages table creation
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS police_evidence_packages (
        id VARCHAR(36) PRIMARY KEY,
        incident_report_id VARCHAR(36),
        detection_id VARCHAR(36),
        case_number VARCHAR(60) NOT NULL UNIQUE,
        title VARCHAR(200) NOT NULL,
        category VARCHAR(50) NOT NULL,
        incident_timestamp DATETIME NOT NULL,
        location_name VARCHAR(255) NOT NULL,
        latitude FLOAT NOT NULL,
        longitude FLOAT NOT NULL,
        camera_code VARCHAR(50) NOT NULL,
        video_clip_url TEXT NOT NULL,
        video_hash_sha256 VARCHAR(64) NOT NULL,
        snapshot_url TEXT NOT NULL,
        snapshot_hash_sha256 VARCHAR(64) NOT NULL,
        chain_of_custody_log TEXT,
        officer_badge_id VARCHAR(50),
        assigned_police_dept VARCHAR(100),
        case_status VARCHAR(50) DEFAULT 'submitted_to_police',
        classification_level VARCHAR(50) DEFAULT 'Restricted',
        created_at DATETIME,
        updated_at DATETIME
    )
    ''')

    # 3b. cctv_analysis_jobs table creation
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS cctv_analysis_jobs (
        id VARCHAR(36) PRIMARY KEY,
        recording_id VARCHAR(36) NOT NULL,
        camera_id VARCHAR(36) NOT NULL,
        status VARCHAR(40) DEFAULT 'not_started',
        progress_percent INTEGER DEFAULT 0,
        current_step VARCHAR(255),
        categories TEXT,
        frames_analyzed INTEGER DEFAULT 0,
        video_duration_seconds INTEGER DEFAULT 0,
        original_width INTEGER DEFAULT 1280,
        original_height INTEGER DEFAULT 720,
        fps FLOAT DEFAULT 30.0,
        duration_ms FLOAT DEFAULT 0.0,
        detections_count INTEGER DEFAULT 0,
        error_message TEXT,
        created_at DATETIME,
        completed_at DATETIME
    )
    ''')

    # Seed realistic bounding boxes and multi-category detections for recordings
    cursor.execute("SELECT id FROM cctv_detections WHERE bounding_box IS NOT NULL")
    has_bbox = cursor.fetchall()
    if len(has_bbox) < 4:
        print("Enriching cctv_detections with real bounding boxes and category-specific coordinates...")
        # Update existing records with real coordinates
        pothole_bbox = json.dumps({"x": 410, "y": 380, "w": 280, "h": 160, "orig_w": 1280, "orig_h": 720, "norm_x": 0.32, "norm_y": 0.528, "norm_w": 0.219, "norm_h": 0.222})
        assault_bbox = json.dumps({"x": 510, "y": 240, "w": 260, "h": 320, "orig_w": 1280, "orig_h": 720, "norm_x": 0.398, "norm_y": 0.333, "norm_w": 0.203, "norm_h": 0.444})
        forced_bbox = json.dumps({"x": 380, "y": 250, "w": 300, "h": 340, "orig_w": 1280, "orig_h": 720, "norm_x": 0.297, "norm_y": 0.347, "norm_w": 0.234, "norm_h": 0.472})
        water_bbox = json.dumps({"x": 200, "y": 420, "w": 650, "h": 220, "orig_w": 1280, "orig_h": 720, "norm_x": 0.156, "norm_y": 0.583, "norm_w": 0.508, "norm_h": 0.306})
        traffic_bbox = json.dumps({"x": 320, "y": 288, "w": 640, "h": 252, "orig_w": 1280, "orig_h": 720, "norm_x": 0.25, "norm_y": 0.40, "norm_w": 0.50, "norm_h": 0.35})
        waste_bbox = json.dumps({"x": 768, "y": 468, "w": 320, "h": 180, "orig_w": 1280, "orig_h": 720, "norm_x": 0.60, "norm_y": 0.65, "norm_w": 0.25, "norm_h": 0.25})

        cursor.execute("UPDATE cctv_detections SET category = 'road_damage', bounding_box = ? WHERE id = 'EVT-CP-081'", (pothole_bbox,))
        cursor.execute("UPDATE cctv_detections SET category = 'assault_violence', bounding_box = ? WHERE id = 'EVT-JP-104'", (assault_bbox,))
        cursor.execute("UPDATE cctv_detections SET category = 'forced_movement', bounding_box = ? WHERE id = 'EVT-BH-203'", (forced_bbox,))
        cursor.execute("UPDATE cctv_detections SET category = 'waterlogging_flood', bounding_box = ? WHERE id = 'EVT-FC-501'", (water_bbox,))

        # Seed additional multi-category detections for REC-DL-101-01 so full multi-category timeline & overlay works
        extra_dets = [
            ("EVT-DL101-TRAF", "CAM-DL-101", "REC-DL-101-01", "traffic_safety", "vehicle_congestion", 0.94, 5,
             "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80",
             "Severe vehicular queue formation with persistent standstill across primary transit lanes.",
             json.dumps(["Velocity drop < 4 km/h", "Queue backlog > 60m radius"]), "high", "verified",
             traffic_bbox, "CivicLens-TrafficNet-v2.2", "2.2.0"),
            ("EVT-DL101-GARB", "CAM-DL-101", "REC-DL-101-01", "garbage_waste", "garbage_pile_accumulation", 0.91, 22,
             "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=600&q=80",
             "Refuse bag pile and overflowing container accumulation observed near sidewalk curb.",
             json.dumps(["Ground refuse cluster > 3.8 sq meters", "Overflowing container"]), "medium", "pending_review",
             waste_bbox, "CivicLens-WasteNet-v2.2", "2.2.0"),
            ("EVT-DL101-WATE", "CAM-DL-101", "REC-DL-101-01", "waterlogging_flood", "standing_water_roadway", 0.93, 36,
             "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=600&q=80",
             "Surface water pooling along roadway shoulder causing vehicle spray and lane constriction.",
             json.dumps(["Specular sheen reflection > 24 sq meters", "Tire spray detected"]), "high", "pending_review",
             water_bbox, "CivicLens-HydroNet-v2.2", "2.2.0"),
        ]
        for ed in extra_dets:
            cursor.execute('''
            INSERT OR REPLACE INTO cctv_detections (
                id, camera_id, recording_id, category, event_type, confidence, timestamp_offset_seconds,
                snapshot_url, description, observable_indicators, priority, review_status,
                bounding_box, model_name, model_version, created_at, incident_time
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            ''', ed)

    # Seed initial completed analysis job for REC-DL-101-01
    cursor.execute("SELECT count(*) FROM cctv_analysis_jobs WHERE recording_id = 'REC-DL-101-01'")
    if cursor.fetchone()[0] == 0:
        cursor.execute('''
        INSERT INTO cctv_analysis_jobs (
            id, recording_id, camera_id, status, progress_percent, current_step,
            categories, frames_analyzed, video_duration_seconds, original_width,
            original_height, fps, duration_ms, detections_count, created_at, completed_at
        ) VALUES (
            'JOB-DL101-001', 'REC-DL-101-01', 'CAM-DL-101', 'completed_detections_found',
            100, 'Inference complete — 4 verified events detected across 8 configured vision pipelines',
            ?, 120, 60, 1280, 720, 30.0, 482.5, 4, datetime('now'), datetime('now')
        )
        ''', (json.dumps(["traffic_safety", "road_damage", "garbage_waste", "waterlogging_flood"]),))

    # 4. Seed official staff & sample police cases if empty
    cursor.execute("SELECT count(*) FROM users WHERE role = 'police'")
    if cursor.fetchone()[0] == 0:
        print("Seeding demo staff users...")
        users_to_seed = [
            ("usr-corp-01", "+919876543210", "Corporator Rajesh Sharma", "corporator", "WARD-DL-01", "corporator@civiclens.gov.in", "staff123", None, "Ward Governance Council"),
            ("usr-eng-01", "+919876543211", "Chief Engr. Priya Nair", "engineer", "WARD-DL-01", "engineer@civiclens.gov.in", "staff123", None, "Municipal Works & Infrastructure"),
            ("usr-crew-01", "+919876543212", "Rapid Response Crew 01", "crew", "WARD-DL-01", "crew@civiclens.gov.in", "staff123", None, "Roads & Stormwater Operations"),
            ("usr-pol-01", "+919876543213", "Inspector Vikram Rathore", "police", "WARD-DL-01", "cyberpolice@delhipolice.gov.in", "police123", "DL-CYBER-8842", "Cyber Crime & Video Surveillance Division"),
            ("usr-adm-01", "+919876543214", "Administrator Anand Verma", "admin", "WARD-DL-01", "admin@civiclens.gov.in", "admin123", None, "Municipal IT Administration"),
            ("usr-cit-01", "+919876543215", "Aarav Mehta (Citizen)", "citizen", "WARD-DL-01", "aarav.mehta@gmail.com", "citizen123", None, None),
        ]
        for u in users_to_seed:
            cursor.execute('''
            INSERT OR REPLACE INTO users (id, phone, name, role, ward_id, email, password_hash, police_badge_id, department, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            ''', u)

    # Sample Police Evidence Package
    cursor.execute("SELECT count(*) FROM police_evidence_packages")
    if cursor.fetchone()[0] == 0:
        print("Seeding sample police evidence package...")
        import hashlib
        sample_video = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
        sample_snap = "https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?w=800&auto=format&fit=crop&q=80"
        vid_hash = hashlib.sha256(sample_video.encode()).hexdigest()
        snap_hash = hashlib.sha256(sample_snap.encode()).hexdigest()
        import json
        chain = [
            {
                "timestamp": "2026-10-25 18:20:00 UTC",
                "action": "EVIDENCE_CAPTURED",
                "officer_or_agent": "CivicLens AI Vision v2.2",
                "details": "Automated behavioral anomaly flagged on Sector-4 Junction Cam (CAM-DL-001)"
            },
            {
                "timestamp": "2026-10-25 18:22:15 UTC",
                "action": "HUMAN_TRIAGE_VERIFIED",
                "officer_or_agent": "Officer K. Raman (Control Room)",
                "details": "Human review confirmed potential physical altercation. Redacted citizen identifiers."
            },
            {
                "timestamp": "2026-10-25 18:25:00 UTC",
                "action": "TRANSFER_TO_POLICE",
                "officer_or_agent": "CivicLens AI Security Broker",
                "details": "Cryptographically hashed evidence transferred under FIR-2026-DEL-0419 to Cyber Police"
            }
        ]
        cursor.execute('''
        INSERT INTO police_evidence_packages (
            id, incident_report_id, detection_id, case_number, title, category,
            incident_timestamp, location_name, latitude, longitude, camera_code,
            video_clip_url, video_hash_sha256, snapshot_url, snapshot_hash_sha256,
            chain_of_custody_log, officer_badge_id, assigned_police_dept, case_status, classification_level,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        ''', (
            "EVD-DEMO-001",
            "INC-DL-001",
            "EVT-DEMO-001",
            "FIR-2026-DEL-0419",
            "Potential Physical Altercation & Roadway Endangerment",
            "assault_violence",
            "Sector 4 Junction, Outer Ring Road",
            28.6139,
            77.2090,
            "CAM-DL-001",
            sample_video,
            vid_hash,
            sample_snap,
            snap_hash,
            json.dumps(chain),
            "DL-CYBER-8842",
            "Cyber Crime & Video Surveillance Division",
            "submitted_to_police",
            "Restricted"
        ))

    conn.commit()
    conn.close()
    print(f"Finished {db_path}")

def migrate():
    migrate_file('civiclens.db')
    migrate_file('apps/api/civiclens.db')

if __name__ == '__main__':
    migrate()
