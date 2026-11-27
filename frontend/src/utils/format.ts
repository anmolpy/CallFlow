import type { BadgeTone } from '../components/ui';
import type { AgentAvailabilityStatus, CallStatus } from '../types/api';

export const ALL_CALL_STATUSES: CallStatus[] = [
  'QUEUED',
  'IN_PROGRESS',
  'COMPLETED',
  'MISSED',
  'CANCELLED',
];

export const ALL_AGENT_STATUSES: AgentAvailabilityStatus[] = [
  'AVAILABLE',
  'BUSY',
  'AWAY',
  'OFFLINE',
];

export const CALL_ALLOWED_TRANSITIONS: Record<CallStatus, CallStatus[]> = {
  QUEUED: ['IN_PROGRESS', 'MISSED', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'MISSED', 'CANCELLED'],
  COMPLETED: [],
  MISSED: [],
  CANCELLED: [],
};

export function isTerminalCallStatus(status: CallStatus): boolean {
  return CALL_ALLOWED_TRANSITIONS[status].length === 0;
}

export const CALL_STATUS_META: Record<
  CallStatus,
  { label: string; tone: BadgeTone; barClass: string }
> = {
  QUEUED: { label: 'Queued', tone: 'warning', barClass: 'bg-amber-500' },
  IN_PROGRESS: { label: 'In Progress', tone: 'info', barClass: 'bg-blue-500' },
  COMPLETED: { label: 'Completed', tone: 'success', barClass: 'bg-emerald-500' },
  MISSED: { label: 'Missed', tone: 'danger', barClass: 'bg-rose-500' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral', barClass: 'bg-slate-400' },
};

export const AGENT_AVAILABILITY_META: Record<
  AgentAvailabilityStatus,
  { label: string; tone: BadgeTone }
> = {
  AVAILABLE: { label: 'Available', tone: 'success' },
  BUSY: { label: 'Busy', tone: 'warning' },
  AWAY: { label: 'Away', tone: 'info' },
  OFFLINE: { label: 'Offline', tone: 'neutral' },
};

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds < 0) {
    return '—';
  }
  const rounded = Math.round(seconds);
  if (rounded < 60) {
    return `${rounded}s`;
  }
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const remainingSeconds = rounded % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m ${remainingSeconds}s`;
}

export function formatPercent(part: number, total: number): string {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) {
    return '0%';
  }
  return `${Math.round((part / total) * 100)}%`;
}

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) {
    return '—';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return DATE_TIME_FORMATTER.format(date);
}
