import os
import cv2
import numpy as np

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

def generate_cctv_clip(
    filename: str,
    title: str,
    camera_code: str,
    event_type: str,
    color_scheme: str,
    duration_secs: int = 12,
    fps: int = 20
):
    path = os.path.join(UPLOAD_DIR, filename)
    if os.path.exists(path) and os.path.getsize(path) > 10000:
        return path

    width, height = 1280, 720
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(path, fourcc, float(fps), (width, height))

    total_frames = duration_secs * fps

    for f_idx in range(total_frames):
        img = np.zeros((height, width, 3), dtype=np.uint8)

        # Baseline environmental background
        if color_scheme == "night":
            img[:320] = [20, 22, 28]    # Night sky
            img[320:] = [28, 30, 35]    # Dark road
            # Streetlight ambient cone
            cv2.ellipse(img, (640, 200), (380, 500), 0, 0, 180, (40, 50, 65), -1)
        elif color_scheme == "rain":
            img[:320] = [80, 90, 100]   # Overcast sky
            img[320:] = [45, 50, 55]    # Wet roadway
            # Rain streaks
            for _ in range(80):
                rx = (f_idx * 17 + np.random.randint(0, width)) % width
                ry = (f_idx * 23 + np.random.randint(0, height)) % height
                cv2.line(img, (rx, ry), (rx - 4, ry + 12), (180, 190, 200), 1)
        else: # daytime
            img[:320] = [170, 140, 110] # Daytime skyline
            img[320:] = [42, 45, 50]    # Gray asphalt road

        # Road perspective markings
        cv2.line(img, (0, 700), (450, 320), (200, 200, 200), 2)
        cv2.line(img, (width, 700), (830, 320), (200, 200, 200), 2)
        # Center dashed line
        if (f_idx // 4) % 2 == 0:
            cv2.line(img, (640, 480), (640, 580), (255, 255, 255), 4)

        # Specific Category Dynamic Visuals
        progress = f_idx / total_frames

        if "traffic" in event_type:
            # Vehicles moving and queueing
            v1_x = int(300 + min(progress * 150, 80))
            cv2.rectangle(img, (v1_x, 460), (v1_x + 160, 540), (60, 80, 160), -1) # Bus
            cv2.putText(img, "BUS [SLOW]", (v1_x + 10, 505), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            v2_x = int(v1_x + 180)
            cv2.rectangle(img, (v2_x, 480), (v2_x + 110, 540), (200, 60, 40), -1) # Car
            # Pedestrians
            cv2.circle(img, (220, 430), 12, (200, 180, 150), -1)

        elif "garbage" in event_type:
            # Garbage pile accumulating on sidewalk
            cv2.rectangle(img, (820, 480), (1050, 620), (35, 75, 45), -1) # Waste cluster
            for bx in range(840, 1030, 35):
                cv2.circle(img, (bx, 550 + (bx % 25)), 22, (20, 90, 60), -1) # Plastic bags
            cv2.rectangle(img, (1060, 430), (1140, 560), (40, 120, 180), -1) # Overflowing bin

        elif "waterlogging" in event_type:
            # Standing water pool with reflections
            cv2.ellipse(img, (480, 560), (int(220 + progress * 40), 90), 0, 0, 360, (110, 95, 60), -1)
            cv2.putText(img, "WATERLOGGED REGION (~18cm DEPTH)", (320, 565), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (240, 240, 240), 1)

        elif "damage" in event_type or "pothole" in event_type:
            # Deep pothole fissure
            cv2.ellipse(img, (580, 540), (110, 55), 10, 0, 360, (15, 15, 18), -1)
            cv2.ellipse(img, (580, 540), (118, 62), 10, 0, 360, (90, 85, 80), 3) # Fractured edge
            cv2.putText(img, "ASPHALT CAVITY FISSURE", (470, 545), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)

        elif "assault" in event_type:
            # High kinetic opposing motion vectors (struggle)
            p1_x = int(600 + np.sin(f_idx * 1.2) * 25)
            p2_x = int(670 - np.sin(f_idx * 1.2) * 20)
            cv2.circle(img, (p1_x, 430), 20, (50, 120, 220), -1)
            cv2.rectangle(img, (p1_x - 15, 450), (p1_x + 15, 540), (50, 120, 220), -1)
            cv2.circle(img, (p2_x, 430), 20, (220, 70, 50), -1)
            cv2.rectangle(img, (p2_x - 15, 450), (p2_x + 15, 540), (220, 70, 50), -1)
            # Kinetic motion lines
            cv2.line(img, (p1_x + 15, 460), (p2_x - 10, 465), (0, 0, 255), 3)

        elif "forced_movement" in event_type:
            # Coercive directional displacement toward vehicle
            dx = int(f_idx * 3.5)
            # Vehicle
            cv2.rectangle(img, (920, 460), (1150, 560), (30, 35, 40), -1)
            # Two figures moving together with resistance posture
            cv2.circle(img, (400 + dx, 440), 18, (180, 60, 60), -1)
            cv2.rectangle(img, (385 + dx, 460), (415 + dx, 540), (180, 60, 60), -1)
            cv2.circle(img, (440 + dx, 440), 18, (60, 140, 180), -1)
            cv2.rectangle(img, (425 + dx, 460), (455 + dx, 540), (60, 140, 180), -1)
            # Wrist grip connection
            cv2.line(img, (415 + dx, 480), (430 + dx, 480), (0, 0, 255), 4)

        elif "sensitive" in event_type or "sexual" in event_type:
            # Isolated shadowed corner struggle
            cv2.rectangle(img, (780, 400), (960, 580), (20, 22, 28), -1) # Shadow zone
            cv2.circle(img, (850, 440), 18, (160, 100, 160), -1)
            cv2.rectangle(img, (835, 460), (865, 540), (160, 100, 160), -1)
            cv2.putText(img, "RESTRICTED SAFEGUARDING ZONE", (760, 385), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (160, 80, 200), 1)

        elif "collapse" in event_type or "fall" in event_type:
            # Pedestrian vertical drop
            drop_y = int(430 + min(f_idx * 5, 120))
            if drop_y >= 540:
                # Recumbent on sidewalk
                cv2.ellipse(img, (600, 550), (45, 18), 0, 0, 360, (200, 160, 80), -1)
            else:
                cv2.circle(img, (600, drop_y), 18, (200, 160, 80), -1)
                cv2.rectangle(img, (585, drop_y + 18), (615, drop_y + 70), (200, 160, 80), -1)

        # Standard CCTV Top Banner HUD
        cv2.rectangle(img, (0, 0), (width, 40), (15, 23, 42), -1)
        cv2.line(img, (0, 40), (width, 40), (51, 65, 85), 2)
        cv2.putText(img, f"CIVICLENS CCTV LIVE | {camera_code} | {title.upper()}", (16, 26), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1, cv2.LINE_AA)
        
        # Real-time ticking timecode
        elapsed_sec = f_idx // fps
        ms = (f_idx % fps) * 50
        timecode = f"REC 2026-10-22 14:{elapsed_sec:02d}:{ms:02d} | 20.0 FPS"
        (tw, _), _ = cv2.getTextSize(timecode, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
        cv2.putText(img, timecode, (width - tw - 16, 26), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (100, 220, 255), 1, cv2.LINE_AA)

        out.write(img)

    out.release()
    return path


def ensure_all_demo_videos():
    clips = [
        ("demo_traffic_safety.mp4", "Connaught Place Traffic & Congestion", "CAM-DEL-CP01", "traffic_congestion", "daytime"),
        ("demo_garbage_waste.mp4", "Hill Road Waste & Refuse Cluster", "CAM-BOM-HR01", "garbage_waste", "daytime"),
        ("demo_waterlogging_flood.mp4", "FC Road Storm Drainage Waterlogging", "CAM-PUN-FC01", "waterlogging_drainage", "rain"),
        ("demo_road_damage.mp4", "Janpath Road Asphalt Pothole Cavity", "CAM-DEL-JP02", "road_damage_pothole", "daytime"),
        ("demo_assault_violence.mp4", "Indiranagar Night Walkway Altercation", "CAM-BLR-IN01", "assault_violence", "night"),
        ("demo_forced_movement.mp4", "Carter Road Transit Forced Movement", "CAM-BOM-CR02", "forced_movement", "night"),
        ("demo_sensitive_incident.mp4", "Commercial Corridor Safeguarding Zone", "CAM-BOM-HR01", "sensitive_incident", "night"),
        ("demo_pedestrian_collapse.mp4", "Transit Sidewalk Pedestrian Collapse", "CAM-DEL-CP01", "pedestrian_collapse", "daytime"),
    ]
    created = []
    for fname, title, ccode, etype, cscheme in clips:
        p = generate_cctv_clip(fname, title, ccode, etype, cscheme)
        created.append(p)
    return created

if __name__ == "__main__":
    paths = ensure_all_demo_videos()
    print(f"Generated {len(paths)} demonstration CCTV video clips in uploads/")
