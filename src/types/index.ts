export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'resident' | 'utilityAnalyst' | 'RESIDENT' | 'UTILITY_ANALYST';
  propertyId?: string;
}

// Aliases for compatibility
export type User = AuthUser;

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface KafkaEvent {
  id?: string;
  eventId?: string;
  eventType?: string;
  topic?: string;
  timestamp?: string;
  payload?: any;
}

export type MicroserviceStatus = Record<string, any>;

export interface Property {
  id: string;
  name: string;
  address: string;
  residentEmail?: string;
  baselineFlow: number; // L/hour
  thresholdPercent: number; // default 55%
  occupants: number;
  description?: string;
}

// Backward-compatible alias for existing components
export type House = Property;

export type LeakSeverity = 'Normal' | 'Low' | 'Moderate' | 'High' | 'Severe';
export type CaseStatus = 'Open' | 'Under Investigation' | 'Resolved';

export interface InvestigationCase {
  id: string;
  caseNumber: string;
  propertyId: string;
  propertyName: string;
  // Aliases for compatibility
  houseId?: string;
  houseName?: string;
  address: string;
  currentFlow: number;
  baselineFlow: number;
  deviationPercentage: number | null;
  thresholdPercent?: number;
  severity: LeakSeverity;
  status: CaseStatus;
  detectedAt: string;
  timestamp?: string; // alias for detectedAt
  updatedAt?: string;
  investigatedAt?: string;
  resolvedAt?: string;
  eventId?: string;
  notes?: string;
}

export interface AnalystMetrics {
  totalProperties: number;
  normalProperties: number;
  suspectedLeaks: number;
  openCases: number;
  underInvestigationCases: number;
  resolvedCases: number;
  totalCases: number;
}

export interface HourlyReading {
  hour: string; // e.g. "00:00"
  hourNum: number;
  flow: number;
  baseline: number;
  threshold: number;
  isNightWindow: boolean;
}

export interface EvaluationResult {
  isPossibleLeak: boolean;
  isAnomaly: boolean;
  deviationPercentage: number | null;
  insufficientData: boolean;
  explanation: string;
  severity: LeakSeverity;
  thresholdPercent?: number;
  kafkaEventPublished?: boolean;
  eventId?: string;
}
