import { AuthUser, Property, InvestigationCase, AnalystMetrics, EvaluationResult } from '../types';

const TOKEN_KEY = 'hydrowatch_auth_token_jwt';

// Publicly accessible backend API URL configured via Vercel / Vite environment variable.
// E.g. VITE_API_BASE_URL="https://hydrowatch-backend.onrender.com"
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

export function buildApiUrl(endpoint: string): string {
  // If already absolute, return as-is
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return API_BASE_URL ? `${API_BASE_URL}${cleanEndpoint}` : cleanEndpoint;
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function getAuthHeaders(): HeadersInit {
  const token = getStoredToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// 0. Backend Health Check
export async function checkBackendHealth(): Promise<{ status: string; service: string }> {
  const url = buildApiUrl('/api/health');
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Backend health check failed (status ${res.status})`);
  }
  return res.json();
}

// 1. Auth API
export async function login(
  email: string,
  password: string
): Promise<{ token: string; user: AuthUser }> {
  const url = buildApiUrl('/api/auth/login');
  let res: Response;

  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password }),
    });
  } catch (networkErr: any) {
    const targetUrl = API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    throw new Error(
      `Unable to connect to HydroWatch backend at ${targetUrl || 'configured host'}. If frontend is deployed on Vercel, ensure VITE_API_BASE_URL is set in Vercel Project Settings to your active backend service URL.`
    );
  }

  if (!res.ok) {
    let errorMsg = '';
    try {
      const errorData = await res.json();
      errorMsg = errorData.error;
    } catch {
      // Non-JSON response (e.g. 404 HTML from Vercel static routing)
      if (res.status === 404) {
        errorMsg = `Backend endpoint ${url} returned 404 Not Found. If frontend is deployed on Vercel, configure VITE_API_BASE_URL in your Vercel Project Settings with your publicly deployed backend URL (e.g. on Render, Railway, or Cloud Run).`;
      } else if (res.status === 502 || res.status === 503) {
        errorMsg = `Backend service is temporarily unavailable (HTTP ${res.status}). Verify backend deployment health.`;
      } else {
        errorMsg = `Backend request failed with HTTP ${res.status}: ${res.statusText || 'Unknown error'}`;
      }
    }
    throw new Error(errorMsg || 'Authentication failed. Please verify credentials.');
  }

  const data = await res.json();
  setStoredToken(data.token);
  return data;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const url = buildApiUrl('/api/auth/me');
    const res = await fetch(url, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      clearStoredToken();
      return null;
    }
    const data = await res.json();
    return data.user;
  } catch {
    return null;
  }
}

// 2. Resident APIs
export async function getResidentProperty(): Promise<Property> {
  const url = buildApiUrl('/api/resident/property');
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Forbidden' }));
    throw new Error(err.error || 'Failed to fetch authorized property');
  }
  const data = await res.json();
  return data.property;
}

export async function submitResidentReading(
  flowRate: number,
  thresholdPercent?: number
): Promise<{ reading: any; evaluation: EvaluationResult }> {
  const url = buildApiUrl('/api/resident/readings');
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ flowRate, thresholdPercent }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Submission failed' }));
    throw new Error(err.error || 'Failed to submit meter reading');
  }

  return res.json();
}

// 3. Utility Analyst APIs
export async function getAnalystProperties(): Promise<Property[]> {
  const url = buildApiUrl('/api/analyst/properties');
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Forbidden' }));
    throw new Error(err.error || 'Failed to fetch properties');
  }
  const data = await res.json();
  return data.properties;
}

export async function getAnalystMetrics(): Promise<AnalystMetrics> {
  const url = buildApiUrl('/api/analyst/metrics');
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Forbidden' }));
    throw new Error(err.error || 'Failed to fetch metrics');
  }
  const data = await res.json();
  return data.metrics;
}

export async function getLeakCases(): Promise<InvestigationCase[]> {
  const url = buildApiUrl('/api/leak-cases');
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Forbidden' }));
    throw new Error(err.error || 'Failed to fetch investigation cases');
  }
  const data = await res.json();
  return data.cases;
}

export async function updateCaseStatus(
  caseId: string,
  status: 'Open' | 'Under Investigation' | 'Resolved',
  notes?: string
): Promise<InvestigationCase> {
  const url = buildApiUrl(`/api/leak-cases/${caseId}/status`);
  const res = await fetch(url, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status, notes }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Status update failed' }));
    throw new Error(err.error || 'Failed to update case status');
  }

  const data = await res.json();
  return data.case;
}

export async function getKafkaEvents(): Promise<{ topic: string; messages: any[] }> {
  const url = buildApiUrl('/api/kafka/events');
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error('Failed to fetch Kafka event log');
  }
  return res.json();
}

// 4. Server-Sent Events (SSE) Listener
export function subscribeToAnalystSse(
  token: string,
  onNewCase: (newCase: InvestigationCase, msg: string) => void,
  onCaseUpdated: (updatedCase: InvestigationCase) => void,
  onStatusChange: (status: 'connected' | 'connecting' | 'disconnected') => void
): () => void {
  onStatusChange('connecting');
  const sseUrl = buildApiUrl(`/api/events/stream?token=${encodeURIComponent(token)}`);
  const eventSource = new EventSource(sseUrl);

  eventSource.addEventListener('open', () => {
    onStatusChange('connected');
  });

  eventSource.addEventListener('connected', () => {
    onStatusChange('connected');
  });

  eventSource.addEventListener('new-leak-case', (event) => {
    try {
      const parsed = JSON.parse(event.data);
      if (parsed.case) {
        onNewCase(parsed.case, parsed.message);
      }
    } catch (e) {
      console.error('Error parsing new-leak-case SSE', e);
    }
  });

  eventSource.addEventListener('case-updated', (event) => {
    try {
      const parsed = JSON.parse(event.data);
      if (parsed.case) {
        onCaseUpdated(parsed.case);
      }
    } catch (e) {
      console.error('Error parsing case-updated SSE', e);
    }
  });

  eventSource.onerror = () => {
    onStatusChange('disconnected');
  };

  return () => {
    eventSource.close();
    onStatusChange('disconnected');
  };
}
