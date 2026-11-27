import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Headset,
  MessageSquarePlus,
  RefreshCw,
  User,
  X,
} from 'lucide-react';
import { ApiClientError, agentsApi, callsApi } from '../api';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  LoadingSpinner,
  PageHeader,
} from '../components/ui';
import type { Agent, CallDetail, CallStatus } from '../types/api';
import {
  CALL_ALLOWED_TRANSITIONS,
  CALL_STATUS_META,
  formatDateTime,
  formatDuration,
  isTerminalCallStatus,
} from '../utils/format';

export function CallDetailPage() {
  const { id } = useParams<{ id: string }>();
  const callId = Number(id);
  const validId = Number.isInteger(callId) && callId > 0;

  const [call, setCall] = useState<CallDetail | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [durationOverride, setDurationOverride] = useState('');
  const [noteContent, setNoteContent] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<CallStatus | null>(null);
  const [isAddingNote, setIsAddingNote] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadCall = useCallback(async () => {
    if (!validId) {
      setIsLoading(false);
      setError('Invalid call ID.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [callData, agentResult] = await Promise.all([
        callsApi.getById(callId),
        agentsApi.list({ size: 100, sort: 'firstName,asc' }).catch(() => ({ content: [] as Agent[] })),
      ]);
      setCall(callData);
      setAgents(agentResult.content);
      setSelectedAgentId(callData.agentId ? String(callData.agentId) : '');
    } catch (err) {
      if (err instanceof ApiClientError || err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to load call details.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [callId, validId]);

  useEffect(() => {
    void loadCall();
  }, [loadCall]);

  const handleAssignSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!call) {
      return;
    }

    setActionError(null);
    const parsedAgentId = Number(selectedAgentId);
    if (!selectedAgentId || !Number.isFinite(parsedAgentId) || parsedAgentId <= 0) {
      setActionError('Select an eligible agent to assign.');
      return;
    }

    setIsAssigning(true);
    try {
      const updated = await callsApi.assign(call.id, parsedAgentId);
      setCall(updated);
      setSelectedAgentId(updated.agentId ? String(updated.agentId) : '');
      setStatusMessage(`Assigned Call #${updated.id} to ${updated.agentName ?? 'selected agent'}.`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to assign agent.');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleStatusTransition = async (targetStatus: CallStatus) => {
    if (!call) {
      return;
    }

    setActionError(null);

    let parsedDuration: number | undefined;
    if (targetStatus === 'COMPLETED' && durationOverride.trim() !== '') {
      parsedDuration = Number(durationOverride);
      if (!Number.isFinite(parsedDuration) || parsedDuration < 0) {
        setActionError('Duration override cannot be negative.');
        return;
      }
    }

    setUpdatingStatus(targetStatus);
    try {
      const updated = await callsApi.updateStatus(call.id, {
        status: targetStatus,
        durationSeconds: parsedDuration,
      });
      setCall(updated);
      setDurationOverride('');
      setStatusMessage(
        `Updated Call #${updated.id} status to ${CALL_STATUS_META[updated.status].label}.`,
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update call status.');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleAddNote = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!call) {
      return;
    }

    const trimmed = noteContent.trim();
    if (!trimmed) {
      setNoteError('Note content is required');
      return;
    }
    if (trimmed.length > 2000) {
      setNoteError('Note content must not exceed 2000 characters');
      return;
    }

    setNoteError(null);
    setActionError(null);
    setIsAddingNote(true);

    try {
      const createdNote = await callsApi.addNote(call.id, { content: trimmed });
      setCall((prev) =>
        prev
          ? {
              ...prev,
              notes: [...prev.notes, createdNote],
            }
          : prev,
      );
      setNoteContent('');
      setStatusMessage(`Added note to Call #${call.id}.`);
    } catch (err) {
      setNoteError(err instanceof Error ? err.message : 'Unable to add call note.');
    } finally {
      setIsAddingNote(false);
    }
  };

  if (isLoading && !call) {
    return <LoadingSpinner label="Loading call details..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/calls"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg px-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to calls</span>
        </Link>
      </div>

      {error && !call ? (
        <ErrorBanner
          title="Unable to load call"
          message={error}
          action={
            validId ? (
              <Button variant="secondary" onClick={() => void loadCall()}>
                Retry
              </Button>
            ) : undefined
          }
        />
      ) : (
        call && (
          <>
            <PageHeader
              title={`Call #${call.id}`}
              description={`Customer: ${call.customerName} • Logged ${formatDateTime(call.createdAt)}`}
              actions={
                <>
                  <Badge tone={CALL_STATUS_META[call.status].tone}>
                    {CALL_STATUS_META[call.status].label}
                  </Badge>
                  <Button variant="secondary" onClick={() => void loadCall()} disabled={isLoading}>
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </Button>
                </>
              }
            />

            {statusMessage && (
              <div
                role="status"
                className="flex items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900"
              >
                <div className="flex items-center gap-2.5 text-sm font-medium">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                  <span>{statusMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setStatusMessage(null)}
                  aria-label="Dismiss notification"
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-emerald-700 hover:bg-emerald-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {actionError && <ErrorBanner title="Action failed" message={actionError} />}

            <div className="grid gap-6 lg:grid-cols-3">
              <Card title="Call Overview" className="lg:col-span-2">
                <dl className="grid gap-5 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <User className="h-3.5 w-3.5" />
                      <span>Customer</span>
                    </dt>
                    <dd className="mt-1">
                      <Link
                        to={`/customers/${call.customerId}`}
                        className="font-semibold text-brand-600 hover:underline"
                      >
                        {call.customerName}
                      </Link>
                      <p className="mt-0.5 text-xs text-slate-500">{call.customerEmail}</p>
                      <p className="text-xs text-slate-500">{call.customerPhoneNumber}</p>
                    </dd>
                  </div>

                  <div>
                    <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <Headset className="h-3.5 w-3.5" />
                      <span>Assigned Agent</span>
                    </dt>
                    <dd className="mt-1">
                      <p className="font-semibold text-slate-900">
                        {call.agentName ?? 'Unassigned'}
                      </p>
                      {call.agentEmail && (
                        <p className="mt-0.5 text-xs text-slate-500">{call.agentEmail}</p>
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Started At</span>
                    </dt>
                    <dd className="mt-1 text-slate-700">{formatDateTime(call.startedAt)}</dd>
                  </div>

                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Ended At
                    </dt>
                    <dd className="mt-1 text-slate-700">{formatDateTime(call.endedAt)}</dd>
                  </div>

                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Duration
                    </dt>
                    <dd className="mt-1 font-medium text-slate-900">
                      {formatDuration(call.durationSeconds)}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Last Updated
                    </dt>
                    <dd className="mt-1 text-slate-700">{formatDateTime(call.updatedAt)}</dd>
                  </div>
                </dl>
              </Card>

              <Card
                title="Workflow Controls"
                subtitle={
                  isTerminalCallStatus(call.status)
                    ? 'This call has reached a terminal state.'
                    : 'Reassign agent or transition lifecycle status.'
                }
              >
                <div className="space-y-6">
                  <form onSubmit={handleAssignSubmit} className="space-y-3">
                    <label
                      htmlFor="assign-agent-select"
                      className="block text-sm font-medium text-slate-700"
                    >
                      Assign agent
                    </label>
                    <select
                      id="assign-agent-select"
                      value={selectedAgentId}
                      disabled={isTerminalCallStatus(call.status) || isAssigning}
                      onChange={(e) => setSelectedAgentId(e.target.value)}
                      className="block min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:bg-slate-100"
                    >
                      <option value="">Select an agent...</option>
                      {agents.map((agent) => (
                        <option
                          key={agent.id}
                          value={agent.id}
                          disabled={agent.availabilityStatus === 'OFFLINE'}
                        >
                          {agent.firstName} {agent.lastName} ({agent.availabilityStatus})
                        </option>
                      ))}
                    </select>
                    <Button
                      type="submit"
                      variant="secondary"
                      className="w-full"
                      disabled={isTerminalCallStatus(call.status) || isAssigning}
                    >
                      {isAssigning ? 'Assigning...' : 'Assign agent'}
                    </Button>
                  </form>

                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-sm font-medium text-slate-700">Status transitions</p>
                    {CALL_ALLOWED_TRANSITIONS[call.status].length === 0 ? (
                      <p className="mt-2 text-xs text-slate-500">
                        No further status transitions are allowed once a call is{' '}
                        {CALL_STATUS_META[call.status].label.toLowerCase()}.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {CALL_ALLOWED_TRANSITIONS[call.status].includes('COMPLETED') && (
                          <div>
                            <label
                              htmlFor="duration-override"
                              className="block text-xs font-medium text-slate-600"
                            >
                              Optional duration (seconds)
                            </label>
                            <input
                              id="duration-override"
                              type="number"
                              min={0}
                              value={durationOverride}
                              onChange={(e) => setDurationOverride(e.target.value)}
                              placeholder="Auto-calculate from timestamps"
                              className="mt-1 block min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                            />
                          </div>
                        )}

                        <div className="flex flex-col gap-2">
                          {CALL_ALLOWED_TRANSITIONS[call.status].map((nextStatus) => {
                            const meta = CALL_STATUS_META[nextStatus];
                            const variant =
                              nextStatus === 'COMPLETED' || nextStatus === 'IN_PROGRESS'
                                ? 'primary'
                                : nextStatus === 'MISSED'
                                  ? 'danger'
                                  : 'secondary';
                            return (
                              <Button
                                key={nextStatus}
                                variant={variant}
                                className="w-full"
                                disabled={updatingStatus !== null}
                                onClick={() => void handleStatusTransition(nextStatus)}
                              >
                                {updatingStatus === nextStatus
                                  ? 'Updating...'
                                  : `Mark ${meta.label}`}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            <Card
              title="Notes Timeline"
              subtitle={`${call.notes.length} note${call.notes.length === 1 ? '' : 's'} recorded`}
              action={<MessageSquarePlus className="h-5 w-5 text-brand-600" />}
            >
              <div className="space-y-6">
                <form onSubmit={handleAddNote} noValidate className="space-y-3">
                  <div>
                    <label htmlFor="call-note-input" className="block text-sm font-medium text-slate-700">
                      Add call note
                    </label>
                    <textarea
                      id="call-note-input"
                      rows={3}
                      maxLength={2000}
                      value={noteContent}
                      onChange={(e) => {
                        setNoteContent(e.target.value);
                        if (noteError) {
                          setNoteError(null);
                        }
                      }}
                      aria-invalid={Boolean(noteError)}
                      aria-describedby={noteError ? 'call-note-error' : undefined}
                      placeholder="Document troubleshooting steps, customer context, or resolution details..."
                      className={`mt-1.5 block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                        noteError
                          ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                          : 'border-slate-300 focus:border-brand-500 focus:ring-brand-200'
                      }`}
                    />
                    {noteError && (
                      <p id="call-note-error" className="mt-1.5 text-xs font-medium text-rose-600">
                        {noteError}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-500">{noteContent.length}/2000</span>
                    <Button type="submit" disabled={isAddingNote}>
                      {isAddingNote ? 'Adding note...' : 'Add note'}
                    </Button>
                  </div>
                </form>

                {call.notes.length === 0 ? (
                  <EmptyState
                    title="No notes added yet"
                    description="Notes added during or after the call appear chronologically here."
                  />
                ) : (
                  <ol className="space-y-3 border-t border-slate-100 pt-5">
                    {call.notes.map((note) => (
                      <li
                        key={note.id}
                        className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                          <span className="font-semibold text-slate-900">{note.authorName}</span>
                          <span>{formatDateTime(note.createdAt)}</span>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                          {note.content}
                        </p>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </Card>
          </>
        )
      )}
    </div>
  );
}
