import { AuthResponse, EvaluationResult, House, InvestigationCase, KafkaEvent, MicroserviceStatus, User } from '../types';

const TOKEN_KEY = 'hydrowatch_jwt_token';

export const getStoredToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
};

export const setStoredToken = (token: string, remember: boolean = true) => {
  if (remember) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
  }
};

export const clearStoredToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
};

// Generic authenticated fetch wrapper
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (response.status === 401 || response.status === 403) {
    // Check if it's token expiration or unauthorized
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401 || errorData.error?.includes('expired') || errorData.error?.includes('token')) {
      clearStoredToken();
      window.dispatchEvent(new CustomEvent('hydrowatch_auth_expired'));
    }
    throw new Error(errorData.error || 'Authentication error. Please log in.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export const api = {
  // 1. Identity Service
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await fetch('/api/identity/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!responseOk(res.status)) {
      throw new Error(data.error || 'Invalid credentials or login failed.');
    }
    return data;
  },

  getCurrentUser: async (): Promise<{ user: User }> => {
    return apiFetch<{ user: User }>('/api/identity/me');
  },

  // 2. Properties
  getProperties: async (): Promise<House[]> => {
    return apiFetch<House[]>('/api/properties');
  },

  // 3. Baseline & Anomaly Detection Service
  evaluateFlow: async (
    propertyId: string,
    currentFlow: number,
    customThreshold?: number
  ): Promise<EvaluationResult> => {
    return apiFetch<EvaluationResult>('/api/baseline/evaluate', {
      method: 'POST',
      body: JSON.stringify({ propertyId, currentFlow, customThreshold }),
    });
  },

  getThreshold: async (): Promise<{ threshold: number }> => {
    return apiFetch<{ threshold: number }>('/api/baseline/threshold');
  },

  updateThreshold: async (threshold: number): Promise<{ threshold: number; message: string }> => {
    return apiFetch<{ threshold: number; message: string }>('/api/baseline/threshold', {
      method: 'PUT',
      body: JSON.stringify({ threshold }),
    });
  },

  // 4. LeakCase Service
  getCases: async (): Promise<InvestigationCase[]> => {
    return apiFetch<InvestigationCase[]>('/api/leak-cases');
  },

  updateCaseStatus: async (
    caseId: string,
    status: string,
    notes?: string
  ): Promise<{ message: string; case: InvestigationCase }> => {
    return apiFetch<{ message: string; case: InvestigationCase }>(`/api/leak-cases/${caseId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
  },

  // 5. Kafka Event Stream
  getKafkaEvents: async (): Promise<{ topic: string; events: KafkaEvent[] }> => {
    return apiFetch<{ topic: string; events: KafkaEvent[] }>('/api/kafka/events');
  },

  // 6. Microservices status
  getSystemServices: async (): Promise<MicroserviceStatus> => {
    return apiFetch<MicroserviceStatus>('/api/system/services');
  },
};

function responseOk(status: number): boolean {
  return status >= 200 && status < 300;
}
