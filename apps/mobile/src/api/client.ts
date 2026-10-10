import { Issue, IssueCreate, IssueStatus, TokenResponse, Crew, CrewLocationUpdate } from '@civiclens/shared-types';

const API_BASE = 'http://localhost:8000/api/v1';

export class MobileApiClient {
  private token: string | null = null;

  setToken(t: string) {
    this.token = t;
  }

  async requestOtp(phone: string) {
    const res = await fetch(`${API_BASE}/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    return res.json();
  }

  async verifyOtp(phone: string, otp: string, role = 'citizen'): Promise<TokenResponse> {
    const res = await fetch(`${API_BASE}/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp, role }),
    });
    const data = await res.json();
    this.token = data.access_token;
    return data;
  }

  async createIssue(payload: IssueCreate): Promise<Issue> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const res = await fetch(`${API_BASE}/issues`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    return res.json();
  }

  async getMyIssues(): Promise<Issue[]> {
    const res = await fetch(`${API_BASE}/issues?source=citizen`);
    return res.json();
  }

  async updateCrewLocation(id: string, update: CrewLocationUpdate): Promise<Crew> {
    const res = await fetch(`${API_BASE}/crews/${id}/location`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    });
    return res.json();
  }
}

export const mobileApi = new MobileApiClient();
