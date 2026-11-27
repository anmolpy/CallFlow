import { render, screen, waitFor } from '@testing-library/react';
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

describe('CallDetailPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('assigns agent, transitions status along valid lifecycle, and adds call notes', async () => {
    let call = {
      id: 55,
      customerId: 1,
      customerName: 'Elena Rostova',
      customerEmail: 'elena@company.example',
      customerPhoneNumber: '+1-555-0101',
      agentId: null as number | null,
      agentName: null as string | null,
      agentEmail: null as string | null,
      status: 'QUEUED' as 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED',
      startedAt: null as string | null,
      endedAt: null as string | null,
      durationSeconds: null as number | null,
      notes: [] as Array<{
        id: number;
        authorAgentId: number | null;
        authorName: string;
        content: string;
        createdAt: string;
      }>,
      createdAt: '2026-11-27T04:00:00Z',
      updatedAt: '2026-11-27T04:00:00Z',
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/auth/me') {
        return jsonResponse({ id: 1, email: 'admin@callflow.local', fullName: 'Admin', role: 'ADMIN' });
      }
      if (url.startsWith('/api/agents?')) {
        return jsonResponse({
          content: [
            {
              id: 2,
              firstName: 'Jordan',
              lastName: 'Taylor',
              email: 'jordan@callflow.example',
              availabilityStatus: 'AVAILABLE',
              createdAt: '2026-11-01T10:00:00Z',
              updatedAt: '2026-11-01T10:00:00Z',
            },
          ],
          page: 0,
          size: 100,
          totalElements: 1,
          totalPages: 1,
          first: true,
          last: true,
        });
      }
      if (url === '/api/calls/55' && (!init?.method || init.method === 'GET')) {
        return jsonResponse(call);
      }
      if (url === '/api/calls/55/assign' && init?.method === 'PATCH') {
        call = {
          ...call,
          agentId: 2,
          agentName: 'Jordan Taylor',
          agentEmail: 'jordan@callflow.example',
        };
        return jsonResponse(call);
      }
      if (url === '/api/calls/55/status' && init?.method === 'PATCH') {
        const body = JSON.parse(String(init.body)) as { status: 'IN_PROGRESS' | 'COMPLETED' };
        call = {
          ...call,
          status: body.status,
          startedAt: '2026-11-27T04:05:00Z',
          endedAt: body.status === 'COMPLETED' ? '2026-11-27T04:08:00Z' : null,
          durationSeconds: body.status === 'COMPLETED' ? 180 : null,
        };
        return jsonResponse(call);
      }
      if (url === '/api/calls/55/notes' && init?.method === 'POST') {
        const body = JSON.parse(String(init.body)) as { content: string };
        const note = {
          id: 901,
          authorAgentId: 2,
          authorName: 'Admin',
          content: body.content,
          createdAt: '2026-11-27T04:07:00Z',
        };
        call = { ...call, notes: [...call.notes, note] };
        return jsonResponse(note, 201);
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    window.localStorage.setItem(TOKEN_STORAGE_KEY, 'valid-jwt');
    render(
      <MemoryRouter initialEntries={['/calls/55']}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Call #55' })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Assign agent'), '2');
    await user.click(screen.getByRole('button', { name: 'Assign agent' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Assigned Call #55 to Jordan Taylor.',
    );

    await user.click(screen.getByRole('button', { name: 'Mark In Progress' }));
    expect(await screen.findByRole('button', { name: 'Mark Completed' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mark Completed' }));
    await waitFor(() => {
      expect(screen.getByText('3m 0s')).toBeInTheDocument();
      expect(
        screen.getByText(/no further status transitions are allowed once a call is completed/i),
      ).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Add call note'), 'Reset customer password and confirmed sign-in.');
    await user.click(screen.getByRole('button', { name: 'Add note' }));
    expect(
      await screen.findByText('Reset customer password and confirmed sign-in.'),
    ).toBeInTheDocument();
  });
});
