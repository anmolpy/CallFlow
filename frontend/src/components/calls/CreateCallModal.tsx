import { useEffect, useState, type FormEvent } from 'react';
import { ApiClientError, agentsApi, callsApi, customersApi } from '../../api';
import type { Agent, CallDetail, CallStatus, Customer } from '../../types/api';
import { ALL_CALL_STATUSES, CALL_STATUS_META } from '../../utils/format';
import { Button, ErrorBanner, Modal } from '../ui';

interface CreateCallModalProps {
  open: boolean;
  presetCustomer?: Customer | null;
  onClose: () => void;
  onCreated: (call: CallDetail) => void;
}

interface CallFormErrors {
  customerId?: string;
  agentId?: string;
  startedAt?: string;
  endedAt?: string;
  durationSeconds?: string;
  initialNote?: string;
}

function toLocalDateTimeInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

export function CreateCallModal({
  open,
  presetCustomer = null,
  onClose,
  onCreated,
}: CreateCallModalProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(false);

  const [customerId, setCustomerId] = useState('');
  const [agentId, setAgentId] = useState('');
  const [status, setStatus] = useState<CallStatus>('QUEUED');
  const [startedAt, setStartedAt] = useState('');
  const [endedAt, setEndedAt] = useState('');
  const [durationSeconds, setDurationSeconds] = useState('');
  const [initialNote, setInitialNote] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<CallFormErrors>({});

  useEffect(() => {
    if (!open) {
      return;
    }

    setCustomerId(presetCustomer ? String(presetCustomer.id) : '');
    setAgentId('');
    setStatus('QUEUED');
    setStartedAt('');
    setEndedAt('');
    setDurationSeconds('');
    setInitialNote('');
    setFormError(null);
    setFieldErrors({});

    let cancelled = false;
    setLoadingLookups(true);

    Promise.all([
      presetCustomer
        ? Promise.resolve({ content: [presetCustomer] })
        : customersApi.list({ size: 100, sort: 'lastName,asc' }),
      agentsApi.list({ size: 100, sort: 'firstName,asc' }),
    ])
      .then(([customerPage, agentPage]) => {
        if (cancelled) {
          return;
        }
        setCustomers(customerPage.content);
        setAgents(agentPage.content);
        if (!presetCustomer && customerPage.content.length > 0) {
          setCustomerId(String(customerPage.content[0].id));
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setFormError(
            err instanceof Error ? err.message : 'Unable to load customers and agents.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingLookups(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, presetCustomer]);

  const handleStatusChange = (nextStatus: CallStatus) => {
    setStatus(nextStatus);
    if (nextStatus === 'COMPLETED' && !startedAt && !endedAt) {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      setStartedAt(toLocalDateTimeInputValue(fiveMinutesAgo));
      setEndedAt(toLocalDateTimeInputValue(now));
    }
    setFieldErrors((prev) => ({
      ...prev,
      startedAt: undefined,
      endedAt: undefined,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const errors: CallFormErrors = {};
    const parsedCustomerId = Number(customerId);
    if (!customerId || !Number.isFinite(parsedCustomerId) || parsedCustomerId <= 0) {
      errors.customerId = 'Select a customer';
    }

    let parsedDuration: number | undefined;
    if (durationSeconds.trim() !== '') {
      parsedDuration = Number(durationSeconds);
      if (!Number.isFinite(parsedDuration) || parsedDuration < 0) {
        errors.durationSeconds = 'Duration cannot be negative';
      }
    }

    if (status === 'COMPLETED') {
      if (!startedAt) {
        errors.startedAt = 'Start time is required for a completed call';
      }
      if (!endedAt) {
        errors.endedAt = 'End time is required for a completed call';
      }
    }

    if (startedAt && endedAt && new Date(endedAt) < new Date(startedAt)) {
      errors.endedAt = 'End time cannot precede start time';
    } else if (endedAt && !startedAt) {
      errors.startedAt = 'Start time is required when end time is provided';
    }

    if (initialNote.trim().length > 2000) {
      errors.initialNote = 'Initial note must not exceed 2000 characters';
    }

    if (Object.values(errors).some(Boolean)) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const created = await callsApi.create({
        customerId: parsedCustomerId,
        agentId: agentId ? Number(agentId) : null,
        status,
        startedAt: startedAt ? new Date(startedAt).toISOString() : undefined,
        endedAt: endedAt ? new Date(endedAt).toISOString() : undefined,
        durationSeconds: parsedDuration,
        initialNote: initialNote.trim() || undefined,
      });
      onCreated(created);
    } catch (error) {
      if (error instanceof ApiClientError) {
        const mapped: CallFormErrors = {};
        for (const item of error.fieldErrors) {
          if (item.field === 'customerId' && !mapped.customerId) {
            mapped.customerId = item.message;
          } else if (item.field === 'agentId' && !mapped.agentId) {
            mapped.agentId = item.message;
          } else if (item.field === 'durationSeconds' && !mapped.durationSeconds) {
            mapped.durationSeconds = item.message;
          } else if (item.field === 'initialNote' && !mapped.initialNote) {
            mapped.initialNote = item.message;
          }
        }
        setFieldErrors(mapped);
        setFormError(error.message);
      } else if (error instanceof Error) {
        setFormError(error.message);
      } else {
        setFormError('Unable to create call. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Log support call"
      subtitle="Create a new support call record and optionally assign an available agent."
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && <ErrorBanner title="Could not create call" message={formError} />}

        <div>
          <label htmlFor="call-customer" className="block text-sm font-medium text-slate-700">
            Customer
          </label>
          <select
            id="call-customer"
            value={customerId}
            disabled={Boolean(presetCustomer) || loadingLookups}
            onChange={(e) => {
              setCustomerId(e.target.value);
              if (fieldErrors.customerId) {
                setFieldErrors((prev) => ({ ...prev, customerId: undefined }));
              }
            }}
            aria-invalid={Boolean(fieldErrors.customerId)}
            aria-describedby={fieldErrors.customerId ? 'call-customer-error' : undefined}
            className="mt-1.5 block min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:bg-slate-100"
          >
            {customers.length === 0 ? (
              <option value="">{loadingLookups ? 'Loading customers...' : 'No customers found'}</option>
            ) : (
              customers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.firstName} {item.lastName} ({item.email})
                </option>
              ))
            )}
          </select>
          {fieldErrors.customerId && (
            <p id="call-customer-error" className="mt-1.5 text-xs font-medium text-rose-600">
              {fieldErrors.customerId}
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="call-agent" className="block text-sm font-medium text-slate-700">
              Assign agent (optional)
            </label>
            <select
              id="call-agent"
              value={agentId}
              disabled={loadingLookups}
              onChange={(e) => setAgentId(e.target.value)}
              className="mt-1.5 block min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:bg-slate-100"
            >
              <option value="">Unassigned</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id} disabled={agent.availabilityStatus === 'OFFLINE'}>
                  {agent.firstName} {agent.lastName} ({agent.availabilityStatus})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="call-status" className="block text-sm font-medium text-slate-700">
              Initial status
            </label>
            <select
              id="call-status"
              value={status}
              onChange={(e) => handleStatusChange(e.target.value as CallStatus)}
              className="mt-1.5 block min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            >
              {ALL_CALL_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {CALL_STATUS_META[item].label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {status === 'COMPLETED' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="call-started-at" className="block text-sm font-medium text-slate-700">
                Started at
              </label>
              <input
                id="call-started-at"
                type="datetime-local"
                value={startedAt}
                onChange={(e) => {
                  setStartedAt(e.target.value);
                  if (fieldErrors.startedAt) {
                    setFieldErrors((prev) => ({ ...prev, startedAt: undefined }));
                  }
                }}
                aria-invalid={Boolean(fieldErrors.startedAt)}
                className="mt-1.5 block min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
              {fieldErrors.startedAt && (
                <p className="mt-1.5 text-xs font-medium text-rose-600">{fieldErrors.startedAt}</p>
              )}
            </div>

            <div>
              <label htmlFor="call-ended-at" className="block text-sm font-medium text-slate-700">
                Ended at
              </label>
              <input
                id="call-ended-at"
                type="datetime-local"
                value={endedAt}
                onChange={(e) => {
                  setEndedAt(e.target.value);
                  if (fieldErrors.endedAt) {
                    setFieldErrors((prev) => ({ ...prev, endedAt: undefined }));
                  }
                }}
                aria-invalid={Boolean(fieldErrors.endedAt)}
                className="mt-1.5 block min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
              {fieldErrors.endedAt && (
                <p className="mt-1.5 text-xs font-medium text-rose-600">{fieldErrors.endedAt}</p>
              )}
            </div>
          </div>
        )}

        <div>
          <label htmlFor="call-duration" className="block text-sm font-medium text-slate-700">
            Duration in seconds (optional)
          </label>
          <input
            id="call-duration"
            type="number"
            min={0}
            value={durationSeconds}
            onChange={(e) => {
              setDurationSeconds(e.target.value);
              if (fieldErrors.durationSeconds) {
                setFieldErrors((prev) => ({ ...prev, durationSeconds: undefined }));
              }
            }}
            placeholder="Auto-calculated from start and end times"
            className="mt-1.5 block min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
          {fieldErrors.durationSeconds && (
            <p className="mt-1.5 text-xs font-medium text-rose-600">{fieldErrors.durationSeconds}</p>
          )}
        </div>

        <div>
          <label htmlFor="call-initial-note" className="block text-sm font-medium text-slate-700">
            Initial note (optional)
          </label>
          <textarea
            id="call-initial-note"
            rows={3}
            maxLength={2000}
            value={initialNote}
            onChange={(e) => {
              setInitialNote(e.target.value);
              if (fieldErrors.initialNote) {
                setFieldErrors((prev) => ({ ...prev, initialNote: undefined }));
              }
            }}
            placeholder="Summary of the customer request or issue..."
            className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
          {fieldErrors.initialNote && (
            <p className="mt-1.5 text-xs font-medium text-rose-600">{fieldErrors.initialNote}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || loadingLookups}>
            {isSubmitting ? 'Creating call...' : 'Create call'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
