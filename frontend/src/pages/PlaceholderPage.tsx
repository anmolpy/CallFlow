import { Link } from 'react-router-dom';
import { ArrowRight, Layers, Phone } from 'lucide-react';
import { Badge, Card, PageHeader } from '../components/ui';

interface PlaceholderPageProps {
  title: string;
  description: string;
  routePath: string;
  plannedCapabilities: string[];
  standalone?: boolean;
}

export function PlaceholderPage({
  title,
  description,
  routePath,
  plannedCapabilities,
  standalone = false,
}: PlaceholderPageProps) {
  const content = (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={<Badge tone="info">Milestone 11 Foundation Route</Badge>}
      />

      <Card
        title="Route & Integration Readiness"
        subtitle={`Registered route: ${routePath}`}
        action={<Layers className="h-5 w-5 text-brand-600" />}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            This view is intentionally scoped as a structural placeholder for Milestone 11. Typed API
            clients, authentication state, layout navigation, and UI primitives are wired and ready for
            Milestone 12 feature implementation.
          </p>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Planned Milestone 12 Capabilities
            </h3>
            <ul className="mt-2 space-y-2">
              {plannedCapabilities.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                  <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {standalone && (
            <div className="border-t border-slate-100 pt-4 text-xs text-slate-500">
              Protected console routes ({' '}
              <Link className="font-medium text-brand-600 hover:underline" to="/dashboard">
                /dashboard
              </Link>
              ,{' '}
              <Link className="font-medium text-brand-600 hover:underline" to="/calls">
                /calls
              </Link>
              ,{' '}
              <Link className="font-medium text-brand-600 hover:underline" to="/customers">
                /customers
              </Link>
              ,{' '}
              <Link className="font-medium text-brand-600 hover:underline" to="/agents">
                /agents
              </Link>{' '}
              ) redirect unauthenticated requests here via <code>ProtectedRoute</code>.
            </div>
          )}
        </div>
      </Card>
    </>
  );

  if (!standalone) {
    return content;
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
            <Phone className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-bold tracking-tight text-slate-900">CallFlow</p>
            <p className="text-xs text-slate-500">Customer Support &amp; Call Operations</p>
          </div>
        </div>
        {content}
      </div>
    </div>
  );
}
