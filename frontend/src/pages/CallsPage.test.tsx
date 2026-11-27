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

describe('CallsPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('lists calls, filters by status & search, and logs a new call', async () => {
    const calls = [
      {
        id: 101,
        customerId: 1,
        customerName: 'Elena Rostova',
        customerEmail: 'elena@company.example',
        agentId: 2,
        agentName: 'Jordan Taylor',
        status: 'QUEUED',
        startedAt: null,
        endedAt: null,
        durationSeconds: null,
        noteCount: 0,
        createdAt: '2026-11-26T12:00:00Z',
        updatedAt: '2026-11-26T12:00:00Z',
      },
      {
        id: 102,
        customerId: 2,
        customerName: 'Marcus Vance',
        customerEmail: 'marcus@company.example',
        agentId: null,
        agentName: null,
        status: 'COMPLETED',
        startedAt: '2026-11-26T10:00:00Z',
        endedAt: '2026-11-26T10:03:00Z',
        durationSeconds: 180,
        noteCount: 2,
        createdAt: '2026-11-26T10:00:00Z',
        updatedAt: '2026-11-26T10:03:00Z',
      },
    ];

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
      if (url.startsWith('/api/customers?')) {
        return jsonResponse({
          content: [
            {
              id: 1,
              firstName: 'Elena',
              lastName: 'Rostova',
              email: 'elena@company.example',
              phoneNumber: '+1-555-0101',
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
      if (url.startsWith('/api/calls?') && (!init?.method || init.method === 'GET')) {
        const filtered = calls.filter((item) => {
          if (url.includes('status=COMPLETED') && item.status !== 'COMPLETED') {
            return false;
          }
          if (url.includes('search=elena') && !item.customerName.toLowerCase().includes('elena')) {
            return false;
          }
          return true;
        });
        return jsonResponse({
          content: filtered,
          page: 0,
          size: 10,
          totalElements: filtered.length,
          totalPages: filtered.length > 0 ? 1 : 0,
          first: true,
          last: true,
        });
      }
      if (url === '/api/calls' && init?.method === 'POST') {
        const created = {
          id: 103,
          customerId: 1,
          customerName: 'Elena Rostova',
          customerEmail: 'elena@company.example',
          customerPhoneNumber: '+1-555-0101',
          agentId: 2,
          agentName: 'Jordan Taylor',
          agentEmail: 'jordan@callflow.example',
          status: 'QUEUED',
          startedAt: null,
          endedAt: null,
          durationSeconds: null,
          notes: [],
          createdAt: '2026-11-27T05:30:00Z',
          updatedAt: '2026-11-27T05:30:00Z',
        };
        calls.unshift({ ...created, noteCount: 0 });
        return jsonResponse(created, 201);
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    window.localStorage.setItem(TOKEN_STORAGE_KEY, 'valid-jwt');
    render(
      <MemoryRouter initialEntries={['/calls']}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>,
    );

    const table = await screen.findByRole('table');
    expect(within(table).getByText('Elena Rostova')).toBeInTheDocument();
    expect(within(table).getByText('Marcus Vance')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Filter by status'), 'COMPLETED');
    await waitFor(() => {
      const updatedTable = screen.getByRole('table');
      expect(within(updatedTable).getByText('Marcus Vance')).toBeInTheDocument();
      expect(within(updatedTable).queryByText('Elena Rostova')).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(await within(await screen.findByRole('table')).findByText('Elena Rostova')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /log call/i }));
    const dialog = screen.getByRole('dialog');
    await user.selectOptions(within(dialog).getByLabelText(/assign agent/i), '2');
    await user.click(within(dialog).getByRole('button', { name: /create call/i }));

    expect(await screen.findByRole('status')).toHaveTextContent('Created Call #103 for Elena Rostova.');
  });
});
