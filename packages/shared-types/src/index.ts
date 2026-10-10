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
  | 'reported'
  | 'acknowledged'
  | 'in_progress'
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
  ai_confidence: number;
  source: IssueSource;
  priority_score: number;
  diagnostic_card?: DiagnosticCard | null;
  created_at: string;
  resolved_at?: string | null;
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


