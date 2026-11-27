import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { TOKEN_STORAGE_KEY } from '../api';
import { AuthProvider } from '../context/AuthContext';
import type { Agent, AgentAvailabilityStatus, UserRole } from '../types/api';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function renderAgentsRoute(role: UserRole = 'ADMIN') {
  window.localStorage.setItem(TOKEN_STORAGE_KEY, 'valid-jwt');
  return {
    role,
    ...render(
      <MemoryRouter initialEntries={['/agents']}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>,
    ),
  };
}

describe('AgentsPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('allows ADMIN to create agents and update availability status', async () => {
    const roster: Agent[] = [
      {
        id: 1,
        firstName: 'Jordan',
        lastName: 'Taylor',
        email: 'jordan@callflow.example',
        availabilityStatus: 'AVAILABLE',
        createdAt: '2026-11-01T10:00:00Z',
        updatedAt: '2026-11-01T10:00:00Z',
      },
    ];

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/auth/me') {
        return jsonResponse({ id: 1, email: 'admin@callflow.local', fullName: 'Admin', role: 'ADMIN' });
      }
      if (url.startsWith('/api/agents?') && (!init?.method || init.method === 'GET')) {
        return jsonResponse({
          content: roster,
          page: 0,
          size: 10,
          totalElements: roster.length,
          totalPages: 1,
          first: true,
          last: true,
        });
      }
      if (url === '/api/agents/1/availability' && init?.method === 'PATCH') {
        const body = JSON.parse(String(init.body)) as {
          availabilityStatus: AgentAvailabilityStatus;
        };
        roster[0] = { ...roster[0], availabilityStatus: body.availabilityStatus };
        return jsonResponse(roster[0]);
      }
      if (url === '/api/agents' && init?.method === 'POST') {
        const body = JSON.parse(String(init.body)) as Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>;
        const created: Agent = {
          id: 2,
          ...body,
          availabilityStatus: body.availabilityStatus ?? 'AVAILABLE',
          createdAt: '2026-11-27T05:00:00Z',
          updatedAt: '2026-11-27T05:00:00Z',
        };
        roster.unshift(created);
        return jsonResponse(created, 201);
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    renderAgentsRoute('ADMIN');

    const table = await screen.findByRole('table');
    expect(within(table).getByText('Jordan Taylor')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Availability for Jordan Taylor'), 'BUSY');
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Updated Jordan Taylor availability to Busy.',
    );

    await user.click(screen.getByRole('button', { name: /add agent/i }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText(/first name/i), 'Sam');
    await user.type(within(dialog).getByLabelText(/last name/i), 'Rivera');
    await user.type(within(dialog).getByLabelText(/work email/i), 'sam.rivera@callflow.example');
    await user.click(within(dialog).getByRole('button', { name: /create agent/i }));

    expect(await screen.findByRole('status')).toHaveTextContent('Added agent Sam Rivera.');
    expect(within(screen.getByRole('table')).getByText('Sam Rivera')).toBeInTheDocument();
  });

  it('hides admin create/edit controls when signed in as AGENT', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/auth/me') {
        return jsonResponse({ id: 2, email: 'agent@callflow.local', fullName: 'Agent', role: 'AGENT' });
      }
      if (url.startsWith('/api/agents?')) {
        return jsonResponse({
          content: [
            {
              id: 1,
              firstName: 'Jordan',
              lastName: 'Taylor',
              email: 'jordan@callflow.example',
              availabilityStatus: 'AVAILABLE',
              createdAt: '2026-11-01T10:00:00Z',
              updatedAt: '2026-11-01T10:00:00Z',
            },
          ],
          page: 0,
          size: 10,
          totalElements: 1,
          totalPages: 1,
          first: true,
          last: true,
        });
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderAgentsRoute('AGENT');

    await screen.findByRole('table');
    expect(screen.queryByRole('button', { name: /add agent/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.getByText('Admin role required to create/edit')).toBeInTheDocument();
  });
});
