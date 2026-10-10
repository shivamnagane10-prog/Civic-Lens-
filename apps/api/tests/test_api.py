import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

def test_auth_otp_flow():
    # 1. Request OTP
    req = client.post("/api/v1/auth/otp/request", json={"phone": "+15559990000"})
    assert req.status_code == 200
    assert req.json()["success"] is True

    # 2. Verify OTP
    ver = client.post("/api/v1/auth/otp/verify", json={"phone": "+15559990000", "otp": "123456", "role": "citizen"})
    assert ver.status_code == 200
    data = ver.json()
    assert "access_token" in data
    assert data["role"] == "citizen"

def test_official_login():
    res = client.post("/api/v1/auth/login", json={"phone": "+15551112222", "role": "admin"})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "admin"

def test_issue_creation_and_ai_classification():
    payload = {
        "title": "Gushing water pipe crack",
        "description": "Clean potable water leaking onto street corner",
        "category": "water_leak",
        "severity": "critical",
        "latitude": 37.7749,
        "longitude": -122.4194,
        "ward_id": "WARD-01",
        "source": "citizen"
    }
    res = client.post("/api/v1/issues", json=payload)
    assert res.status_code == 201
    issue = res.json()
    assert issue["category"] == "water_leak"
    assert issue["priority_score"] >= 80.0
    assert issue["diagnostic_card"] is not None
    assert issue["diagnostic_card"]["is_estimate"] is True
    assert "recommended_fix" in issue["diagnostic_card"]

def test_list_and_get_issues():
    res = client.get("/api/v1/issues")
    assert res.status_code == 200
    issues = res.json()
    assert len(issues) > 0
    first_id = issues[0]["id"]

    detail = client.get(f"/api/v1/issues/{first_id}")
    assert detail.status_code == 200
    assert detail.json()["id"] == first_id

def test_update_issue_status():
    res = client.get("/api/v1/issues")
    first_id = res.json()[0]["id"]

    update = client.patch(f"/api/v1/issues/{first_id}/status", json={
        "status": "in_progress",
        "comment": "Dispatched maintenance crew to site",
        "actor_role": "admin"
    })
    assert update.status_code == 200
    assert update.json()["status"] == "in_progress"

def test_public_ward_metrics_no_pii():
    res = client.get("/api/v1/public/WARD-DL-01")
    assert res.status_code == 200
    data = res.json()
    assert "total_issues" in data
    assert "resolved_issues" in data
    # Ensure no PII fields
    assert "reporter_phone" not in data
    assert "crew" not in data
    assert "latitude" not in data

def test_crew_suggestions():
    res = client.get("/api/v1/issues")
    first_id = res.json()[0]["id"]

    sugg = client.get(f"/api/v1/work_orders/suggestions?issue_id={first_id}")
    assert sugg.status_code == 200
    suggestions = sugg.json()
    assert len(suggestions) > 0
    assert "distance_km" in suggestions[0]
    assert "estimated_eta_minutes" in suggestions[0]

def test_internal_detection_ingestion():
    payload = {
        "source": "cctv",
        "device_id": "CAM-JUNCTION-9",
        "category": "pothole",
        "latitude": 37.773,
        "longitude": -122.417,
        "ward_id": "WARD-01",
        "confidence": 0.96
    }
    res = client.post("/api/v1/internal/detections", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["source"] == "cctv"
    assert data["ai_confidence"] == 0.96
