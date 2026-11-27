import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, Mail, Pencil, Plus, Search, X } from 'lucide-react';
import { ApiClientError, agentsApi } from '../api';
import { AgentFormModal } from '../components/agents/AgentFormModal';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  LoadingSpinner,
  PageHeader,
  PaginationBar,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import type { Agent, AgentAvailabilityStatus, PageResponse } from '../types/api';
import {
  AGENT_AVAILABILITY_META,
  ALL_AGENT_STATUSES,
  formatDateTime,
} from '../utils/format';

const PAGE_SIZE = 10;

const SORT_OPTIONS = [
  { value: 'createdAt,desc', label: 'Newest first' },
  { value: 'lastName,asc', label: 'Last name (A–Z)' },
  { value: 'firstName,asc', label: 'First name (A–Z)' },
  { value: 'availabilityStatus,asc', label: 'Availability status' },
];

export function AgentsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [agentsPage, setAgentsPage] = useState<PageResponse<Agent> | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState<AgentAvailabilityStatus | ''>('');
  const [sort, setSort] = useState('createdAt,desc');
  const [page, setPage] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [updatingAgentId, setUpdatingAgentId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  const fetchAgents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await agentsApi.list({
        query: appliedQuery || undefined,
        availabilityStatus: availabilityFilter || undefined,
        page,
        size: PAGE_SIZE,
        sort,
      });
      setAgentsPage(result);
    } catch (err) {
      if (err instanceof ApiClientError || err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to load agents.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [appliedQuery, availabilityFilter, page, sort]);

  useEffect(() => {
    void fetchAgents();
  }, [fetchAgents]);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = searchInput.trim();
    if (next === appliedQuery && page === 0) {
      void fetchAgents();
      return;
    }
    setPage(0);
    setAppliedQuery(next);
  };

  const hasFilters = Boolean(searchInput || appliedQuery || availabilityFilter);

  const handleClearFilters = () => {
    setSearchInput('');
    setAppliedQuery('');
    setAvailabilityFilter('');
    setPage(0);
  };

  const handleAvailabilityChange = async (
    agent: Agent,
    nextStatus: AgentAvailabilityStatus,
  ) => {
    if (agent.availabilityStatus === nextStatus) {
      return;
    }

    setError(null);
    setUpdatingAgentId(agent.id);

    try {
      const updated = await agentsApi.updateAvailability(agent.id, nextStatus);
      setAgentsPage((prev) =>
        prev
          ? {
              ...prev,
              content: prev.content.map((item) => (item.id === updated.id ? updated : item)),
            }
          : prev,
      );
      setStatusMessage(
        `Updated ${updated.firstName} ${updated.lastName} availability to ${AGENT_AVAILABILITY_META[updated.availabilityStatus].label}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update agent availability.');
    } finally {
      setUpdatingAgentId(null);
    }
  };

  const openCreateModal = () => {
    setEditingAgent(null);
    setModalOpen(true);
  };

  const openEditModal = (agent: Agent) => {
    setEditingAgent(agent);
    setModalOpen(true);
  };

  const handleAgentSaved = (saved: Agent, mode: 'create' | 'edit') => {
    setModalOpen(false);
    setEditingAgent(null);
    setStatusMessage(
      mode === 'create'
        ? `Added agent ${saved.firstName} ${saved.lastName}.`
        : `Updated agent ${saved.firstName} ${saved.lastName}.`,
    );

    if (mode === 'create' && page !== 0) {
      setPage(0);
    } else {
      void fetchAgents();
    }
  };

  const agents = agentsPage?.content ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agents"
        description="View support agent availability, manage live roster status, and administer team accounts."
        actions={
          isAdmin ? (
            <Button onClick={openCreateModal}>
              <Plus className="h-4 w-4" />
              <span>Add agent</span>
            </Button>
          ) : undefined
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

      {error && (
        <ErrorBanner
          title="Unable to update agents"
          message={error}
          action={
            <Button variant="secondary" onClick={() => void fetchAgents()}>
              Retry
            </Button>
          }
        />
      )}

      <Card
        title="Agent Roster"
        subtitle={
          agentsPage
            ? `${agentsPage.totalElements.toLocaleString()} agent${
                agentsPage.totalElements === 1 ? '' : 's'
              } in directory`
            : 'Filter by agent name, email, or availability status'
        }
        action={!isAdmin ? <Badge tone="neutral">Admin role required to create/edit</Badge> : undefined}
      >
        <div className="space-y-5">
          <form
            onSubmit={handleSearchSubmit}
            className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
          >
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  aria-label="Search agents"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search agents by name or email..."
                  className="block min-h-[44px] w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button type="submit" variant="secondary">
                  Search
                </Button>
                {hasFilters && (
                  <Button variant="ghost" onClick={handleClearFilters}>
                    Clear filters
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Filter by availability"
                value={availabilityFilter}
                onChange={(e) => {
                  setPage(0);
                  setAvailabilityFilter(e.target.value as AgentAvailabilityStatus | '');
                }}
                className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              >
                <option value="">All availability</option>
                {ALL_AGENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {AGENT_AVAILABILITY_META[status].label}
                  </option>
                ))}
              </select>

              <select
                aria-label="Sort agents"
                value={sort}
                onChange={(e) => {
                  setPage(0);
                  setSort(e.target.value);
                }}
                className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </form>

          {isLoading && !agentsPage ? (
            <LoadingSpinner label="Loading agent roster..." />
          ) : agents.length === 0 ? (
            hasFilters ? (
              <EmptyState
                title="No matching agents"
                description="Try clearing your search or availability filter."
                action={
                  <Button variant="secondary" onClick={handleClearFilters}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <EmptyState
                title="No agents found"
                description="Support agents will appear here once added to the roster."
                action={
                  isAdmin ? (
                    <Button onClick={openCreateModal}>
                      <Plus className="h-4 w-4" />
                      <span>Add agent</span>
                    </Button>
                  ) : undefined
                }
              />
            )
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead>
                    <tr className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <th className="py-3 pr-4">Agent</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Current Status</th>
                      <th className="px-4 py-3">Set Availability</th>
                      <th className="px-4 py-3">Joined</th>
                      {isAdmin && <th className="py-3 pl-4 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {agents.map((agent) => {
                      const meta = AGENT_AVAILABILITY_META[agent.availabilityStatus];
                      return (
                        <tr key={agent.id} className="transition-colors hover:bg-slate-50">
                          <td className="py-3.5 pr-4 font-semibold text-slate-900">
                            {agent.firstName} {agent.lastName}
                          </td>
                          <td className="px-4 py-3.5 text-slate-600">{agent.email}</td>
                          <td className="px-4 py-3.5">
                            <Badge tone={meta.tone}>{meta.label}</Badge>
                          </td>
                          <td className="px-4 py-2.5">
                            <select
                              aria-label={`Availability for ${agent.firstName} ${agent.lastName}`}
                              value={agent.availabilityStatus}
                              disabled={updatingAgentId === agent.id}
                              onChange={(e) =>
                                void handleAvailabilityChange(
                                  agent,
                                  e.target.value as AgentAvailabilityStatus,
                                )
                              }
                              className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:bg-slate-100"
                            >
                              {ALL_AGENT_STATUSES.map((status) => (
                                <option key={status} value={status}>
                                  {AGENT_AVAILABILITY_META[status].label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3.5 text-slate-500">
                            {formatDateTime(agent.createdAt)}
                          </td>
                          {isAdmin && (
                            <td className="py-2.5 pl-4 text-right">
                              <Button
                                variant="secondary"
                                aria-label={`Edit ${agent.firstName} ${agent.lastName}`}
                                onClick={() => openEditModal(agent)}
                              >
                                <Pencil className="h-4 w-4" />
                                <span>Edit</span>
                              </Button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 md:hidden">
                {agents.map((agent) => {
                  const meta = AGENT_AVAILABILITY_META[agent.availabilityStatus];
                  return (
                    <div
                      key={agent.id}
                      className="rounded-xl border border-slate-200 bg-white p-4 transition-transform duration-150 hover:-translate-y-0.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-base font-semibold text-slate-900">
                            {agent.firstName} {agent.lastName}
                          </p>
                          <p className="mt-1 flex items-center gap-1.5 break-all text-xs text-slate-500">
                            <Mail className="h-3.5 w-3.5 shrink-0" />
                            <span>{agent.email}</span>
                          </p>
                        </div>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <select
                          aria-label={`Mobile availability for ${agent.firstName} ${agent.lastName}`}
                          value={agent.availabilityStatus}
                          disabled={updatingAgentId === agent.id}
                          onChange={(e) =>
                            void handleAvailabilityChange(
                              agent,
                              e.target.value as AgentAvailabilityStatus,
                            )
                          }
                          className="min-h-[44px] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                        >
                          {ALL_AGENT_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {AGENT_AVAILABILITY_META[status].label}
                            </option>
                          ))}
                        </select>
                        {isAdmin && (
                          <Button variant="secondary" onClick={() => openEditModal(agent)}>
                            <Pencil className="h-4 w-4" />
                            <span>Edit</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {agentsPage && (
                <PaginationBar
                  page={agentsPage.page}
                  size={agentsPage.size}
                  totalElements={agentsPage.totalElements}
                  totalPages={agentsPage.totalPages}
                  first={agentsPage.first}
                  last={agentsPage.last}
                  itemLabel="agents"
                  onPageChange={(nextPage) => setPage(nextPage)}
                />
              )}
            </>
          )}
        </div>
      </Card>

      {isAdmin && (
        <AgentFormModal
          open={modalOpen}
          agent={editingAgent}
          onClose={() => {
            setModalOpen(false);
            setEditingAgent(null);
          }}
          onSaved={handleAgentSaved}
        />
      )}
    </div>
  );
}
