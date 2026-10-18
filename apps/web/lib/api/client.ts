import {
  Issue,
  IssueCreate,
  IssueCategory,
  IssueStatus,
  IssueStatusUpdate,
  IssueSeverity,
  Ward,
  PublicWardMetrics,
  Crew,
  CrewLocationUpdate,
  WorkOrder,
  CrewSuggestion,
  User,
  TokenResponse,
  Camera,
  RecordingSegment,
  CctvDetection,
  IncidentReport,
  DetectionReviewStatus,
  EscalationAgency
} from '@civiclens/shared-types';


export function getApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined' && window.location.hostname) {
    return `http://${window.location.hostname}:8000/api/v1`;
  }
  return 'http://127.0.0.1:8000/api/v1';
}

export class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('civiclens_token', token);
    }
  }

  getToken(): string | null {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('civiclens_token');
    }
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${getApiBase()}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(err.detail || 'API request failed');
    }

    return response.json();
  }

  // Auth
  async requestOtp(phone: string): Promise<{ success: boolean; message: string; debug_otp: string }> {
    return this.request('/auth/otp/request', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  async verifyOtp(phone: string, otp: string, role = 'citizen'): Promise<TokenResponse> {
    const res = await this.request<TokenResponse>('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, otp, role }),
    });
    this.setToken(res.access_token);
    return res;
  }

  async officialLogin(phone: string, role: string): Promise<TokenResponse> {
    const res = await this.request<TokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, role }),
    });
    this.setToken(res.access_token);
    return res;
  }

  // Issues
  async getIssues(params?: { ward_id?: string; status?: string; category?: string; near?: string; radius?: number }): Promise<Issue[]> {
    const searchParams = new URLSearchParams();
    if (params?.ward_id) searchParams.append('ward_id', params.ward_id);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.category) searchParams.append('category', params.category);
    if (params?.near) searchParams.append('near', params.near);
    if (params?.radius) searchParams.append('radius', params.radius.toString());

    const qs = searchParams.toString();
    return this.request<Issue[]>(`/issues${qs ? `?${qs}` : ''}`);
  }

  async getIssue(id: string): Promise<Issue> {
    return this.request<Issue>(`/issues/${id}`);
  }

  async createIssue(payload: IssueCreate): Promise<Issue> {
    return this.request<Issue>('/issues', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateIssueStatus(
    id: string,
    status: IssueStatus,
    comment?: string,
    actorRole?: string,
    extra?: Partial<IssueStatusUpdate>
  ): Promise<Issue> {
    return this.request<Issue>(`/issues/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        status,
        comment,
        actor_role: actorRole,
        ...extra,
      }),
    });
  }

  async getIssueTimeline(id: string): Promise<any[]> {
    return this.request<any[]>(`/issues/${id}/timeline`);
  }

  // Wards & Analytics
  async getWards(): Promise<Ward[]> {
    return this.request<Ward[]>('/wards');
  }

  async getWardAnalytics(wardId: string): Promise<any> {
    return this.request<any>(`/wards/${wardId}/analytics`);
  }

  async getPublicWardMetrics(wardId: string): Promise<PublicWardMetrics> {
    return this.request<PublicWardMetrics>(`/public/${wardId}`);
  }

  // Work Orders & Crew Dispatch
  async getWorkOrders(status?: string): Promise<WorkOrder[]> {
    const qs = status ? `?status=${status}` : '';
    return this.request<WorkOrder[]>(`/work_orders${qs}`);
  }

  async createWorkOrder(issueId: string, assignedCrewId?: string, priorityScore?: number): Promise<WorkOrder> {
    return this.request<WorkOrder>('/work_orders', {
      method: 'POST',
      body: JSON.stringify({ issue_id: issueId, assigned_crew_id: assignedCrewId, priority_score: priorityScore }),
    });
  }

  async getCrewSuggestions(issueId: string): Promise<CrewSuggestion[]> {
    return this.request<CrewSuggestion[]>(`/work_orders/suggestions?issue_id=${issueId}`);
  }

  async updateWorkOrderStatus(id: string, status: string, assignedCrewId?: string): Promise<WorkOrder> {
    return this.request<WorkOrder>(`/work_orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, assigned_crew_id: assignedCrewId }),
    });
  }

  // Crews
  async getCrews(wardId?: string): Promise<Crew[]> {
    const qs = wardId ? `?ward_id=${wardId}` : '';
    return this.request<Crew[]>(`/crews${qs}`);
  }

  async updateCrewLocation(id: string, update: CrewLocationUpdate): Promise<Crew> {
    return this.request<Crew>(`/crews/${id}/location`, {
      method: 'PATCH',
      body: JSON.stringify(update),
    });
  }

  // File Upload
  async uploadImage(file: File): Promise<{ success: boolean; url: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${getApiBase()}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!response.ok) {
      throw new Error('Failed to upload image file');
    }
    return response.json();
  }

  // Vision AI Image Classifier
  async classifyImage(file?: File, imageUrl?: string): Promise<{
    detected_category: IssueCategory;
    confidence: number;
    probabilities: Record<string, number>;
    diagnostic_card: any;
    severity: string;
    model_used: string;
  }> {
    const formData = new FormData();
    if (file) formData.append('file', file);
    if (imageUrl) formData.append('image_url', imageUrl);

    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${getApiBase()}/ml/classify-image`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Image classification failed');
    }
    return response.json();
  }

  // ==========================================
  // CCTV & AI Incident Response Methods
  // ==========================================

  async getCctvCameras(params?: { ward_id?: string; status?: string; q?: string }): Promise<Camera[]> {
    const searchParams = new URLSearchParams();
    if (params?.ward_id) searchParams.append('ward_id', params.ward_id);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.q) searchParams.append('q', params.q);
    const qs = searchParams.toString();
    return this.request<Camera[]>(`/cctv/cameras${qs ? `?${qs}` : ''}`);
  }

  async getCctvCamera(id: string): Promise<Camera> {
    return this.request<Camera>(`/cctv/cameras/${id}`);
  }

  async getCctvRecordings(cameraId: string, limit = 50): Promise<RecordingSegment[]> {
    return this.request<RecordingSegment[]>(`/cctv/cameras/${cameraId}/recordings?limit=${limit}`);
  }

  async uploadDemoRecording(cameraId: string, file: File, durationSeconds = 120): Promise<RecordingSegment> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('duration_seconds', durationSeconds.toString());

    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${getApiBase()}/cctv/cameras/${cameraId}/recordings/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Failed to upload demo recording' }));
      throw new Error(err.detail || 'Demo recording upload failed');
    }
    return response.json();
  }

  async getCctvDetections(params?: {
    category?: string;
    event_type?: string;
    review_status?: string;
    priority?: string;
    camera_id?: string;
  }): Promise<CctvDetection[]> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.append('category', params.category);
    if (params?.event_type) searchParams.append('event_type', params.event_type);
    if (params?.review_status) searchParams.append('review_status', params.review_status);
    if (params?.priority) searchParams.append('priority', params.priority);
    if (params?.camera_id) searchParams.append('camera_id', params.camera_id);
    const qs = searchParams.toString();
    return this.request<CctvDetection[]>(`/cctv/detections${qs ? `?${qs}` : ''}`);
  }

  async getCctvDetection(id: string): Promise<CctvDetection> {
    return this.request<CctvDetection>(`/cctv/detections/${id}`);
  }

  async reviewCctvDetection(
    id: string,
    reviewStatus: DetectionReviewStatus,
    notes?: string,
    reviewerId?: string
  ): Promise<CctvDetection> {
    return this.request<CctvDetection>(`/cctv/detections/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({
        review_status: reviewStatus,
        reviewer_notes: notes,
        reviewer_id: reviewerId || 'USER-ADMIN',
      }),
    });
  }

  async createComplaintFromDetection(
    detectionId: string,
    payload?: { title?: string; description?: string; ward_id?: string; severity?: string }
  ): Promise<{ message: string; issue_id: string; detection_id: string; status: string }> {
    return this.request<{ message: string; issue_id: string; detection_id: string; status: string }>(
      `/cctv/detections/${detectionId}/complaint-draft`,
      {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      }
    );
  }

  async createIncidentReport(
    detectionId: string,
    payload: { summary: string; priority?: string; escalation_channel?: string; reviewer_notes?: string }
  ): Promise<IncidentReport> {
    return this.request<IncidentReport>(`/cctv/detections/${detectionId}/incident-report`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getIncidentReports(params?: {
    escalation_status?: string;
    priority?: string;
    category?: string;
  }): Promise<IncidentReport[]> {
    const searchParams = new URLSearchParams();
    if (params?.escalation_status) searchParams.append('escalation_status', params.escalation_status);
    if (params?.priority) searchParams.append('priority', params.priority);
    if (params?.category) searchParams.append('category', params.category);
    const qs = searchParams.toString();
    return this.request<IncidentReport[]>(`/cctv/incidents${qs ? `?${qs}` : ''}`);
  }

  async escalateIncidentReport(
    id: string,
    channel: string,
    status = 'dispatched',
    notes?: string,
    agencyRef?: string
  ): Promise<IncidentReport> {
    return this.request<IncidentReport>(`/cctv/incidents/${id}/escalate`, {
      method: 'POST',
      body: JSON.stringify({
        escalation_channel: channel,
        escalation_status: status,
        notes,
        agency_reference_id: agencyRef,
      }),
    });
  }

  async triggerAiVideoAnalysis(
    cameraId: string,
    recordingId?: string,
    focus: 'all' | 'civic_infrastructure' | 'public_safety' = 'all'
  ): Promise<{ status: string; message: string; detection: CctvDetection }> {
    return this.request<{ status: string; message: string; detection: CctvDetection }>('/cctv/analyze', {
      method: 'POST',
      body: JSON.stringify({
        camera_id: cameraId,
        recording_id: recordingId,
        analysis_focus: focus,
      }),
    });
  }
}

export const api = new ApiClient();

