export type UserRole = 'citizen' | 'admin' | 'engineer' | 'crew';

export interface User {
  id: string;
  phone: string;
  role: UserRole;
  ward_id?: string | null;
  name?: string | null;
  created_at: string;
}

export interface WardBoundary {
  type: 'Polygon';
  coordinates: number[][][]; // [longitude, latitude] pairs
}

export interface Ward {
  id: string;
  name: string;
  city: string;
  boundary?: WardBoundary | any;
  active_issues_count?: number;
  resolved_issues_count?: number;
}

export type IssueCategory =
  | 'pothole'
  | 'garbage'
  | 'drainage'
  | 'water_leak'
  | 'streetlight'
  | 'road_damage'
  | 'other';

export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';

export type IssueStatus =
  | 'submitted'
  | 'reported'
  | 'acknowledged'
  | 'assigned'
  | 'in_progress'
  | 'awaiting_inspection'
  | 'rework_required'
  | 'resolved'
  | 'rejected';

export type IssueSource = 'citizen' | 'cctv' | 'satellite' | 'iot';

export interface DiagnosticCard {
  severity: IssueSeverity;
  cost_estimate: string;
  recommended_fix: string;
  suggested_sla_hours: number;
  is_estimate: true; // Always labeled estimate per system requirement
}

export interface Issue {
  id: string;
  reporter_id?: string | null;
  reporter_phone?: string | null;
  title?: string;
  description?: string;
  category: IssueCategory;
  severity: IssueSeverity;
  status: IssueStatus;
  latitude: number;
  longitude: number;
  ward_id: string;
  photo_url?: string | null;
  after_photo_url?: string | null;
  crew_notes?: string | null;
  engineer_remarks?: string | null;
  approved_budget?: string | null;
  assigned_crew_id?: string | null;
  inspection_checklist?: Record<string, boolean> | null;
  ai_confidence: number;
  source: IssueSource;
  priority_score: number;
  diagnostic_card?: DiagnosticCard | null;
  created_at: string;
  resolved_at?: string | null;
  events?: StatusEvent[];
}

export type WorkOrderStatus =
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface WorkOrder {
  id: string;
  issue_id: string;
  assigned_crew_id?: string | null;
  priority_score: number;
  status: WorkOrderStatus;
  created_at: string;
  completed_at?: string | null;
  issue?: Issue;
  crew?: Crew;
}

export type CrewStatus = 'available' | 'dispatched' | 'busy' | 'offline';

export interface Crew {
  id: string;
  name: string;
  ward_id: string;
  latitude: number;
  longitude: number;
  status: CrewStatus;
  contact_phone?: string;
}

export interface StatusEvent {
  id: string;
  issue_id: string;
  old_status?: IssueStatus | null;
  new_status: IssueStatus;
  actor_id?: string | null;
  actor_role?: string | null;
  comment?: string | null;
  timestamp: string;
}

export interface PublicWardMetrics {
  ward_id: string;
  ward_name: string;
  city: string;
  total_issues: number;
  resolved_issues: number;
  in_progress_issues: number;
  pending_issues: number;
  avg_resolution_hours: number;
  backlog_count: number;
}

export interface CrewSuggestion {
  crew: Crew;
  distance_km: number;
  estimated_eta_minutes: number;
  recommended_score: number;
}

export type WebSocketEventType =
  | 'ISSUE_CREATED'
  | 'ISSUE_STATUS_CHANGED'
  | 'CREW_LOCATION_UPDATED'
  | 'WORK_ORDER_UPDATED'
  | 'PING';

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  phone: string;
  role: string;
  name?: string | null;
  ward_id?: string | null;
}

export interface IssueCreate {
  reporter_id?: string | null;
  reporter_phone?: string | null;
  title?: string | null;
  description?: string | null;
  category: IssueCategory;
  severity?: IssueSeverity;
  latitude: number;
  longitude: number;
  ward_id?: string;
  photo_url?: string | null;
  source?: IssueSource;
}

export interface IssueStatusUpdate {
  status: IssueStatus;
  comment?: string;
  actor_id?: string;
  actor_role?: string;
  assigned_crew_id?: string;
  approved_budget?: string;
  after_photo_url?: string;
  crew_notes?: string;
  engineer_remarks?: string;
  inspection_checklist?: Record<string, boolean>;
  priority_score?: number;
  severity?: IssueSeverity;
}

export interface CrewLocationUpdate {
  latitude: number;
  longitude: number;
  status?: CrewStatus;
}

export interface WebSocketMessage<T = any> {
  event: WebSocketEventType;
  data: T;
  timestamp: string;
}

// ==========================================
// CCTV & AI Public Safety Surveillance Types
// ==========================================

export type CameraStatus = 'online' | 'offline' | 'incident_detected' | 'maintenance';
export type CameraStreamType = 'hls' | 'webrtc' | 'mp4' | 'demo';

export interface CameraCapabilities {
  live: boolean;
  recording: boolean;
  ptz: boolean;
  night_vision: boolean;
  ai_enabled: boolean;
}

export interface Camera {
  id: string;
  name: string;
  code: string;
  location_name: string;
  ward_id: string;
  ward_name?: string;
  latitude: number;
  longitude: number;
  stream_url: string;
  stream_type: CameraStreamType;
  status: CameraStatus;
  capabilities: CameraCapabilities;
  last_ping: string;
  resolution: string;
  fps: number;
  is_demo: boolean;
  active_incidents_count?: number;
  recordings_count?: number;
}

export interface RecordingSegment {
  id: string;
  camera_id: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  video_url: string;
  thumbnail_url: string;
  file_size_mb: number;
  is_demo: boolean;
  created_at: string;
}

export type DetectionCategory = 'civic_infrastructure' | 'public_safety';

export type DetectionEventType =
  | 'pothole'
  | 'garbage'
  | 'waterlogging'
  | 'fallen_tree'
  | 'road_damage'
  | 'traffic_accident'
  | 'potential_assault'
  | 'potential_forced_movement'
  | 'potential_harassment'
  | 'potential_sexual_violence_indicator'
  | 'medical_collapse'
  | 'crowd_surge';

export type DetectionReviewStatus = 'pending_review' | 'verified' | 'inconclusive' | 'false_positive';

export interface CctvDetection {
  id: string;
  camera_id: string;
  camera_name: string;
  location_name: string;
  ward_id: string;
  recording_id?: string | null;
  category: DetectionCategory;
  event_type: DetectionEventType;
  confidence: number;
  timestamp_offset_seconds: number;
  incident_time: string;
  snapshot_url: string;
  video_url?: string | null;
  description: string;
  observable_indicators: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  ucf_reference_class?: string;
  ucf_similarity_score?: number;
  baseline_deviation_sigma?: string;
  benchmark_citation?: string;
  review_status: DetectionReviewStatus;
  reviewer_id?: string | null;
  reviewer_notes?: string | null;
  reviewed_at?: string | null;
  complaint_id?: string | null;
  incident_report_id?: string | null;
  created_at: string;
}

export type EscalationAgency =
  | 'police_112'
  | 'mrrt'
  | 'traffic_police'
  | 'fire_rescue'
  | 'women_safety_1091'
  | 'ambulance_108';

export type EscalationStatus =
  | 'draft'
  | 'dispatched'
  | 'acknowledged'
  | 'unit_en_route'
  | 'on_scene'
  | 'resolved';

export interface IncidentReport {
  id: string;
  detection_id: string;
  camera_id: string;
  camera_name: string;
  location_text: string;
  latitude: number;
  longitude: number;
  ward_id: string;
  category: DetectionCategory;
  event_type: DetectionEventType;
  priority: 'critical' | 'high' | 'medium' | 'low';
  incident_timestamp: string;
  summary: string;
  observable_indicators: string[];
  snapshot_url: string;
  video_url?: string | null;
  video_timestamp_seconds: number;
  reviewer_id: string;
  reviewer_name: string;
  review_decision: DetectionReviewStatus;
  reviewer_notes?: string | null;
  escalation_channel?: EscalationAgency | null;
  escalation_status: EscalationStatus;
  agency_reference_id?: string | null;
  created_at: string;
  updated_at: string;
}

// ==========================================
// UCF-Crime Surveillance Dataset Benchmark Types
// ==========================================

export interface UcfCrimeDatasetInfo {
  name: string;
  authors: string;
  conference: string;
  institution: string;
  total_videos: number;
  total_hours: number;
  total_classes: number;
  primary_download_url: string;
  parts_download_url: string;
  size_gb: number;
  description: string;
  classes: string[];
  benchmark_clips_indexed: number;
  available_categories: string[];
}

export interface UcfCrimeVideo {
  id: string;
  video_name: string;
  ucf_category: string;
  civiclens_category: DetectionCategory;
  mapped_event_type: DetectionEventType;
  priority: 'critical' | 'high' | 'medium' | 'low';
  fps: number;
  total_frames: number;
  duration_seconds: number;
  anomaly_start_frame: number;
  anomaly_end_frame: number;
  anomaly_start_seconds: number;
  anomaly_end_seconds: number;
  description: string;
  observable_indicators: string[];
  video_url: string;
  poster_url: string;
  recommended_escalation?: EscalationAgency | null;
  location_context: string;
}



