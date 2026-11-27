export type UserRole = 'ADMIN' | 'AGENT';

export type AgentAvailabilityStatus = 'AVAILABLE' | 'BUSY' | 'AWAY' | 'OFFLINE';

export type CallStatus = 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'MISSED' | 'CANCELLED';

export interface UserProfile {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresInMs: number;
  user: UserProfile;
}

export interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
}

export interface Agent {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  availabilityStatus: AgentAvailabilityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AgentRequest {
  firstName: string;
  lastName: string;
  email: string;
  availabilityStatus?: AgentAvailabilityStatus;
}

export interface CallNote {
  id: number;
  authorAgentId: number | null;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface CallSummary {
  id: number;
  customerId: number;
  customerName: string;
  customerEmail: string;
  agentId: number | null;
  agentName: string | null;
  status: CallStatus;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  noteCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CallDetail {
  id: number;
  customerId: number;
  customerName: string;
  customerEmail: string;
  customerPhoneNumber: string;
  agentId: number | null;
  agentName: string | null;
  agentEmail: string | null;
  status: CallStatus;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  notes: CallNote[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCallRequest {
  customerId: number;
  agentId?: number | null;
  status?: CallStatus;
  startedAt?: string | null;
  endedAt?: string | null;
  durationSeconds?: number | null;
  initialNote?: string;
}

export interface UpdateCallStatusRequest {
  status: CallStatus;
  startedAt?: string | null;
  endedAt?: string | null;
  durationSeconds?: number | null;
}

export interface AddCallNoteRequest {
  content: string;
  authorAgentId?: number | null;
}

export interface AnalyticsOverview {
  totalCalls: number;
  completedCalls: number;
  missedCalls: number;
  queuedCalls: number;
  inProgressCalls: number;
  cancelledCalls: number;
  averageDurationSeconds: number;
}

export interface StatusCount {
  status: CallStatus;
  count: number;
}

export interface AgentPerformance {
  agentId: number;
  agentName: string;
  email: string;
  availabilityStatus: AgentAvailabilityStatus;
  totalCalls: number;
  completedCalls: number;
  missedCalls: number;
  averageDurationSeconds: number;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface FieldValidationError {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  code: string;
  message: string;
  path: string;
  fieldErrors: FieldValidationError[];
}
