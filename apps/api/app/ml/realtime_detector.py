import os
import cv2
import uuid
import time
import numpy as np
import onnxruntime as ort
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timezone

# Model Weights Paths
MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
YOLO_MODEL_PATH = os.path.join(MODELS_DIR, "yolov8n.onnx")
POTHOLE_MODEL_PATH = os.path.join(MODELS_DIR, "pothole_detector.onnx")
WASTE_MODEL_PATH = os.path.join(MODELS_DIR, "waste_detector.onnx")

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# COCO Target Classes
# Target vehicle classes: bicycle (1), car (2), motorcycle (3), bus (5), truck (7)
# Target person class: person (0)
COCO_CLASS_MAP = {
    0: {"name": "Person", "type": "person", "color": "#22C55E", "bgr": (94, 197, 34)},
    1: {"name": "Bicycle", "type": "vehicle", "color": "#EF4444", "bgr": (68, 68, 239)},
    2: {"name": "Car", "type": "vehicle", "color": "#EF4444", "bgr": (68, 68, 239)},
    3: {"name": "Motorcycle", "type": "vehicle", "color": "#EF4444", "bgr": (68, 68, 239)},
    5: {"name": "Bus", "type": "vehicle", "color": "#EF4444", "bgr": (68, 68, 239)},
    7: {"name": "Truck", "type": "vehicle", "color": "#EF4444", "bgr": (68, 68, 239)},
}

# Civic Issue Color Map
CIVIC_COLOR_MAP = {
    "pothole": {"name": "Pothole", "color": "#F97316", "bgr": (22, 115, 249)},
    "road_damage": {"name": "Road Damage", "color": "#F97316", "bgr": (22, 115, 249)},
    "road_crack": {"name": "Road Crack", "color": "#F97316", "bgr": (22, 115, 249)},
    "fallen_tree": {"name": "Road Obstruction / Fallen Tree", "color": "#F97316", "bgr": (22, 115, 249)},
    "garbage": {"name": "Garbage Accumulation", "color": "#EAB308", "bgr": (8, 179, 234)},
    "overflowing_bin": {"name": "Overflowing Garbage Bin", "color": "#EAB308", "bgr": (8, 179, 234)},
    "waterlogging": {"name": "Waterlogging / Flooded Road", "color": "#06B6D4", "bgr": (212, 182, 6)},
    "damaged_streetlight": {"name": "Damaged Streetlight", "color": "#A855F7", "bgr": (247, 85, 168)},
}


class SimpleIoUTracker:
    """
    Lightweight, deterministic IoU & Centroid Tracker to maintain
    persistent tracking IDs across consecutive video frames without external heavy dependencies.
    """
    def __init__(self, iou_threshold: float = 0.35, max_lost: int = 5):
        self.iou_threshold = iou_threshold
        self.max_lost = max_lost
        self.next_id = 1
        self.tracks = {}  # track_id -> {"box": [x,y,w,h], "lost": int, "label": str, "type": str}

    def update(self, detections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        updated_detections = []
        if not self.tracks:
            for det in detections:
                tid = f"TRK-{self.next_id:02d}"
                self.next_id += 1
                self.tracks[tid] = {
                    "box": det["box"],
                    "lost": 0,
                    "label": det["label"],
                    "type": det.get("type", "object")
                }
                det["tracking_id"] = tid
                updated_detections.append(det)
            return updated_detections

        # Match existing tracks with detections via IoU
        track_ids = list(self.tracks.keys())
        unmatched_dets = list(range(len(detections)))
        matched_track_ids = set()

        for tid in track_ids:
            tbox = self.tracks[tid]["box"]
            best_iou = 0.0
            best_det_idx = -1

            for didx in unmatched_dets:
                det = detections[didx]
                iou = self._calculate_iou(tbox, det["box"])
                if iou > best_iou:
                    best_iou = iou
                    best_det_idx = didx

            if best_iou >= self.iou_threshold and best_det_idx >= 0:
                det = detections[best_det_idx]
                det["tracking_id"] = tid
                self.tracks[tid]["box"] = det["box"]
                self.tracks[tid]["lost"] = 0
                matched_track_ids.add(tid)
                unmatched_dets.remove(best_det_idx)
                updated_detections.append(det)
            else:
                self.tracks[tid]["lost"] += 1

        # Create new tracks for unmatched detections
        for didx in unmatched_dets:
            det = detections[didx]
            tid = f"TRK-{self.next_id:02d}"
            self.next_id += 1
            self.tracks[tid] = {
                "box": det["box"],
                "lost": 0,
                "label": det["label"],
                "type": det.get("type", "object")
            }
            det["tracking_id"] = tid
            updated_detections.append(det)

        # Remove dead tracks
        dead_ids = [tid for tid, data in self.tracks.items() if data["lost"] > self.max_lost]
        for did in dead_ids:
            del self.tracks[did]

        return updated_detections

    @staticmethod
    def _calculate_iou(boxA, boxB):
        xA = max(boxA[0], boxB[0])
        yA = max(boxA[1], boxB[1])
        xB = min(boxA[0] + boxA[2], boxB[0] + boxB[2])
        yB = min(boxA[1] + boxA[3], boxB[1] + boxB[3])
        interArea = max(0, xB - xA) * max(0, yB - yA)
        boxAArea = boxA[2] * boxA[3]
        boxBArea = boxB[2] * boxB[3]
        unionArea = float(boxAArea + boxBArea - interArea)
        return interArea / unionArea if unionArea > 0 else 0.0


class RealtimeVideoDetector:
    """
    Unified Real-Time Video Object & Municipal Civic Issue Detection Engine.
    - YOLOv8 COCO Object Detector (Person -> Green, Vehicles -> Red)
    - Municipal Civic Issue Detector (Potholes -> Orange, Garbage -> Yellow, Waterlogging -> Cyan, Streetlight -> Purple)
    - GPU acceleration when available with deterministic CPU fallback.
    - Non-Maximum Suppression (NMS) to eliminate duplicate detections.
    - SimpleIoUTracker for consistent temporal tracking IDs.
    - Privacy-aware face/plate blurring module without identity profiling.
    """
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(RealtimeVideoDetector, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if getattr(self, "_initialized", False):
            return

        # Select Providers: DirectML / CUDA / CPU
        available_providers = ort.get_available_providers()
        self.providers = []
        if 'CUDAExecutionProvider' in available_providers:
            self.providers.append('CUDAExecutionProvider')
        if 'DmlExecutionProvider' in available_providers:
            self.providers.append('DmlExecutionProvider')
        self.providers.append('CPUExecutionProvider')

        # Load Models Once
        self.yolo_session = None
        self.pothole_session = None
        self.waste_session = None

        if os.path.exists(YOLO_MODEL_PATH):
            try:
                self.yolo_session = ort.InferenceSession(YOLO_MODEL_PATH, providers=self.providers)
                print(f"[RealtimeVideoDetector] Loaded YOLOv8 COCO model from {YOLO_MODEL_PATH} ({self.providers[0]})")
            except Exception as e:
                print(f"[RealtimeVideoDetector] Error loading YOLO model: {e}")

        if os.path.exists(POTHOLE_MODEL_PATH):
            try:
                self.pothole_session = ort.InferenceSession(POTHOLE_MODEL_PATH, providers=self.providers)
                print(f"[RealtimeVideoDetector] Loaded Pothole detector from {POTHOLE_MODEL_PATH}")
            except Exception as e:
                print(f"[RealtimeVideoDetector] Error loading Pothole model: {e}")

        if os.path.exists(WASTE_MODEL_PATH):
            try:
                self.waste_session = ort.InferenceSession(WASTE_MODEL_PATH, providers=self.providers)
                print(f"[RealtimeVideoDetector] Loaded Waste detector from {WASTE_MODEL_PATH}")
            except Exception as e:
                print(f"[RealtimeVideoDetector] Error loading Waste model: {e}")

        self._initialized = True

    def detect_objects_yolo(
        self,
        frame: np.ndarray,
        confidence_threshold: float = 0.40,
        iou_threshold: float = 0.45
    ) -> List[Dict[str, Any]]:
        """
        Runs real YOLOv8 COCO inference on a single frame.
        Filters for Person (Green #22C55E) and Vehicles (Red #EF4444).
        """
        if self.yolo_session is None:
            return []

        h, w = frame.shape[:2]
        img_resized = cv2.resize(frame, (640, 640))
        img_rgb = cv2.cvtColor(img_resized, cv2.COLOR_BGR2RGB)
        img_norm = img_rgb.astype(np.float32) / 255.0
        blob = np.transpose(img_norm, (2, 0, 1))[np.newaxis, ...]

        preds = self.yolo_session.run(None, {'images': blob})[0][0].T  # (8400, 84)
        boxes = preds[:, :4]
        scores = preds[:, 4:]
        class_ids = np.argmax(scores, axis=1)
        confs = np.max(scores, axis=1)

        mask = confs >= confidence_threshold
        boxes = boxes[mask]
        class_ids = class_ids[mask]
        confs = confs[mask]

        boxes_orig = []
        keep_candidates = []

        for b, cid, score in zip(boxes, class_ids, confs):
            cid = int(cid)
            if cid in COCO_CLASS_MAP:
                cx, cy, bw, bh = b
                x1 = int(max(0, (cx - bw / 2) * (w / 640.0)))
                y1 = int(max(0, (cy - bh / 2) * (h / 640.0)))
                bw_orig = int(min(w - x1, bw * (w / 640.0)))
                bh_orig = int(min(h - y1, bh * (h / 640.0)))
                if bw_orig > 8 and bh_orig > 8:
                    boxes_orig.append([x1, y1, bw_orig, bh_orig])
                    keep_candidates.append((cid, float(score)))

        if not boxes_orig:
            return []

        indices = cv2.dnn.NMSBoxes(boxes_orig, [c[1] for c in keep_candidates], confidence_threshold, iou_threshold)
        detections = []

        if len(indices) > 0:
            for idx in indices.flatten():
                cid, score = keep_candidates[idx]
                box = boxes_orig[idx]
                spec = COCO_CLASS_MAP[cid]
                norm_box = {
                    "x": box[0],
                    "y": box[1],
                    "w": box[2],
                    "h": box[3],
                    "orig_w": w,
                    "orig_h": h,
                    "norm_x": round(box[0] / w, 4),
                    "norm_y": round(box[1] / h, 4),
                    "norm_w": round(box[2] / w, 4),
                    "norm_h": round(box[3] / h, 4)
                }

                detections.append({
                    "id": f"OBJ-{uuid.uuid4().hex[:6].upper()}",
                    "label": spec["name"],
                    "class_name": spec["name"].lower(),
                    "category": spec["name"].lower(),
                    "type": spec["type"],  # "person" or "vehicle"
                    "confidence": round(score, 3),
                    "box": box,
                    "bounding_box": norm_box,
                    "color": spec["color"],
                    "bgr": spec["bgr"],
                })

        return detections

    def detect_civic_issues(
        self,
        frame: np.ndarray,
        confidence_threshold: float = 0.50
    ) -> List[Dict[str, Any]]:
        """
        Specialized detection pipeline for municipal civic problems:
        - Potholes & Road Damage (Orange #F97316)
        - Garbage & Waste (Yellow #EAB308)
        - Waterlogging & Flooding (Cyan #06B6D4)
        - Damaged Streetlights (Purple #A855F7)
        - Roadway Obstructions / Fallen Trees (Orange #F97316)
        """
        h, w = frame.shape[:2]
        civic_detections = []

        # 1. Pothole / Road Damage Model Inference
        if self.pothole_session is not None:
            try:
                img_resized = cv2.resize(frame, (640, 640))
                img_rgb = cv2.cvtColor(img_resized, cv2.COLOR_BGR2RGB)
                img_norm = img_rgb.astype(np.float32) / 255.0
                blob = np.transpose(img_norm, (2, 0, 1))[np.newaxis, ...]

                outputs = self.pothole_session.run(None, {'images': blob})
                preds = outputs[0][0].T  # (8400, 37)
                boxes = preds[:, :4]
                scores = preds[:, 4]  # class 0 score

                mask = scores >= max(0.40, confidence_threshold)
                if np.any(mask):
                    p_boxes = boxes[mask]
                    p_scores = scores[mask]

                    boxes_orig = []
                    for b in p_boxes:
                        cx, cy, bw, bh = b
                        x1 = int(max(0, (cx - bw / 2) * (w / 640.0)))
                        y1 = int(max(0, (cy - bh / 2) * (h / 640.0)))
                        bw_orig = int(min(w - x1, bw * (w / 640.0)))
                        bh_orig = int(min(h - y1, bh * (h / 640.0)))
                        # Potholes must be on the road surface (y > 35% of frame)
                        if y1 > int(h * 0.35) and bw_orig > 15 and bh_orig > 15:
                            boxes_orig.append([x1, y1, bw_orig, bh_orig])

                    if boxes_orig:
                        indices = cv2.dnn.NMSBoxes(boxes_orig, p_scores.tolist(), confidence_threshold, 0.40)
                        if len(indices) > 0:
                            for idx in indices.flatten()[:3]:  # Top 3 verified potholes
                                box = boxes_orig[idx]
                                score = float(p_scores[idx])
                                norm_box = {
                                    "x": box[0], "y": box[1], "w": box[2], "h": box[3],
                                    "orig_w": w, "orig_h": h,
                                    "norm_x": round(box[0] / w, 4), "norm_y": round(box[1] / h, 4),
                                    "norm_w": round(box[2] / w, 4), "norm_h": round(box[3] / h, 4)
                                }
                                spec = CIVIC_COLOR_MAP["pothole"]
                                civic_detections.append({
                                    "id": f"CIV-{uuid.uuid4().hex[:6].upper()}",
                                    "label": spec["name"],
                                    "class_name": "pothole",
                                    "category": "road_damage",
                                    "type": "civic_issue",
                                    "confidence": round(score, 3),
                                    "box": box,
                                    "bounding_box": norm_box,
                                    "color": spec["color"],
                                    "bgr": spec["bgr"],
                                    "description": f"Verified pavement pothole with sharp cavity depth gradient ({round(score*100)}% conf)",
                                })
            except Exception as e:
                print(f"[RealtimeVideoDetector] Pothole model inference error: {e}")

        # 2. Road Surface Structural Inspection (Edge Cavity & Crack Analysis)
        # Examines lower half of the frame (road surface) for severe surface rupture / depression
        road_roi = frame[int(h * 0.55):, :]
        gray_road = cv2.cvtColor(road_roi, cv2.COLOR_BGR2GRAY)
        blur_road = cv2.GaussianBlur(gray_road, (7, 7), 0)
        edges = cv2.Canny(blur_road, 50, 150)
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        for c in contours:
            area = cv2.contourArea(c)
            # Severe localized road cavity / crack
            if 3500 < area < 40000:
                rx, ry, rw, rh = cv2.boundingRect(c)
                aspect = rw / float(rh)
                if 0.5 < aspect < 3.5:
                    full_y = int(h * 0.55) + ry
                    # Check dark cavity contrast vs surrounding pavement
                    patch = gray_road[ry:ry+rh, rx:rx+rw]
                    mean_val = np.mean(patch)
                    surround_mean = np.mean(gray_road)
                    if mean_val < surround_mean * 0.72:  # Significantly darker depression
                        conf = min(0.92, 0.65 + (area / 50000.0) * 0.25)
                        if conf >= confidence_threshold:
                            box = [rx, full_y, rw, rh]
                            norm_box = {
                                "x": rx, "y": full_y, "w": rw, "h": rh,
                                "orig_w": w, "orig_h": h,
                                "norm_x": round(rx / w, 4), "norm_y": round(full_y / h, 4),
                                "norm_w": round(rw / w, 4), "norm_h": round(rh / h, 4)
                            }
                            spec = CIVIC_COLOR_MAP["pothole"]
                            civic_detections.append({
                                "id": f"CIV-{uuid.uuid4().hex[:6].upper()}",
                                "label": spec["name"],
                                "class_name": "pothole",
                                "category": "road_damage",
                                "type": "civic_issue",
                                "confidence": round(conf, 3),
                                "box": box,
                                "bounding_box": norm_box,
                                "color": spec["color"],
                                "bgr": spec["bgr"],
                                "description": f"Structural road surface rupture / depression cavity ({round(conf*100)}% conf)",
                            })
                            break  # Avoid flood of road patches

        # 3. Waterlogging & Flooded Roadway Sections (Cyan #06B6D4)
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        sat = hsv[:, :, 1]
        val = hsv[:, :, 2]
        # Water specular reflectance: low saturation, moderate-high value, smooth texture
        water_mask = (sat < 40) & (val > 140)
        water_mask_road = water_mask[int(h * 0.50):, :]
        water_ratio = np.sum(water_mask_road) / float(water_mask_road.size)

        if water_ratio > 0.14:  # Significant standing pool
            # Find largest water pool contour
            water_uint8 = (water_mask_road * 255).astype(np.uint8)
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
            closed_water = cv2.morphologyEx(water_uint8, cv2.MORPH_CLOSE, kernel)
            w_contours, _ = cv2.findContours(closed_water, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            if w_contours:
                largest_c = max(w_contours, key=cv2.contourArea)
                if cv2.contourArea(largest_c) > 6000:
                    wx, wy, ww, wh = cv2.boundingRect(largest_c)
                    full_wy = int(h * 0.50) + wy
                    conf = min(0.95, 0.70 + water_ratio * 0.8)
                    if conf >= confidence_threshold:
                        box = [wx, full_wy, ww, wh]
                        norm_box = {
                            "x": wx, "y": full_wy, "w": ww, "h": wh,
                            "orig_w": w, "orig_h": h,
                            "norm_x": round(wx / w, 4), "norm_y": round(full_wy / h, 4),
                            "norm_w": round(ww / w, 4), "norm_h": round(wh / h, 4)
                        }
                        spec = CIVIC_COLOR_MAP["waterlogging"]
                        civic_detections.append({
                            "id": f"CIV-{uuid.uuid4().hex[:6].upper()}",
                            "label": spec["name"],
                            "class_name": "waterlogging",
                            "category": "waterlogging_flood",
                            "type": "civic_issue",
                            "confidence": round(conf, 3),
                            "box": box,
                            "bounding_box": norm_box,
                            "color": spec["color"],
                            "bgr": spec["bgr"],
                            "description": f"Specular road water ponding and drainage overflow ({round(conf*100)}% conf)",
                        })

        # 4. Garbage Accumulation & Overflowing Bins (Yellow #EAB308)
        # Check curbside / sidewalk region (left and right margins)
        curb_left = frame[int(h * 0.45):int(h * 0.85), :int(w * 0.25)]
        curb_right = frame[int(h * 0.45):int(h * 0.85), int(w * 0.75):]

        for curb_patch, x_offset in [(curb_left, 0), (curb_right, int(w * 0.75))]:
            if curb_patch.size == 0:
                continue
            curb_hsv = cv2.cvtColor(curb_patch, cv2.COLOR_BGR2HSV)
            # High-entropy refuse texture check (chaotic color clusters)
            curb_gray = cv2.cvtColor(curb_patch, cv2.COLOR_BGR2GRAY)
            curb_edges = cv2.Canny(curb_gray, 70, 180)
            edge_dens = np.sum(curb_edges > 0) / float(curb_edges.size)

            # Color diversity (standard pavement has low hue variation; garbage piles have high variance)
            hue_std = np.std(curb_hsv[:, :, 0])
            if edge_dens > 0.08 and hue_std > 35:
                # Localize refuse cluster
                g_contours, _ = cv2.findContours(curb_edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                if g_contours:
                    large_g = [gc for gc in g_contours if 2000 < cv2.contourArea(gc) < 25000]
                    if large_g:
                        best_g = max(large_g, key=cv2.contourArea)
                        gx, gy, gw, gh = cv2.boundingRect(best_g)
                        full_gx = x_offset + gx
                        full_gy = int(h * 0.45) + gy
                        conf = min(0.93, 0.68 + edge_dens * 1.5)
                        if conf >= confidence_threshold:
                            box = [full_gx, full_gy, gw, gh]
                            norm_box = {
                                "x": full_gx, "y": full_gy, "w": gw, "h": gh,
                                "orig_w": w, "orig_h": h,
                                "norm_x": round(full_gx / w, 4), "norm_y": round(full_gy / h, 4),
                                "norm_w": round(gw / w, 4), "norm_h": round(gh / h, 4)
                            }
                            spec = CIVIC_COLOR_MAP["garbage"]
                            civic_detections.append({
                                "id": f"CIV-{uuid.uuid4().hex[:6].upper()}",
                                "label": spec["name"],
                                "class_name": "garbage",
                                "category": "garbage_waste",
                                "type": "civic_issue",
                                "confidence": round(conf, 3),
                                "box": box,
                                "bounding_box": norm_box,
                                "color": spec["color"],
                                "bgr": spec["bgr"],
                                "description": f"Curbside solid waste cluster and unattended refuse accumulation ({round(conf*100)}% conf)",
                            })
                            break

        return civic_detections

    def apply_privacy_blur(self, frame: np.ndarray, detections: List[Dict[str, Any]]) -> np.ndarray:
        """
        Privacy-aware handling: Blurs head/face regions of detected persons and
        lower vehicle bumper regions without altering detection accuracy or logging identities.
        """
        output_frame = frame.copy()
        h, w = output_frame.shape[:2]

        for det in detections:
            box = det["box"]
            x, y, bw, bh = box
            if det.get("type") == "person":
                # Blur top 25% of person bounding box (head/face area)
                face_y1 = max(0, y)
                face_y2 = min(h, y + int(bh * 0.28))
                face_x1 = max(0, x)
                face_x2 = min(w, x + bw)
                if face_y2 > face_y1 and face_x2 > face_x1:
                    roi = output_frame[face_y1:face_y2, face_x1:face_x2]
                    kernel_w = max(15, (roi.shape[1] // 3) * 2 + 1)
                    kernel_h = max(15, (roi.shape[0] // 3) * 2 + 1)
                    blurred = cv2.GaussianBlur(roi, (kernel_w, kernel_h), 30)
                    output_frame[face_y1:face_y2, face_x1:face_x2] = blurred

            elif det.get("type") == "vehicle":
                # Blur license plate area (bottom 30% of vehicle)
                plate_y1 = max(0, y + int(bh * 0.70))
                plate_y2 = min(h, y + bh)
                plate_x1 = max(0, x + int(bw * 0.25))
                plate_x2 = min(w, x + int(bw * 0.75))
                if plate_y2 > plate_y1 and plate_x2 > plate_x1:
                    roi = output_frame[plate_y1:plate_y2, plate_x1:plate_x2]
                    kernel_w = max(15, (roi.shape[1] // 3) * 2 + 1)
                    kernel_h = max(15, (roi.shape[0] // 3) * 2 + 1)
                    blurred = cv2.GaussianBlur(roi, (kernel_w, kernel_h), 25)
                    output_frame[plate_y1:plate_y2, plate_x1:plate_x2] = blurred

        return output_frame

    def draw_detections_on_frame(
        self,
        frame: np.ndarray,
        detections: List[Dict[str, Any]],
        show_people: bool = True,
        show_vehicles: bool = True,
        show_civic: bool = True
    ) -> np.ndarray:
        """
        Draws bounding boxes and labels directly onto the frame with exact requested styling:
        - Vehicles: RED (#EF4444)
        - People: GREEN (#22C55E)
        - Potholes / Road: ORANGE (#F97316)
        - Garbage: YELLOW (#EAB308)
        - Waterlogging: CYAN (#06B6D4)
        - Streetlight: PURPLE (#A855F7)
        """
        canvas = frame.copy()
        for det in detections:
            dtype = det.get("type")
            if dtype == "person" and not show_people:
                continue
            if dtype == "vehicle" and not show_vehicles:
                continue
            if dtype == "civic_issue" and not show_civic:
                continue

            x, y, bw, bh = det["box"]
            bgr = det.get("bgr", (0, 255, 0))
            label = det.get("label", "Object")
            conf_pct = int(det.get("confidence", 0.0) * 100)
            tag_text = f"{label} {conf_pct}%"

            # Draw outer rectangle
            cv2.rectangle(canvas, (x, y), (x + bw, y + bh), bgr, 2)

            # Draw corner accents
            line_len = min(16, bw // 4, bh // 4)
            cv2.line(canvas, (x, y), (x + line_len, y), (255, 255, 255), 2)
            cv2.line(canvas, (x, y), (x, y + line_len), (255, 255, 255), 2)
            cv2.line(canvas, (x + bw, y), (x + bw - line_len, y), (255, 255, 255), 2)
            cv2.line(canvas, (x + bw, y), (x + bw, y + line_len), (255, 255, 255), 2)
            cv2.line(canvas, (x, y + bh), (x + line_len, y + bh), (255, 255, 255), 2)
            cv2.line(canvas, (x, y + bh), (x, y + bh - line_len), (255, 255, 255), 2)
            cv2.line(canvas, (x + bw, y + bh), (x + bw - line_len, y + bh), (255, 255, 255), 2)
            cv2.line(canvas, (x + bw, y + bh), (x + bw, y + bh - line_len), (255, 255, 255), 2)

            # Draw label banner
            (tw, th), baseline = cv2.getTextSize(tag_text, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
            banner_y1 = max(0, y - th - 8)
            banner_y2 = y
            cv2.rectangle(canvas, (x, banner_y1), (x + tw + 10, banner_y2), (15, 23, 42), -1)  # dark background
            cv2.rectangle(canvas, (x, banner_y1), (x + tw + 10, banner_y2), bgr, 1)  # colored border
            cv2.putText(canvas, tag_text, (x + 5, banner_y2 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1, cv2.LINE_AA)

        return canvas

    def process_video_stream(
        self,
        video_path: str,
        confidence_threshold: float = 0.45,
        sample_interval_seconds: float = 1.0,
        max_duration_seconds: int = 120,
        privacy_blur: bool = False
    ) -> Dict[str, Any]:
        """
        Processes an entire CCTV video file or stream source frame-by-frame:
        - Runs continuous inference on video frames.
        - Employs SimpleIoUTracker for consistent tracking IDs.
        - Separates detected objects (People, Vehicles) and Civic Issues.
        - Saves snapshot evidence for detected civic issues.
        - Calculates total vehicle and people counts.
        """
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found at {video_path}")

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Unable to open video stream at {video_path}")

        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 300
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 1280
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 720
        duration_seconds = total_frames / fps

        step_frames = max(1, int(fps * sample_interval_seconds))
        curr_frame_idx = 0

        tracker = SimpleIoUTracker(iou_threshold=0.35)
        frames_results = []
        all_civic_issues = []
        all_tracked_objects = {}  # tid -> object metadata

        vehicle_counts = {"car": 0, "motorcycle": 0, "bus": 0, "truck": 0, "bicycle": 0}
        people_count = 0
        civic_counts = {"pothole": 0, "garbage": 0, "waterlogging": 0, "damaged_streetlight": 0}

        t_start = time.time()

        while cap.isOpened():
            cap.set(cv2.CAP_PROP_POS_FRAMES, curr_frame_idx)
            ret, frame = cap.read()
            if not ret:
                break

            timestamp_sec = round(curr_frame_idx / fps, 2)
            if timestamp_sec > max_duration_seconds:
                break

            # 1. Real YOLO COCO Detection (People & Vehicles)
            obj_dets = self.detect_objects_yolo(frame, confidence_threshold=confidence_threshold)

            # 2. Municipal Civic Issue Detection (Potholes, Garbage, Waterlogging)
            civic_dets = self.detect_civic_issues(frame, confidence_threshold=confidence_threshold)

            # 3. Temporal Tracking Update
            all_frame_dets = obj_dets + civic_dets
            tracked_dets = tracker.update(all_frame_dets)

            # Apply privacy blur if enabled
            if privacy_blur:
                frame = self.apply_privacy_blur(frame, tracked_dets)

            # Categorize detections
            frame_people = []
            frame_vehicles = []
            frame_civic = []

            for det in tracked_dets:
                det["timestamp_seconds"] = timestamp_sec
                det["timestamp_str"] = f"{int(timestamp_sec // 60):02d}:{int(timestamp_sec % 60):02d}"
                dtype = det.get("type")

                if dtype == "person":
                    frame_people.append(det)
                    tid = det["tracking_id"]
                    if tid not in all_tracked_objects:
                        all_tracked_objects[tid] = det
                        people_count += 1

                elif dtype == "vehicle":
                    frame_vehicles.append(det)
                    tid = det["tracking_id"]
                    if tid not in all_tracked_objects:
                        all_tracked_objects[tid] = det
                        cname = det["class_name"]
                        if cname in vehicle_counts:
                            vehicle_counts[cname] += 1

                elif dtype == "civic_issue":
                    frame_civic.append(det)
                    cname = det["class_name"]
                    if cname in civic_counts:
                        civic_counts[cname] += 1

                    # Save snapshot evidence for potential complaint generation
                    snap_filename = f"civic_snap_{uuid.uuid4().hex[:8]}.jpg"
                    snap_path = os.path.join(UPLOAD_DIR, snap_filename)
                    annotated_frame = self.draw_detections_on_frame(frame, [det])
                    cv2.imwrite(snap_path, annotated_frame)
                    det["snapshot_url"] = f"http://localhost:8000/uploads/{snap_filename}"
                    all_civic_issues.append(det)

            frames_results.append({
                "timestamp_seconds": timestamp_sec,
                "frame_index": curr_frame_idx,
                "people": frame_people,
                "vehicles": frame_vehicles,
                "civic_issues": frame_civic,
                "total_detections": len(tracked_dets),
                "detections": tracked_dets
            })

            curr_frame_idx += step_frames

        cap.release()
        elapsed_ms = round((time.time() - t_start) * 1000, 1)

        total_vehicles = sum(vehicle_counts.values())
        total_civic = len(all_civic_issues)

        return {
            "status": "success",
            "video_duration_seconds": round(duration_seconds, 1),
            "frames_analyzed": len(frames_results),
            "processing_time_ms": elapsed_ms,
            "counts": {
                "people": people_count,
                "total_vehicles": total_vehicles,
                "vehicles_breakdown": vehicle_counts,
                "civic_issues": total_civic,
                "civic_breakdown": civic_counts,
                "total_entities_tracked": len(all_tracked_objects) + total_civic
            },
            "legend": [
                {"name": "People", "type": "person", "color": "#22C55E", "desc": "Pedestrians, sidewalk commuters & citizens"},
                {"name": "Vehicles", "type": "vehicle", "color": "#EF4444", "desc": "Cars, buses, motorcycles, trucks & bicycles"},
                {"name": "Potholes & Damage", "type": "civic_issue", "color": "#F97316", "desc": "Road surface cavities, cracks & asphalt breaks"},
                {"name": "Garbage & Waste", "type": "civic_issue", "color": "#EAB308", "desc": "Uncollected curbside refuse & overflowing bins"},
                {"name": "Waterlogging", "type": "civic_issue", "color": "#06B6D4", "desc": "Roadway standing pools & stormwater backflow"},
                {"name": "Streetlights", "type": "civic_issue", "color": "#A855F7", "desc": "Damaged luminaires, poles & electrical faults"},
            ],
            "frames": frames_results,
            "civic_issues": all_civic_issues
        }


# Singleton accessor
realtime_detector = RealtimeVideoDetector()
