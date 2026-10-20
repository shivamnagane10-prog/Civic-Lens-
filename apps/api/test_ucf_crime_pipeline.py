import json
import urllib.request
import urllib.error

BASE_URL = "http://localhost:8000/api/v1"

def test_ucf_pipeline():
    print("==================================================")
    print("Testing UCF-Crime Surveillance Dataset Integration")
    print("==================================================")

    # 1. Dataset Info
    req = urllib.request.Request(f"{BASE_URL}/cctv/dataset/ucf-crime")
    with urllib.request.urlopen(req) as resp:
        info = json.loads(resp.read().decode())
        print(f"[1] Dataset Info loaded: {info['name']}")
        print(f"    Authors: {info['authors']} ({info['conference']})")
        print(f"    Total videos: {info['total_videos']}, Total classes: {info['total_classes']}")
        print(f"    Primary URL: {info['primary_download_url']} ({info['size_gb']} GB)")
        print(f"    Dropbox Mirror: {info['parts_download_url']}")
        assert info['total_videos'] == 1900
        assert info['total_classes'] == 14

    # 2. Benchmark Videos List
    req = urllib.request.Request(f"{BASE_URL}/cctv/dataset/ucf-crime/videos")
    with urllib.request.urlopen(req) as resp:
        videos = json.loads(resp.read().decode())
        print(f"[2] UCF-Crime Benchmark Clips Indexed: {len(videos)}")
        assert len(videos) >= 7

    # 3. Filter by Category
    req = urllib.request.Request(f"{BASE_URL}/cctv/dataset/ucf-crime/videos?category=RoadAccidents")
    with urllib.request.urlopen(req) as resp:
        road_vids = json.loads(resp.read().decode())
        print(f"[3] RoadAccidents clips: {len(road_vids)}")
        assert len(road_vids) >= 1
        sample_road = road_vids[0]
        print(f"    Sample: {sample_road['video_name']} (Anomaly Frames {sample_road['anomaly_start_frame']} - {sample_road['anomaly_end_frame']})")

    # 4. Run AI Inference on UCF Clip
    req = urllib.request.Request(
        f"{BASE_URL}/cctv/dataset/ucf-crime/{sample_road['id']}/run-inference",
        data=b"{}",
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        inf_res = json.loads(resp.read().decode())
        print(f"[4] AI Temporal Inference on {inf_res['video_name']}: Status -> {inf_res['status']}")
        print(f"    Ground Truth: {inf_res['ground_truth_class']}")
        print(f"    AI Detected: {inf_res['ai_prediction']['event_type']} (Confidence: {inf_res['ai_prediction']['confidence']})")
        print(f"    Temporal Overlap Accuracy: {inf_res['ai_prediction']['temporal_overlap_accuracy']}")

    # 5. Import UCF Clip into Camera Timeline
    req_cam = urllib.request.Request(f"{BASE_URL}/cctv/cameras")
    with urllib.request.urlopen(req_cam) as resp:
        cams = json.loads(resp.read().decode())
        cam_id = cams[0]['id']

    req_import = urllib.request.Request(
        f"{BASE_URL}/cctv/dataset/ucf-crime/UCF-ASSAULT-011/import-as-recording?camera_id={cam_id}",
        data=b"{}",
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req_import) as resp:
        imp_res = json.loads(resp.read().decode())
        print(f"[5] Imported UCF-Crime clip into {cam_id}: Recording #{imp_res['recording_id']}")
        assert imp_res['status'] == "success"

    print("==================================================")
    print("ALL 5 UCF-CRIME PIPELINE TESTS PASSED!")
    print("==================================================")

if __name__ == "__main__":
    test_ucf_pipeline()
