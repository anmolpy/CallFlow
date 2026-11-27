import { useEffect, useState, type FormEvent } from 'react';
import { ApiClientError, agentsApi } from '../../api';
import type { Agent, AgentAvailabilityStatus, AgentRequest } from '../../types/api';
import { AGENT_AVAILABILITY_META, ALL_AGENT_STATUSES } from '../../utils/format';
import { Button, ErrorBanner, Modal } from '../ui';

interface AgentFormModalProps {
  open: boolean;
  agent: Agent | null;
  onClose: () => void;
  onSaved: (agent: Agent, mode: 'create' | 'edit') => void;
}

interface AgentFieldErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateAgent(values: AgentRequest): AgentFieldErrors {
  const errors: AgentFieldErrors = {};

  if (!values.firstName) {
    errors.firstName = 'First name is required';
  } else if (values.firstName.length > 100) {
    errors.firstName = 'First name must not exceed 100 characters';
  }

  if (!values.lastName) {
    errors.lastName = 'Last name is required';
  } else if (values.lastName.length > 100) {
    errors.lastName = 'Last name must not exceed 100 characters';
  }

  if (!values.email) {
    errors.email = 'Email is required';
  } else if (!EMAIL_PATTERN.test(values.email)) {
    errors.email = 'Email must be a valid email address';
  } else if (values.email.length > 255) {
    errors.email = 'Email must not exceed 255 characters';
  }

  return errors;
}

export function AgentFormModal({ open, agent, onClose, onSaved }: AgentFormModalProps) {
  const isEditing = Boolean(agent);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [availabilityStatus, setAvailabilityStatus] =
    useState<AgentAvailabilityStatus>('AVAILABLE');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<AgentFieldErrors>({});

  useEffect(() => {
    if (!open) {
      return;
    }
    setFirstName(agent?.firstName ?? '');
    setLastName(agent?.lastName ?? '');
    setEmail(agent?.email ?? '');
    setAvailabilityStatus(agent?.availabilityStatus ?? 'AVAILABLE');
    setFormError(null);
    setFieldErrors({});
  }, [open, agent]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const payload: AgentRequest = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      availabilityStatus,
    };

    const validationErrors = validateAgent(payload);
    if (validationErrors.firstName || validationErrors.lastName || validationErrors.email) {
      setFieldErrors(validationErrors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const saved = agent
        ? await agentsApi.update(agent.id, payload)
        : await agentsApi.create(payload);
      onSaved(saved, agent ? 'edit' : 'create');
    } catch (error) {
      if (error instanceof ApiClientError) {
        const mapped: AgentFieldErrors = {};
        for (const item of error.fieldErrors) {
          if (item.field === 'firstName' && !mapped.firstName) {
            mapped.firstName = item.message;
          } else if (item.field === 'lastName' && !mapped.lastName) {
            mapped.lastName = item.message;
          } else if (item.field === 'email' && !mapped.email) {
            mapped.email = item.message;
          }
        }
        setFieldErrors(mapped);
        setFormError(error.message);
      } else if (error instanceof Error) {
        setFormError(error.message);
      } else {
        setFormError('Unable to save agent record. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit agent' : 'Add agent'}
      subtitle={
        isEditing
          ? 'Update agent profile details and initial roster status.'
          : 'Add a new support agent to the CallFlow team roster.'
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && <ErrorBanner title="Could not save agent" message={formError} />}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="agent-first-name" className="block text-sm font-medium text-slate-700">
              First name
            </label>
            <input
              id="agent-first-name"
              type="text"
              autoFocus
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                if (fieldErrors.firstName) {
                  setFieldErrors((prev) => ({ ...prev, firstName: undefined }));
                }
              }}
              aria-invalid={Boolean(fieldErrors.firstName)}
              aria-describedby={fieldErrors.firstName ? 'agent-first-name-error' : undefined}
              placeholder="Jordan"
              className={`mt-1.5 block min-h-[44px] w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                fieldErrors.firstName
                  ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                  : 'border-slate-300 focus:border-brand-500 focus:ring-brand-200'
              }`}
            />
            {fieldErrors.firstName && (
              <p id="agent-first-name-error" className="mt-1.5 text-xs font-medium text-rose-600">
                {fieldErrors.firstName}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="agent-last-name" className="block text-sm font-medium text-slate-700">
              Last name
            </label>
            <input
              id="agent-last-name"
              type="text"
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value);
                if (fieldErrors.lastName) {
                  setFieldErrors((prev) => ({ ...prev, lastName: undefined }));
                }
              }}
              aria-invalid={Boolean(fieldErrors.lastName)}
              aria-describedby={fieldErrors.lastName ? 'agent-last-name-error' : undefined}
              placeholder="Taylor"
              className={`mt-1.5 block min-h-[44px] w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                fieldErrors.lastName
                  ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                  : 'border-slate-300 focus:border-brand-500 focus:ring-brand-200'
              }`}
            />
            {fieldErrors.lastName && (
              <p id="agent-last-name-error" className="mt-1.5 text-xs font-medium text-rose-600">
                {fieldErrors.lastName}
              </p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="agent-email" className="block text-sm font-medium text-slate-700">
            Work email
          </label>
          <input
            id="agent-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) {
                setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }
            }}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? 'agent-email-error' : undefined}
            placeholder="jordan.taylor@callflow.example"
            className={`mt-1.5 block min-h-[44px] w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
              fieldErrors.email
                ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                : 'border-slate-300 focus:border-brand-500 focus:ring-brand-200'
            }`}
          />
          {fieldErrors.email && (
            <p id="agent-email-error" className="mt-1.5 text-xs font-medium text-rose-600">
              {fieldErrors.email}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="agent-status" className="block text-sm font-medium text-slate-700">
            Availability status
          </label>
          <select
            id="agent-status"
            value={availabilityStatus}
            onChange={(e) => setAvailabilityStatus(e.target.value as AgentAvailabilityStatus)}
            className="mt-1.5 block min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          >
            {ALL_AGENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {AGENT_AVAILABILITY_META[status].label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isEditing ? 'Save agent' : 'Create agent'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
