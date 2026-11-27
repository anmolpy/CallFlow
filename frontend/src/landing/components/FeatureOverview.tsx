import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';

const PLATFORM_CAPABILITIES = [
  {
    index: '01',
    title: 'Queue Routing & Call Lifecycle',
    description:
      'Track every support interaction from QUEUED through IN_PROGRESS to COMPLETED, MISSED, or CANCELLED with validated state transitions and instant agent assignment.',
    endpoint: 'PATCH /api/calls/{id}/status',
  },
  {
    index: '02',
    title: 'Customer History & Profiles',
    description:
      'Search customers by name, email, or phone number and inspect chronological call timelines before answering the line—no more asking callers to repeat themselves.',
    endpoint: 'GET /api/customers/{id}/calls',
  },
  {
    index: '03',
    title: 'Timestamped Support Notes',
    description:
      'Attach agent-authored operational notes directly to every call record so full context carries across shift handoffs and escalations.',
    endpoint: 'POST /api/calls/{id}/notes',
  },
  {
    index: '04',
    title: 'Live Agent Availability',
    description:
      'Filter the support roster across AVAILABLE, BUSY, AWAY, and OFFLINE states with centralized assignable-agent validation.',
    endpoint: 'PATCH /api/agents/{id}/availability',
  },
  {
    index: '05',
    title: 'Operations Analytics',
    description:
      'Monitor queue depth, completion rates, status counts, average call duration, and per-agent throughput from PostgreSQL aggregations.',
    endpoint: 'GET /api/analytics/overview',
  },
  {
    index: '06',
    title: 'Stateless JWT & OpenAPI 3',
    description:
      'Secured with Spring Security BCrypt credentials, ADMIN/AGENT role authorization, and 17 documented OpenAPI 3 REST paths.',
    endpoint: 'POST /api/auth/login',
  },
];

export function FeatureOverview({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <div className="relative z-20 border-t border-[#161211]/12 bg-[#f9f3f2] text-[#161211]">
      {/* Architectural Editorial Capabilities Ledger */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-24 sm:px-10">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-[#625957]">
              Platform Capabilities
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#161211] sm:text-5xl">
              Every call, customer, and metric in{' '}
              <span className="font-serif italic font-normal text-blue-700">one cohesive flow.</span>
            </h2>
          </div>
          <div className="lg:col-span-5">
            <p className="text-sm leading-relaxed text-[#625957] sm:text-base">
              CallFlow replaces disconnected phone trees and ad-hoc notes with a unified Java 21,
              Spring Boot 3, and PostgreSQL operations platform.
            </p>
          </div>
        </div>

        <div className="mt-14 border-b border-[#161211]/12">
          {PLATFORM_CAPABILITIES.map((item) => (
            <div
              key={item.index}
              className="grid gap-3 border-t border-[#161211]/12 py-6 transition-colors hover:bg-[#f2e9e7]/65 sm:px-3 md:grid-cols-12 md:items-baseline"
            >
              <div className="flex items-baseline gap-4 md:col-span-4">
                <span className="font-mono text-xs font-medium text-[#625957]">{item.index}</span>
                <h3 className="text-base font-semibold tracking-tight text-[#161211] sm:text-lg">
                  {item.title}
                </h3>
              </div>
              <p className="text-sm leading-relaxed text-[#625957] md:col-span-5">
                {item.description}
              </p>
              <div className="md:col-span-3 md:text-right">
                <code className="inline-block rounded-md border border-[#161211]/10 bg-[#fffdfd] px-2.5 py-1 font-mono text-[11px] text-[#161211]">
                  {item.endpoint}
                </code>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* API & Console Strip */}
      <section
        id="api-overview"
        className="border-t border-[#161211]/12 bg-[#f3eae8]"
      >
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 px-6 py-20 sm:px-10 lg:flex-row lg:items-center">
          <div className="max-w-xl">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-[#625957]">
              REST Architecture · 17 OpenAPI Paths
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#161211] sm:text-4xl">
              Ready for your support floor and automated integrations.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#625957] sm:text-base">
              Inspect live endpoints in Swagger UI or sign in to the React operations console to
              manage queues, customer call history, agent states, and analytics.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to={isAuthenticated ? '/dashboard' : '/login'}
              className="inline-flex items-center gap-2 rounded-full bg-[#161211] px-6 py-3.5 text-sm font-semibold text-[#f9f3f2] transition hover:bg-[#2c2523]"
            >
              <span>{isAuthenticated ? 'Open Console' : 'Sign In to Console'}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="/swagger-ui/index.html"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-[#161211]/20 bg-[#f9f3f2] px-6 py-3.5 text-sm font-semibold text-[#161211] transition hover:border-[#161211]/45"
            >
              <span>Explore Swagger UI</span>
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#161211]/12 bg-[#f9f3f2] px-6 py-10 sm:px-10">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold tracking-tight text-[#161211]">CallFlow</p>
            <p className="text-xs text-[#625957]">You do the calls, we do the flow.</p>
          </div>
          <div className="flex flex-wrap items-center gap-6 font-mono text-xs text-[#625957]">
            <a href="#evolution-top" className="transition hover:text-[#161211]">
              Evolution
            </a>
            <a href="#features" className="transition hover:text-[#161211]">
              Capabilities
            </a>
            <a href="#api-overview" className="transition hover:text-[#161211]">
              API Docs
            </a>
            <Link to="/login" className="transition hover:text-[#161211]">
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
