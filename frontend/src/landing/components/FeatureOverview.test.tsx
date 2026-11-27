import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FeatureOverview } from './FeatureOverview';

describe('FeatureOverview Swagger UI availability', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('hides Explore Swagger UI when backend returns SPA HTML fallback or is offline', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('<!doctype html><html><body>SPA</body></html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        }),
      ),
    );

    render(
      <MemoryRouter>
        <FeatureOverview isAuthenticated={false} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.queryByRole('link', { name: /explore swagger ui/i })).not.toBeInTheDocument();
    });
  });

  it('hides Explore Swagger UI when backend request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Connection refused')));

    render(
      <MemoryRouter>
        <FeatureOverview isAuthenticated={false} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.queryByRole('link', { name: /explore swagger ui/i })).not.toBeInTheDocument();
    });
  });

  it('shows Explore Swagger UI when backend serves OpenAPI swagger-config JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            configUrl: '/v3/api-docs/swagger-config',
            url: '/v3/api-docs',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      ),
    );

    render(
      <MemoryRouter>
        <FeatureOverview isAuthenticated={false} />
      </MemoryRouter>,
    );

    const swaggerLink = await screen.findByRole('link', { name: /explore swagger ui/i });
    expect(swaggerLink).toHaveAttribute('href', '/swagger-ui/index.html');
  });
});
