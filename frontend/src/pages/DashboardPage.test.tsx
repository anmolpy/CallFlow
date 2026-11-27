import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { TOKEN_STORAGE_KEY } from '../api';
import { AuthProvider } from '../context/AuthContext';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function renderDashboard() {
  window.localStorage.setItem(TOKEN_STORAGE_KEY, 'valid-jwt');
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders KPI cards, calls by status, and agent performance table', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/auth/me') {
        return Promise.resolve(
          jsonResponse({
            id: 1,
            email: 'admin@callflow.local',
            fullName: 'CallFlow Admin',
            role: 'ADMIN',
          }),
        );
      }
      if (url === '/api/analytics/overview') {
        return Promise.resolve(
          jsonResponse({
            totalCalls: 40,
            completedCalls: 26,
            missedCalls: 4,
            queuedCalls: 5,
            inProgressCalls: 3,
            cancelledCalls: 2,
            averageDurationSeconds: 185,
          }),
        );
      }
      if (url === '/api/analytics/calls-by-status') {
        return Promise.resolve(
          jsonResponse([
            { status: 'COMPLETED', count: 26 },
            { status: 'QUEUED', count: 5 },
            { status: 'IN_PROGRESS', count: 3 },
            { status: 'MISSED', count: 4 },
            { status: 'CANCELLED', count: 2 },
          ]),
        );
      }
      if (url === '/api/analytics/agent-performance') {
        return Promise.resolve(
          jsonResponse([
            {
              agentId: 10,
              agentName: 'Alex Morgan',
              email: 'alex.morgan@callflow.local',
              availabilityStatus: 'AVAILABLE',
              totalCalls: 20,
              completedCalls: 16,
              missedCalls: 1,
              averageDurationSeconds: 195,
            },
          ]),
        );
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderDashboard();

    expect(await screen.findByRole('heading', { name: 'Operations Dashboard' })).toBeInTheDocument();
    expect(screen.getByText('Live call center overview for CallFlow Admin.')).toBeInTheDocument();

    const kpiSection = screen.getByLabelText('Key performance metrics');
    expect(within(kpiSection).getByText('40')).toBeInTheDocument();
    expect(within(kpiSection).getByText('26')).toBeInTheDocument();
    expect(within(kpiSection).getByText('4')).toBeInTheDocument();
    expect(within(kpiSection).getByText('3m 5s')).toBeInTheDocument();
    expect(within(kpiSection).getByText('65% completion rate')).toBeInTheDocument();

    expect(screen.getByText('26 (65%)')).toBeInTheDocument();

    const agentTable = screen.getByRole('table');
    expect(within(agentTable).getByText('Alex Morgan')).toBeInTheDocument();
    expect(within(agentTable).getByText('Available')).toBeInTheDocument();
    expect(within(agentTable).getByText('80%')).toBeInTheDocument();
    expect(within(agentTable).getByText('3m 15s')).toBeInTheDocument();
  });

  it('shows empty states when no calls or agents are recorded', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/auth/me') {
        return Promise.resolve(
          jsonResponse({
            id: 2,
            email: 'agent@callflow.local',
            fullName: 'Support Agent',
            role: 'AGENT',
          }),
        );
      }
      if (url === '/api/analytics/overview') {
        return Promise.resolve(
          jsonResponse({
            totalCalls: 0,
            completedCalls: 0,
            missedCalls: 0,
            queuedCalls: 0,
            inProgressCalls: 0,
            cancelledCalls: 0,
            averageDurationSeconds: 0,
          }),
        );
      }
      return Promise.resolve(jsonResponse([]));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderDashboard();

    expect(await screen.findByText('No calls recorded yet')).toBeInTheDocument();
    expect(screen.getByText('No agent metrics available')).toBeInTheDocument();
  });

  it('displays error banner when analytics fail to load and recovers on Retry', async () => {
    let failAnalytics = true;
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/auth/me') {
        return Promise.resolve(
          jsonResponse({
            id: 1,
            email: 'admin@callflow.local',
            fullName: 'CallFlow Admin',
            role: 'ADMIN',
          }),
        );
      }
      if (failAnalytics) {
        return Promise.resolve(
          jsonResponse({ status: 500, code: 'INTERNAL_ERROR', message: 'Analytics temporarily unavailable' }, 500),
        );
      }
      if (url === '/api/analytics/overview') {
        return Promise.resolve(
          jsonResponse({
            totalCalls: 12,
            completedCalls: 9,
            missedCalls: 1,
            queuedCalls: 1,
            inProgressCalls: 1,
            cancelledCalls: 0,
            averageDurationSeconds: 90,
          }),
        );
      }
      return Promise.resolve(jsonResponse([]));
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    renderDashboard();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Unable to load analytics');
    expect(alert).toHaveTextContent('Analytics temporarily unavailable');

    failAnalytics = false;
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
    const kpiSection = screen.getByLabelText('Key performance metrics');
    expect(within(kpiSection).getByText('12')).toBeInTheDocument();
    expect(within(kpiSection).getByText('1m 30s')).toBeInTheDocument();
  });
});
