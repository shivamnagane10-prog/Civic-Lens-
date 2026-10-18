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
  TokenResponse
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
}

export const api = new ApiClient();
