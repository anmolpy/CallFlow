import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { TOKEN_STORAGE_KEY } from '../api';
import { AuthProvider } from '../context/AuthContext';

function renderWithRouter(initialEntries: string[] = ['/login']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('redirects unauthenticated visitors from protected routes to /login', async () => {
    renderWithRouter(['/calls']);

    expect(await screen.findByRole('heading', { name: /sign in to callflow/i })).toBeInTheDocument();
  });

  it('validates empty and malformed inputs without calling login API', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const user = userEvent.setup();

    renderWithRouter(['/login']);

    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/work email/i), 'invalid-email');
    await user.type(screen.getByLabelText(/^password$/i), 'secret');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(await screen.findByText('Email must be valid')).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    renderWithRouter(['/login']);

    const passwordInput = screen.getByLabelText(/^password$/i) as HTMLInputElement;
    expect(passwordInput.type).toBe('password');

    await user.click(screen.getByRole('button', { name: /show password/i }));
    expect(passwordInput.type).toBe('text');

    await user.click(screen.getByRole('button', { name: /hide password/i }));
    expect(passwordInput.type).toBe('password');
  });

  it('authenticates, stores JWT token, and redirects to original protected destination', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/auth/login') {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              accessToken: 'jwt-token-123',
              tokenType: 'Bearer',
              expiresInMs: 3600000,
              user: {
                id: 1,
                email: 'admin@callflow.local',
                fullName: 'CallFlow Admin',
                role: 'ADMIN',
              },
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            },
          ),
        );
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({
            content: [],
            page: 0,
            size: 10,
            totalElements: 0,
            totalPages: 0,
            first: true,
            last: true,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    renderWithRouter(['/customers']);

    await user.type(await screen.findByLabelText(/work email/i), '  admin@callflow.local  ');
    await user.type(screen.getByLabelText(/^password$/i), 'change_me_admin_pass');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(await screen.findByRole('heading', { name: 'Customers' })).toBeInTheDocument();
    expect(window.localStorage.getItem(TOKEN_STORAGE_KEY)).toBe('jwt-token-123');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          email: 'admin@callflow.local',
          password: 'change_me_admin_pass',
        }),
      }),
    );
  });

  it('displays API error banner and field errors when login fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 401,
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
          fieldErrors: [],
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    renderWithRouter(['/login']);

    await user.type(screen.getByLabelText(/work email/i), 'agent@callflow.local');
    await user.type(screen.getByLabelText(/^password$/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Sign-in failed');
    expect(alert).toHaveTextContent('Invalid email or password');
    expect(window.localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });

  it('redirects already authenticated users away from /login to /dashboard', async () => {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, 'existing-jwt');
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 2,
          email: 'agent@callflow.local',
          fullName: 'Support Agent',
          role: 'AGENT',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    renderWithRouter(['/login']);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Operations Dashboard' })).toBeInTheDocument();
    });
  });
});
