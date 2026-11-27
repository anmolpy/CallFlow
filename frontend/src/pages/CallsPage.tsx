import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { ApiClientError, agentsApi, callsApi } from '../api';
import { CreateCallModal } from '../components/calls/CreateCallModal';
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
import type { Agent, CallDetail, CallStatus, CallSummary, PageResponse } from '../types/api';
import {
  ALL_CALL_STATUSES,
  CALL_STATUS_META,
  formatDateTime,
  formatDuration,
} from '../utils/format';

const PAGE_SIZE = 10;

const SORT_OPTIONS = [
  { value: 'createdAt,desc', label: 'Newest first' },
  { value: 'updatedAt,desc', label: 'Recently updated' },
  { value: 'startedAt,desc', label: 'Recently started' },
  { value: 'durationSeconds,desc', label: 'Longest duration' },
  { value: 'status,asc', label: 'Status (A–Z)' },
];

export function CallsPage() {
  const [callsPage, setCallsPage] = useState<PageResponse<CallSummary> | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);

  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CallStatus | ''>('');
  const [agentIdFilter, setAgentIdFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sort, setSort] = useState('createdAt,desc');
  const [page, setPage] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createdCallBanner, setCreatedCallBanner] = useState<CallDetail | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    agentsApi
      .list({ size: 100, sort: 'firstName,asc' })
      .then((res) => {
        if (!cancelled) {
          setAgents(res.content);
        }
      })
      .catch(() => {
        // Agent filter list is optional helper data; queue fetch reports real connectivity errors.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchCalls = useCallback(async () => {
    if (fromDate && toDate && fromDate > toDate) {
      setIsLoading(false);
      setError('Start date cannot be after end date.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await callsApi.list({
        search: appliedSearch || undefined,
        status: statusFilter || undefined,
        agentId: agentIdFilter ? Number(agentIdFilter) : undefined,
        fromDate: fromDate ? new Date(`${fromDate}T00:00:00.000Z`).toISOString() : undefined,
        toDate: toDate ? new Date(`${toDate}T23:59:59.999Z`).toISOString() : undefined,
        page,
        size: PAGE_SIZE,
        sort,
      });
      setCallsPage(result);
    } catch (err) {
      if (err instanceof ApiClientError || err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to load calls.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [agentIdFilter, appliedSearch, fromDate, page, sort, statusFilter, toDate]);

  useEffect(() => {
    void fetchCalls();
  }, [fetchCalls]);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = searchInput.trim();
    if (next === appliedSearch && page === 0) {
      void fetchCalls();
      return;
    }
    setPage(0);
    setAppliedSearch(next);
  };

  const hasActiveFilters = Boolean(
    appliedSearch || searchInput || statusFilter || agentIdFilter || fromDate || toDate,
  );

  const handleClearFilters = () => {
    setSearchInput('');
    setAppliedSearch('');
    setStatusFilter('');
    setAgentIdFilter('');
    setFromDate('');
    setToDate('');
    setPage(0);
  };

  const handleCallCreated = (created: CallDetail) => {
    setCreateOpen(false);
    setCreatedCallBanner(created);
    if (page !== 0) {
      setPage(0);
    } else {
      void fetchCalls();
    }
  };

  const calls = callsPage?.content ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calls"
        description="Search support calls, filter by status or agent, and log new calls."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => void fetchCalls()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              <span>Log call</span>
            </Button>
          </>
        }
      />

      {createdCallBanner && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900"
        >
          <div className="flex items-center gap-2.5 text-sm font-medium">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            <span>
              Created Call #{createdCallBanner.id} for {createdCallBanner.customerName}.
            </span>
            <Link
              to={`/calls/${createdCallBanner.id}`}
              className="font-semibold text-emerald-800 underline hover:text-emerald-950"
            >
              Open call details
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setCreatedCallBanner(null)}
            aria-label="Dismiss notification"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-emerald-700 hover:bg-emerald-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <ErrorBanner
          title="Unable to load calls"
          message={error}
          action={
            <Button variant="secondary" onClick={() => void fetchCalls()}>
              Retry
            </Button>
          }
        />
      )}

      <Card
        title="Call Queue"
        subtitle={
          callsPage
            ? `${callsPage.totalElements.toLocaleString()} call${
                callsPage.totalElements === 1 ? '' : 's'
              } matching current filters`
            : 'Filter by keyword, status, assigned agent, or date range'
        }
        action={
          hasActiveFilters ? (
            <Button variant="ghost" onClick={handleClearFilters}>
              Clear filters
            </Button>
          ) : undefined
        }
      >
        <div className="space-y-5">
          <form onSubmit={handleSearchSubmit} className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  aria-label="Search calls"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search customer or agent name, email, or phone..."
                  className="block min-h-[44px] w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
              </div>
              <Button type="submit" variant="secondary">
                Search
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label htmlFor="calls-status-filter" className="block text-xs font-medium text-slate-600">
                  Status
                </label>
                <select
                  id="calls-status-filter"
                  aria-label="Filter by status"
                  value={statusFilter}
                  onChange={(e) => {
                    setPage(0);
                    setStatusFilter(e.target.value as CallStatus | '');
                  }}
                  className="mt-1 block min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                >
                  <option value="">All statuses</option>
                  {ALL_CALL_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {CALL_STATUS_META[status].label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="calls-agent-filter" className="block text-xs font-medium text-slate-600">
                  Assigned agent
                </label>
                <select
                  id="calls-agent-filter"
                  aria-label="Filter by agent"
                  value={agentIdFilter}
                  onChange={(e) => {
                    setPage(0);
                    setAgentIdFilter(e.target.value);
                  }}
                  className="mt-1 block min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                >
                  <option value="">All agents</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.firstName} {agent.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="calls-from-date" className="block text-xs font-medium text-slate-600">
                  From date
                </label>
                <input
                  id="calls-from-date"
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setPage(0);
                    setFromDate(e.target.value);
                  }}
                  className="mt-1 block min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
              </div>

              <div>
                <label htmlFor="calls-to-date" className="block text-xs font-medium text-slate-600">
                  To date
                </label>
                <input
                  id="calls-to-date"
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setPage(0);
                    setToDate(e.target.value);
                  }}
                  className="mt-1 block min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
              </div>

              <div>
                <label htmlFor="calls-sort" className="block text-xs font-medium text-slate-600">
                  Sort
                </label>
                <select
                  id="calls-sort"
                  aria-label="Sort calls"
                  value={sort}
                  onChange={(e) => {
                    setPage(0);
                    setSort(e.target.value);
                  }}
                  className="mt-1 block min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </form>

          {isLoading && !callsPage ? (
            <LoadingSpinner label="Loading call queue..." />
          ) : calls.length === 0 ? (
            hasActiveFilters ? (
              <EmptyState
                title="No matching calls"
                description="Try adjusting your status, agent, keyword, or date range filters."
                action={
                  <Button variant="secondary" onClick={handleClearFilters}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <EmptyState
                title="No calls recorded yet"
                description="Log your first support call to track assignment, duration, and resolution notes."
                action={
                  <Button onClick={() => setCreateOpen(true)}>
                    <Plus className="h-4 w-4" />
                    <span>Log call</span>
                  </Button>
                }
              />
            )
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead>
                    <tr className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <th className="py-3 pr-4">Call</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Assigned Agent</th>
                      <th className="px-4 py-3 text-right">Duration</th>
                      <th className="px-4 py-3 text-right">Notes</th>
                      <th className="px-4 py-3">Logged</th>
                      <th className="py-3 pl-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {calls.map((call) => {
                      const statusMeta = CALL_STATUS_META[call.status];
                      return (
                        <tr key={call.id} className="transition-colors hover:bg-slate-50">
                          <td className="py-3.5 pr-4 font-semibold text-slate-900">
                            <Link
                              to={`/calls/${call.id}`}
                              className="hover:text-brand-700 hover:underline"
                            >
                              #{call.id}
                            </Link>
                          </td>
                          <td className="px-4 py-3.5">
                            <Link
                              to={`/customers/${call.customerId}`}
                              className="font-medium text-slate-900 hover:text-brand-700 hover:underline"
                            >
                              {call.customerName}
                            </Link>
                            <p className="text-xs text-slate-500">{call.customerEmail}</p>
                          </td>
                          <td className="px-4 py-3.5">
                            <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                          </td>
                          <td className="px-4 py-3.5 text-slate-700">
                            {call.agentName ?? <span className="text-slate-400">Unassigned</span>}
                          </td>
                          <td className="px-4 py-3.5 text-right text-slate-700">
                            {formatDuration(call.durationSeconds)}
                          </td>
                          <td className="px-4 py-3.5 text-right text-slate-700">
                            {call.noteCount}
                          </td>
                          <td className="px-4 py-3.5 text-slate-500">
                            {formatDateTime(call.createdAt)}
                          </td>
                          <td className="py-2.5 pl-4 text-right">
                            <Link
                              to={`/calls/${call.id}`}
                              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 hover:text-brand-700"
                            >
                              <span>View details</span>
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 md:hidden">
                {calls.map((call) => {
                  const statusMeta = CALL_STATUS_META[call.status];
                  return (
                    <div
                      key={call.id}
                      className="rounded-xl border border-slate-200 bg-white p-4 transition-transform duration-150 hover:-translate-y-0.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Link
                            to={`/calls/${call.id}`}
                            className="text-base font-semibold text-slate-900 hover:text-brand-700 hover:underline"
                          >
                            Call #{call.id} — {call.customerName}
                          </Link>
                          <p className="mt-0.5 text-xs text-slate-500">{call.customerEmail}</p>
                        </div>
                        <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                        <span>Agent: {call.agentName ?? 'Unassigned'}</span>
                        <span>Duration: {formatDuration(call.durationSeconds)}</span>
                        <span className="inline-flex items-center gap-1">
                          <MessageSquare className="h-3.5 w-3.5" />
                          {call.noteCount}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Logged {formatDateTime(call.createdAt)}
                      </p>

                      <div className="mt-4">
                        <Link
                          to={`/calls/${call.id}`}
                          className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100"
                        >
                          <span>View details</span>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>

              {callsPage && (
                <PaginationBar
                  page={callsPage.page}
                  size={callsPage.size}
                  totalElements={callsPage.totalElements}
                  totalPages={callsPage.totalPages}
                  first={callsPage.first}
                  last={callsPage.last}
                  itemLabel="calls"
                  onPageChange={(nextPage) => setPage(nextPage)}
                />
              )}
            </>
          )}
        </div>
      </Card>

      <CreateCallModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCallCreated}
      />
    </div>
  );
}
