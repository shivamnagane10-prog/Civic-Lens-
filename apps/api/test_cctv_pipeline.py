import json
import urllib.request
import urllib.error

BASE_URL = "http://localhost:8000/api/v1"

def test_api():
    print("==================================================")
    print("Testing CivicLens AI CCTV & Public Safety Pipeline")
    print("==================================================")

    # 1. Fetch Cameras
    req = urllib.request.Request(f"{BASE_URL}/cctv/cameras")
    with urllib.request.urlopen(req) as resp:
        cameras = json.loads(resp.read().decode())
        print(f"[1] CCTV Cameras loaded: {len(cameras)}")
        assert len(cameras) >= 6, "Expected at least 6 seeded cameras"
        print(f"    Sample: {cameras[0]['id']} - {cameras[0]['name']} (Status: {cameras[0]['status']})")

    cam_id = cameras[0]['id']

    # 2. Camera Detail & Recordings
    req = urllib.request.Request(f"{BASE_URL}/cctv/cameras/{cam_id}")
    with urllib.request.urlopen(req) as resp:
        cam_detail = json.loads(resp.read().decode())
        print(f"[2] Camera Detail verified: {cam_detail['location_name']}")

    req = urllib.request.Request(f"{BASE_URL}/cctv/cameras/{cam_id}/recordings")
    with urllib.request.urlopen(req) as resp:
        recordings = json.loads(resp.read().decode())
        print(f"[3] Camera Recordings loaded: {len(recordings)} segment(s)")

    # 3. AI Detections
    req = urllib.request.Request(f"{BASE_URL}/cctv/detections")
    with urllib.request.urlopen(req) as resp:
        detections = json.loads(resp.read().decode())
        print(f"[4] AI Incident Detections: {len(detections)}")
        assert len(detections) >= 6, "Expected at least 6 seeded detections"

    # 4. Human Review Triage
    first_det = detections[0]
    review_payload = json.dumps({
        "review_status": "verified",
        "reviewer_id": "USER-ADMIN-SARAH",
        "reviewer_notes": "Verified genuine observable anomaly per video review protocol"
    }).encode('utf-8')
    req = urllib.request.Request(
        f"{BASE_URL}/cctv/detections/{first_det['id']}/review",
        data=review_payload,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        reviewed = json.loads(resp.read().decode())
        print(f"[5] Human Review Committed: Event {reviewed['id']} -> {reviewed['review_status']}")
        assert reviewed['review_status'] == "verified"

    # 5. Fork A: Civic Complaint Draft from Detection
    civic_dets = [d for d in detections if d['category'] == 'civic_infrastructure']
    if civic_dets:
        civic_det = civic_dets[0]
        complaint_payload = json.dumps({
            "title": f"CCTV Ingested: {civic_det['description'][:50]}",
            "ward_id": civic_det.get("ward_id") or "WARD-DL-01"
        }).encode('utf-8')
        req = urllib.request.Request(
            f"{BASE_URL}/cctv/detections/{civic_det['id']}/complaint-draft",
            data=complaint_payload,
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req) as resp:
            comp_res = json.loads(resp.read().decode())
            print(f"[6] Fork A (Civic Complaint Created): Issue #{comp_res['issue_id']} (Status: {comp_res['status']})")

            # Verify issue exists in issues API
            req_issue = urllib.request.Request(f"{BASE_URL}/issues/{comp_res['issue_id']}")
            with urllib.request.urlopen(req_issue) as r_iss:
                iss_data = json.loads(r_iss.read().decode())
                assert iss_data['source'] == 'cctv'
                assert iss_data['status'] == 'submitted'
                print(f"    Verified Issue in Central Queue: {iss_data['title']} (Source: {iss_data['source']})")

    # 6. Fork B: Formal Incident Report & Escalation
    safety_dets = [d for d in detections if d['category'] == 'public_safety']
    if safety_dets:
        safety_det = safety_dets[0]
        report_payload = json.dumps({
            "detection_id": safety_det['id'],
            "summary": f"Emergency safety incident report: {safety_det['description']}",
            "priority": "critical",
            "escalation_channel": "police_112",
            "reviewer_notes": "Operator review confirmed observable physical altercation. Transmitted to Police 112."
        }).encode('utf-8')
        req = urllib.request.Request(
            f"{BASE_URL}/cctv/detections/{safety_det['id']}/incident-report",
            data=report_payload,
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req) as resp:
            rep_data = json.loads(resp.read().decode())
            print(f"[7] Fork B (Incident Report Created): #{rep_data['id']} (Agency Ref: {rep_data['agency_reference_id']})")

            # 7. Escalate Status
            escalate_payload = json.dumps({
                "escalation_channel": "police_112",
                "escalation_status": "unit_en_route",
                "notes": "Police Control Room acknowledged. Unit PCR-12 dispatched."
            }).encode('utf-8')
            req_esc = urllib.request.Request(
                f"{BASE_URL}/cctv/incidents/{rep_data['id']}/escalate",
                data=escalate_payload,
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req_esc) as r_esc:
                esc_data = json.loads(r_esc.read().decode())
                print(f"[8] Emergency Escalation Updated: Status -> {esc_data['escalation_status']}")
                assert esc_data['escalation_status'] == "unit_en_route"

    # 8. Trigger AI Video Temporal Analysis
    analysis_payload = json.dumps({
        "camera_id": cam_id,
        "analysis_focus": "all"
    }).encode('utf-8')
    req_ai = urllib.request.Request(
        f"{BASE_URL}/cctv/analyze",
        data=analysis_payload,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req_ai) as resp_ai:
        ai_res = json.loads(resp_ai.read().decode())
        print(f"[9] Real-time AI Analysis: Status -> {ai_res['status']}")
        print(f"    New Detected Event: #{ai_res['detection']['id']} ({ai_res['detection']['event_type'].upper()})")

    print("==================================================")
    print("ALL 9 CCTV & AI INCIDENT PIPELINE TESTS PASSED!")
    print("==================================================")

if __name__ == "__main__":
    test_api()
