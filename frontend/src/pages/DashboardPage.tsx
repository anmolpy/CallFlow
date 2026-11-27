import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  PhoneCall,
  PhoneMissed,
  RefreshCw,
} from 'lucide-react';
import { ApiClientError, analyticsApi } from '../api';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  LoadingSpinner,
  PageHeader,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import type { AgentPerformance, AnalyticsOverview, StatusCount } from '../types/api';
import {
  AGENT_AVAILABILITY_META,
  CALL_STATUS_META,
  formatDuration,
  formatPercent,
} from '../utils/format';

interface DashboardState {
  overview: AnalyticsOverview | null;
  callsByStatus: StatusCount[];
  agentPerformance: AgentPerformance[];
}

export function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardState>({
    overview: null,
    callsByStatus: [],
    agentPerformance: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async (background = false) => {
    if (background) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const [overview, callsByStatus, agentPerformance] = await Promise.all([
        analyticsApi.getOverview(),
        analyticsApi.getCallsByStatus(),
        analyticsApi.getAgentPerformance(),
      ]);
      setData({ overview, callsByStatus, agentPerformance });
    } catch (err) {
      if (err instanceof ApiClientError || err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to load dashboard analytics.');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboard(false);
  }, [fetchDashboard]);

  if (isLoading && !data.overview) {
    return <LoadingSpinner label="Loading operations dashboard..." />;
  }

  const overview = data.overview;
  const activeQueueCount = overview ? overview.queuedCalls + overview.inProgressCalls : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operations Dashboard"
        description={
          user
            ? `Live call center overview for ${user.fullName}.`
            : 'Real-time call center KPIs, status breakdown, and agent performance.'
        }
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => void fetchDashboard(Boolean(overview))}
              disabled={isLoading || isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Link
              to="/calls"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              <span>Open Call Queue</span>
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </>
        }
      />

      {error && (
        <ErrorBanner
          title="Unable to load analytics"
          message={error}
          action={
            <Button variant="secondary" onClick={() => void fetchDashboard(Boolean(overview))}>
              Retry
            </Button>
          }
        />
      )}

      {overview && (
        <>
          <section aria-label="Key performance metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Total Calls</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                    {overview.totalCalls.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg bg-brand-50 p-2.5 text-brand-600">
                  <PhoneCall className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                {activeQueueCount.toLocaleString()} currently queued or in progress
              </p>
            </Card>

            <Card>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Completed Calls</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                    {overview.completedCalls.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                {formatPercent(overview.completedCalls, overview.totalCalls)} completion rate
              </p>
            </Card>

            <Card>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Missed Calls</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                    {overview.missedCalls.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg bg-rose-50 p-2.5 text-rose-600">
                  <PhoneMissed className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                {formatPercent(overview.missedCalls, overview.totalCalls)} of total volume
              </p>
            </Card>

            <Card>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Average Duration</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                    {formatDuration(overview.averageDurationSeconds)}
                  </p>
                </div>
                <div className="rounded-lg bg-amber-50 p-2.5 text-amber-600">
                  <Clock className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                {overview.cancelledCalls.toLocaleString()} cancelled calls recorded
              </p>
            </Card>
          </section>

          <div className="grid gap-6 lg:grid-cols-5">
            <Card
              className="lg:col-span-3"
              title="Calls by Status"
              subtitle="Distribution across lifecycle states"
            >
              {overview.totalCalls === 0 || data.callsByStatus.length === 0 ? (
                <EmptyState
                  title="No calls recorded yet"
                  description="Status breakdown will populate once inbound or outbound calls are logged."
                />
              ) : (
                <div className="space-y-4">
                  {data.callsByStatus.map((item) => {
                    const meta = CALL_STATUS_META[item.status];
                    const widthPercent =
                      overview.totalCalls > 0
                        ? Math.round((item.count / overview.totalCalls) * 100)
                        : 0;
                    return (
                      <div key={item.status} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Badge tone={meta.tone}>{meta.label}</Badge>
                          </div>
                          <span className="font-medium text-slate-700">
                            {item.count.toLocaleString()} ({widthPercent}%)
                          </span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full transition-all ${meta.barClass}`}
                            style={{ width: `${Math.min(100, Math.max(0, widthPercent))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card
              className="lg:col-span-2"
              title="Queue Snapshot"
              subtitle="Current live workload"
              action={<Activity className="h-5 w-5 text-brand-600" />}
            >
              <dl className="divide-y divide-slate-100 text-sm">
                <div className="flex items-center justify-between py-3">
                  <dt className="text-slate-600">Queued</dt>
                  <dd className="font-semibold text-slate-900">
                    {overview.queuedCalls.toLocaleString()}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-3">
                  <dt className="text-slate-600">In Progress</dt>
                  <dd className="font-semibold text-slate-900">
                    {overview.inProgressCalls.toLocaleString()}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-3">
                  <dt className="text-slate-600">Completed</dt>
                  <dd className="font-semibold text-slate-900">
                    {overview.completedCalls.toLocaleString()}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-3">
                  <dt className="text-slate-600">Missed</dt>
                  <dd className="font-semibold text-slate-900">
                    {overview.missedCalls.toLocaleString()}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-3">
                  <dt className="text-slate-600">Cancelled</dt>
                  <dd className="font-semibold text-slate-900">
                    {overview.cancelledCalls.toLocaleString()}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-4 text-xs font-medium">
                <Link className="text-brand-600 hover:underline" to="/customers">
                  Browse customers
                </Link>
                <span className="text-slate-300">•</span>
                <Link className="text-brand-600 hover:underline" to="/agents">
                  Manage agents
                </Link>
              </div>
            </Card>
          </div>

          <Card
            title="Agent Performance"
            subtitle="Call volume, completion rate, and handling duration per agent"
          >
            {data.agentPerformance.length === 0 ? (
              <EmptyState
                title="No agent metrics available"
                description="Create agents and assign calls to view agent throughput and duration metrics."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead>
                    <tr className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <th className="py-3 pr-4">Agent</th>
                      <th className="px-4 py-3">Availability</th>
                      <th className="px-4 py-3 text-right">Total Calls</th>
                      <th className="px-4 py-3 text-right">Completed</th>
                      <th className="px-4 py-3 text-right">Missed</th>
                      <th className="px-4 py-3 text-right">Completion Rate</th>
                      <th className="py-3 pl-4 text-right">Avg Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.agentPerformance.map((agent) => {
                      const availability = AGENT_AVAILABILITY_META[agent.availabilityStatus];
                      return (
                        <tr key={agent.agentId} className="hover:bg-slate-50">
                          <td className="py-3 pr-4">
                            <p className="font-medium text-slate-900">{agent.agentName}</p>
                            <p className="text-xs text-slate-500">{agent.email}</p>
                          </td>
                          <td className="px-4 py-3">
                            <Badge tone={availability.tone}>{availability.label}</Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-slate-900">
                            {agent.totalCalls.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-700">
                            {agent.completedCalls.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-700">
                            {agent.missedCalls.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-700">
                            {formatPercent(agent.completedCalls, agent.totalCalls)}
                          </td>
                          <td className="py-3 pl-4 text-right text-slate-700">
                            {formatDuration(agent.averageDurationSeconds)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
