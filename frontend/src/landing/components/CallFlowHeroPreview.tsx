const QUEUED_CALLS = [
  { id: 'CF-4824', customer: 'Devon Brooks', wait: '0:24', status: 'QUEUED' },
  { id: 'CF-4825', customer: 'Sora Takahashi', wait: '0:41', status: 'QUEUED' },
  { id: 'CF-4821', customer: 'Maya Lin', wait: '3:18 active', status: 'IN_PROGRESS' },
];

const AGENT_ROSTER = [
  { name: 'Elena R.', status: 'AVAILABLE', dot: 'bg-emerald-600' },
  { name: 'Marcus T.', status: 'BUSY', dot: 'bg-amber-600' },
  { name: 'Priya S.', status: 'AVAILABLE', dot: 'bg-emerald-600' },
];

export function CallFlowHeroPreview() {
  return (
    <div className="rounded-2xl border border-[#161211]/12 bg-white p-4 shadow-[0_20px_50px_-24px_rgba(22,18,17,0.14)] sm:p-5">
      <div className="flex items-center justify-between border-b border-[#161211]/10 pb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-600" />
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#625957]">
            Live Operations Snapshot
          </span>
        </div>
        <span className="font-mono text-[11px] font-semibold text-blue-700">98.4% SLA</span>
      </div>

      <div className="mt-3.5 grid gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-[#625957]">
            <span>Queue Routing</span>
            <span className="text-[#161211]">03</span>
          </div>
          <div className="divide-y divide-[#161211]/10 border-y border-[#161211]/10">
            {QUEUED_CALLS.map((call) => (
              <div
                key={call.id}
                className="flex items-center justify-between py-2 text-xs"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-[#161211]">{call.customer}</p>
                  <p className="font-mono text-[11px] text-[#625957]">
                    {call.id} · {call.wait}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ${
                    call.status === 'IN_PROGRESS'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-neutral-100 text-[#161211]'
                  }`}
                >
                  {call.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-[#625957]">
              <span>Agent Roster</span>
              <span className="text-emerald-700">2 available</span>
            </div>
            <div className="space-y-1.5 rounded-xl bg-neutral-50 p-2.5">
              {AGENT_ROSTER.map((agent) => (
                <div key={agent.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 font-medium text-[#161211]">
                    <span className={`h-1.5 w-1.5 rounded-full ${agent.dot}`} />
                    {agent.name}
                  </span>
                  <span className="font-mono text-[10px] font-semibold text-[#625957]">
                    {agent.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[#161211]/10 bg-neutral-50/70 p-2.5">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#625957]">
              Call Note · #CF-4821
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[#161211]">
              “Webhook failover verified &amp; API key rotated. Auto-logged to customer history.”
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
