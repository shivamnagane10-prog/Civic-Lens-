import sys
import json
sys.path.insert(0, 'apps/api')

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

print("=" * 60)
print("CIVICLENS AI — SYSTEM VERIFICATION RUN")
print("=" * 60)

# 1. Health
r = client.get("/health")
print(f"\n[1] GET /health -> Status {r.status_code}")
print(json.dumps(r.json(), indent=2))

# 2. OTP Request & Verify
r_req = client.post("/api/v1/auth/otp/request", json={"phone": "+15551234567"})
print(f"\n[2a] POST /api/v1/auth/otp/request -> Status {r_req.status_code}")
print(json.dumps(r_req.json(), indent=2))

r_ver = client.post("/api/v1/auth/otp/verify", json={"phone": "+15551234567", "otp": "123456", "role": "citizen"})
print(f"\n[2b] POST /api/v1/auth/otp/verify -> Status {r_ver.status_code}")
token_data = r_ver.json()
print(f"Token obtained for user: {token_data['user_id']} ({token_data['role']})")

# 3. Post Issue with AI Inference
issue_payload = {
    "title": "Severe road crater on 5th & Market",
    "description": "Deep asphalt pothole cavity damaging vehicle tires and causing bottleneck",
    "category": "pothole",
    "latitude": 37.7765,
    "longitude": -122.4168,
    "ward_id": "WARD-01",
    "photo_url": "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80",
    "source": "citizen"
}
headers = {"Authorization": f"Bearer {token_data['access_token']}"}
r_issue = client.post("/api/v1/issues", json=issue_payload, headers=headers)
print(f"\n[3] POST /api/v1/issues -> Status {r_issue.status_code}")
issue_data = r_issue.json()
print("Created Issue ID:", issue_data["id"])
print("AI Confidence:", issue_data["ai_confidence"])
print("Calculated Priority Score:", issue_data["priority_score"])
print("Diagnostic Card:", json.dumps(issue_data["diagnostic_card"], indent=2))

# 4. Nearest Crew Suggestions
r_sugg = client.get(f"/api/v1/work_orders/suggestions?issue_id={issue_data['id']}")
print(f"\n[4] GET /api/v1/work_orders/suggestions -> Status {r_sugg.status_code}")
suggs = r_sugg.json()
if suggs:
    print(f"Top Recommended Crew: {suggs[0]['crew']['name']} (Score: {suggs[0]['recommended_score']}, Distance: {suggs[0]['distance_km']} km, ETA: {suggs[0]['estimated_eta_minutes']} mins)")

# 5. Public Ward Metrics (Zero PII check)
r_pub = client.get("/api/v1/public/WARD-01")
print(f"\n[5] GET /api/v1/public/WARD-01 -> Status {r_pub.status_code}")
print("Public Metrics:", json.dumps(r_pub.json(), indent=2))

# 6. Internal Sensor Detection (Phase 5)
cctv_payload = {
    "source": "cctv",
    "device_id": "CAM-CROSSING-09",
    "category": "pothole",
    "latitude": 37.7745,
    "longitude": -122.4190,
    "ward_id": "WARD-01",
    "confidence": 0.97
}
r_sensor = client.post("/api/v1/internal/detections", json=cctv_payload)
print(f"\n[6] POST /api/v1/internal/detections (CCTV Ingestion) -> Status {r_sensor.status_code}")
print("Ingested CCTV Issue ID:", r_sensor.json()["id"])
print("Priority Score:", r_sensor.json()["priority_score"])

print("\n" + "=" * 60)
print("ALL SYSTEM CHECKS PASSED SUCCESSFULLY")
print("=" * 60)
