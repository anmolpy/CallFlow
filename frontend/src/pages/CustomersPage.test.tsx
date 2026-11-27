import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { TOKEN_STORAGE_KEY } from '../api';
import { AuthProvider } from '../context/AuthContext';
import type { Customer, PageResponse } from '../types/api';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 1,
    firstName: 'Elena',
    lastName: 'Rostova',
    email: 'elena.rostova@company.example',
    phoneNumber: '+1-555-0101',
    createdAt: '2026-11-20T14:30:00Z',
    updatedAt: '2026-11-21T09:15:00Z',
    ...overrides,
  };
}

function makePage(
  content: Customer[],
  overrides: Partial<PageResponse<Customer>> = {},
): PageResponse<Customer> {
  return {
    content,
    page: 0,
    size: 10,
    totalElements: content.length,
    totalPages: content.length > 0 ? 1 : 0,
    first: true,
    last: true,
    ...overrides,
  };
}

function renderCustomersRoute() {
  window.localStorage.setItem(TOKEN_STORAGE_KEY, 'valid-jwt');
  return render(
    <MemoryRouter initialEntries={['/customers']}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('CustomersPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('lists paginated customers, supports search & clear search, and switches pages', async () => {
    const pageZero = [
      makeCustomer({ id: 1, firstName: 'Elena', lastName: 'Rostova' }),
      makeCustomer({
        id: 2,
        firstName: 'Marcus',
        lastName: 'Vance',
        email: 'marcus.vance@company.example',
        phoneNumber: '+1-555-0102',
      }),
    ];
    const pageOne = [
      makeCustomer({
        id: 3,
        firstName: 'Nadia',
        lastName: 'Patel',
        email: 'nadia.patel@company.example',
        phoneNumber: '+1-555-0103',
      }),
    ];

    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/auth/me') {
        return Promise.resolve(
          jsonResponse({ id: 1, email: 'admin@callflow.local', fullName: 'Admin', role: 'ADMIN' }),
        );
      }
      if (url.includes('query=marcus')) {
        return Promise.resolve(jsonResponse(makePage([pageZero[1]])));
      }
      if (url.includes('page=1')) {
        return Promise.resolve(
          jsonResponse(
            makePage(pageOne, {
              page: 1,
              size: 10,
              totalElements: 11,
              totalPages: 2,
              first: false,
              last: true,
            }),
          ),
        );
      }
      if (url.startsWith('/api/customers')) {
        return Promise.resolve(
          jsonResponse(
            makePage(pageZero, {
              page: 0,
              size: 10,
              totalElements: 11,
              totalPages: 2,
              first: true,
              last: false,
            }),
          ),
        );
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    renderCustomersRoute();

    expect(await screen.findByRole('heading', { name: 'Customers' })).toBeInTheDocument();
    const table = await screen.findByRole('table');
    expect(within(table).getByText('Elena Rostova')).toBeInTheDocument();
    expect(within(table).getByText('Marcus Vance')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(await within(screen.getByRole('table')).findByText('Nadia Patel')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Search customers'), 'marcus');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(within(screen.getByRole('table')).getByText('Marcus Vance')).toBeInTheDocument();
      expect(within(screen.getByRole('table')).queryByText('Elena Rostova')).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(await within(screen.getByRole('table')).findByText('Elena Rostova')).toBeInTheDocument();
  });

  it('validates new customer form and creates a customer record', async () => {
    const customers: Customer[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/auth/me') {
        return jsonResponse({
          id: 2,
          email: 'agent@callflow.local',
          fullName: 'Agent',
          role: 'AGENT',
        });
      }
      if (url.startsWith('/api/customers') && (!init?.method || init.method === 'GET')) {
        return jsonResponse(makePage(customers));
      }
      if (url === '/api/customers' && init?.method === 'POST') {
        const body = JSON.parse(String(init.body)) as Customer;
        const created = makeCustomer({
          id: 42,
          firstName: body.firstName,
          lastName: body.lastName,
          email: body.email,
          phoneNumber: body.phoneNumber,
        });
        customers.push(created);
        return jsonResponse(created, 201);
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    renderCustomersRoute();

    expect(await screen.findByText('No customers yet')).toBeInTheDocument();
    const emptyAddButtons = screen.getAllByRole('button', { name: /add customer/i });
    await user.click(emptyAddButtons[0]);

    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /create customer/i }));
    expect(await within(dialog).findByText('First name is required')).toBeInTheDocument();
    expect(within(dialog).getByText('Last name is required')).toBeInTheDocument();
    expect(within(dialog).getByText('Email is required')).toBeInTheDocument();
    expect(within(dialog).getByText('Phone number is required')).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText(/first name/i), 'Priya');
    await user.type(within(dialog).getByLabelText(/last name/i), 'Nair');
    await user.type(within(dialog).getByLabelText(/email address/i), 'priya.nair@company.example');
    await user.type(within(dialog).getByLabelText(/phone number/i), '+1 555 0142');
    await user.click(within(dialog).getByRole('button', { name: /create customer/i }));

    expect(await screen.findByRole('status')).toHaveTextContent('Added Priya Nair to customers.');
    expect(within(screen.getByRole('table')).getByText('Priya Nair')).toBeInTheDocument();
  });

  it('shows conflict error in modal and updates an existing customer', async () => {
    let customer = makeCustomer({ id: 7, firstName: 'Elena', lastName: 'Rostova' });
    let returnConflict = true;

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/auth/me') {
        return jsonResponse({
          id: 1,
          email: 'admin@callflow.local',
          fullName: 'Admin',
          role: 'ADMIN',
        });
      }
      if (url.startsWith('/api/customers?') && (!init?.method || init.method === 'GET')) {
        return jsonResponse(makePage([customer]));
      }
      if (url === '/api/customers/7' && init?.method === 'PUT') {
        if (returnConflict) {
          return jsonResponse(
            {
              status: 409,
              code: 'CONFLICT',
              message: "A customer with email 'taken@company.example' already exists",
              fieldErrors: [],
            },
            409,
          );
        }
        const body = JSON.parse(String(init.body)) as Customer;
        customer = { ...customer, ...body };
        return jsonResponse(customer, 200);
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    renderCustomersRoute();

    expect(await within(await screen.findByRole('table')).findByText('Elena Rostova')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Edit Elena Rostova' }));

    const dialog = screen.getByRole('dialog');
    const emailInput = within(dialog).getByLabelText(/email address/i);
    await user.clear(emailInput);
    await user.type(emailInput, 'taken@company.example');
    await user.click(within(dialog).getByRole('button', { name: /save customer/i }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      "A customer with email 'taken@company.example' already exists",
    );

    returnConflict = false;
    await user.clear(emailInput);
    await user.type(emailInput, 'elena.updated@company.example');
    await user.click(within(dialog).getByRole('button', { name: /save customer/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Updated contact details for Elena Rostova.',
    );
    expect(within(screen.getByRole('table')).getByText('elena.updated@company.example')).toBeInTheDocument();
  });
});
