import { render, screen, within } from '@testing-library/react';
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

describe('CustomerDetailPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('loads customer profile, call history, edits contact, and logs a new call', async () => {
    let customer = {
      id: 14,
      firstName: 'Elena',
      lastName: 'Rostova',
      email: 'elena.rostova@company.example',
      phoneNumber: '+1-555-0101',
      createdAt: '2026-11-20T14:30:00Z',
      updatedAt: '2026-11-21T09:15:00Z',
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/auth/me') {
        return jsonResponse({ id: 1, email: 'admin@callflow.local', fullName: 'Admin', role: 'ADMIN' });
      }
      if (url === '/api/customers/14' && (!init?.method || init.method === 'GET')) {
        return jsonResponse(customer);
      }
      if (url === '/api/customers/14' && init?.method === 'PUT') {
        const body = JSON.parse(String(init.body)) as typeof customer;
        customer = { ...customer, ...body };
        return jsonResponse(customer);
      }
      if (url.startsWith('/api/customers/14/calls')) {
        return jsonResponse({
          content: [
            {
              id: 88,
              customerId: 14,
              customerName: 'Elena Rostova',
              customerEmail: customer.email,
              agentId: 2,
              agentName: 'Jordan Taylor',
              status: 'COMPLETED',
              startedAt: '2026-11-21T10:00:00Z',
              endedAt: '2026-11-21T10:04:00Z',
              durationSeconds: 240,
              noteCount: 1,
              createdAt: '2026-11-21T10:00:00Z',
              updatedAt: '2026-11-21T10:04:00Z',
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
      if (url.startsWith('/api/agents?')) {
        return jsonResponse({
          content: [
            {
              id: 2,
              firstName: 'Jordan',
              lastName: 'Taylor',
              email: 'jordan.taylor@callflow.example',
              availabilityStatus: 'AVAILABLE',
              createdAt: '2026-11-10T10:00:00Z',
              updatedAt: '2026-11-10T10:00:00Z',
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
      if (url === '/api/calls' && init?.method === 'POST') {
        return jsonResponse(
          {
            id: 99,
            customerId: 14,
            customerName: 'Elena Updated',
            customerEmail: customer.email,
            customerPhoneNumber: customer.phoneNumber,
            agentId: 2,
            agentName: 'Jordan Taylor',
            agentEmail: 'jordan.taylor@callflow.example',
            status: 'QUEUED',
            startedAt: null,
            endedAt: null,
            durationSeconds: null,
            notes: [],
            createdAt: '2026-11-27T05:00:00Z',
            updatedAt: '2026-11-27T05:00:00Z',
          },
          201,
        );
      }
      if (url === '/api/calls/99') {
        return jsonResponse({
          id: 99,
          customerId: 14,
          customerName: 'Elena Updated',
          customerEmail: customer.email,
          customerPhoneNumber: customer.phoneNumber,
          agentId: 2,
          agentName: 'Jordan Taylor',
          agentEmail: 'jordan.taylor@callflow.example',
          status: 'QUEUED',
          startedAt: null,
          endedAt: null,
          durationSeconds: null,
          notes: [],
          createdAt: '2026-11-27T05:00:00Z',
          updatedAt: '2026-11-27T05:00:00Z',
        });
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    window.localStorage.setItem(TOKEN_STORAGE_KEY, 'valid-jwt');
    render(
      <MemoryRouter initialEntries={['/customers/14']}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Elena Rostova' })).toBeInTheDocument();
    const table = await screen.findByRole('table');
    expect(within(table).getByText('#88')).toBeInTheDocument();
    expect(within(table).getByText('4m 0s')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /edit customer/i }));
    const editDialog = screen.getByRole('dialog');
    const lastNameInput = within(editDialog).getByLabelText(/last name/i);
    await user.clear(lastNameInput);
    await user.type(lastNameInput, 'Updated');
    await user.click(within(editDialog).getByRole('button', { name: /save customer/i }));

    expect(await screen.findByRole('heading', { name: 'Elena Updated' })).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /log call/i })[0]);
    const callDialog = screen.getByRole('dialog');
    await user.type(within(callDialog).getByLabelText(/initial note/i), 'Billing inquiry');
    await user.click(within(callDialog).getByRole('button', { name: /create call/i }));

    expect(await screen.findByRole('heading', { name: 'Call #99' })).toBeInTheDocument();
  });
});
