import { AuthUser, Property, InvestigationCase, AnalystMetrics, EvaluationResult } from '../types';

const TOKEN_KEY = 'hydrowatch_auth_token_jwt';

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

// 1. Auth API
export async function login(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Login failed' }));
    throw new Error(errorData.error || 'Authentication failed');
  }

  const data = await res.json();
  setStoredToken(data.token);
  return data;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const res = await fetch('/api/auth/me', {
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
  const res = await fetch('/api/resident/property', {
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
  const res = await fetch('/api/resident/readings', {
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
  const res = await fetch('/api/analyst/properties', {
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
  const res = await fetch('/api/analyst/metrics', {
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
  const res = await fetch('/api/leak-cases', {
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
  const res = await fetch(`/api/leak-cases/${caseId}/status`, {
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
  const res = await fetch('/api/kafka/events', {
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
  const eventSource = new EventSource(`/api/events/stream?token=${encodeURIComponent(token)}`);

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
