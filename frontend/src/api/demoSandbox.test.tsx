import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { AuthProvider } from '../context/AuthContext';

describe('Demo Sandbox mode', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('signs into in-memory ADMIN demo session from /login and supports interactive calls, notes, customers, and agents with zero backend fetch', async () => {
    const fetchSpy = vi.fn((_input: RequestInfo | URL) =>
      Promise.reject(new Error('Network disabled in demo mode')),
    );
    vi.stubGlobal('fetch', fetchSpy);
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: /try demo console/i }));

    expect(await screen.findByRole('heading', { name: 'Operations Dashboard' })).toBeInTheDocument();
    expect(screen.getByText(/demo sandbox/i)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();

    // Navigate to Calls and inspect Call #4821
    await user.click(screen.getAllByRole('link', { name: /^calls$/i })[0]);
    expect(await screen.findByRole('heading', { name: /^calls$/i })).toBeInTheDocument();
    expect((await screen.findAllByText('Maya Lin')).length).toBeGreaterThan(0);

    // Navigate to Customers
    await user.click(screen.getAllByRole('link', { name: /^customers$/i })[0]);
    expect(await screen.findByRole('heading', { name: /^customers$/i })).toBeInTheDocument();
    expect((await screen.findAllByText('Sora Takahashi')).length).toBeGreaterThan(0);

    // Navigate to Agents
    await user.click(screen.getAllByRole('link', { name: /^agents$/i })[0]);
    expect(await screen.findByRole('heading', { name: /^agents$/i })).toBeInTheDocument();
    expect((await screen.findAllByText('Elena Rostova')).length).toBeGreaterThan(0);

    // Open Call #4825 (QUEUED), transition status to IN_PROGRESS, and add an in-session note
    await user.click(screen.getAllByRole('link', { name: /^calls$/i })[0]);
    const callLinks = await screen.findAllByRole('link', { name: /#4825/i });
    await user.click(callLinks[0]);
    await user.click(await screen.findByRole('button', { name: /mark in progress/i }));
    expect(await screen.findByText(/updated call #4825 status to in progress/i)).toBeInTheDocument();

    const noteBox = await screen.findByLabelText(/add call note/i);
    await user.type(noteBox, 'Confirmed demo note persistence in session.');
    await user.click(screen.getByRole('button', { name: /add note/i }));
    expect(await screen.findByText('Confirmed demo note persistence in session.')).toBeInTheDocument();

    // Exit Demo cleanly
    await user.click(screen.getByRole('button', { name: /exit demo/i }));
    expect(window.localStorage.getItem('callflow_demo_mode')).toBeNull();
    expect(
      fetchSpy.mock.calls.filter(([url]) => String(url).includes('/api/')),
    ).toHaveLength(0);
  });
});
