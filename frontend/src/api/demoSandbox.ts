import type {
  AddCallNoteRequest,
  Agent,
  AgentAvailabilityStatus,
  AgentPerformance,
  AgentRequest,
  AnalyticsOverview,
  CallDetail,
  CallNote,
  CallStatus,
  CallSummary,
  CreateCallRequest,
  Customer,
  CustomerRequest,
  PageResponse,
  StatusCount,
  UpdateCallStatusRequest,
  UserProfile,
} from '../types/api';
import { ALL_CALL_STATUSES, CALL_ALLOWED_TRANSITIONS } from '../utils/format';
import { ApiClientError } from './client';

export const DEMO_USER: UserProfile = {
  id: 1,
  email: 'demo.admin@callflow.app',
  fullName: 'Demo Supervisor',
  role: 'ADMIN',
};

interface DemoStore {
  customers: Customer[];
  agents: Agent[];
  calls: CallDetail[];
  nextCustomerId: number;
  nextAgentId: number;
  nextCallId: number;
  nextNoteId: number;
}

function minutesAgo(mins: number): string {
  return new Date(Date.now() - mins * 60_000).toISOString();
}

function createInitialStore(): DemoStore {
  const customers: Customer[] = [
    {
      id: 1,
      firstName: 'Maya',
      lastName: 'Lin',
      email: 'maya.lin@meridiancloud.io',
      phoneNumber: '+1-415-555-0142',
      createdAt: minutesAgo(14_400),
      updatedAt: minutesAgo(18),
    },
    {
      id: 2,
      firstName: 'Devon',
      lastName: 'Brooks',
      email: 'devon.brooks@northstarlogistics.com',
      phoneNumber: '+1-312-555-0198',
      createdAt: minutesAgo(12_000),
      updatedAt: minutesAgo(6),
    },
    {
      id: 3,
      firstName: 'Sora',
      lastName: 'Takahashi',
      email: 'sora@kurokawa-labs.jp',
      phoneNumber: '+1-206-555-0174',
      createdAt: minutesAgo(9_500),
      updatedAt: minutesAgo(4),
    },
    {
      id: 4,
      firstName: 'Liam',
      lastName: "O'Connor",
      email: 'liam@harborpay.co',
      phoneNumber: '+1-617-555-0115',
      createdAt: minutesAgo(7_200),
      updatedAt: minutesAgo(45),
    },
    {
      id: 5,
      firstName: 'Camila',
      lastName: 'Navarro',
      email: 'c.navarro@solsticehealth.org',
      phoneNumber: '+1-512-555-0163',
      createdAt: minutesAgo(5_100),
      updatedAt: minutesAgo(120),
    },
    {
      id: 6,
      firstName: 'Henrik',
      lastName: 'Lindqvist',
      email: 'henrik@nordicgrid.se',
      phoneNumber: '+1-646-555-0181',
      createdAt: minutesAgo(3_600),
      updatedAt: minutesAgo(310),
    },
  ];

  const agents: Agent[] = [
    {
      id: 1,
      firstName: 'Elena',
      lastName: 'Rostova',
      email: 'elena.rostova@callflow.app',
      availabilityStatus: 'AVAILABLE',
      createdAt: minutesAgo(20_000),
      updatedAt: minutesAgo(5),
    },
    {
      id: 2,
      firstName: 'Marcus',
      lastName: 'Vance',
      email: 'marcus.vance@callflow.app',
      availabilityStatus: 'BUSY',
      createdAt: minutesAgo(18_000),
      updatedAt: minutesAgo(12),
    },
    {
      id: 3,
      firstName: 'Priya',
      lastName: 'Sharma',
      email: 'priya.sharma@callflow.app',
      availabilityStatus: 'AVAILABLE',
      createdAt: minutesAgo(16_000),
      updatedAt: minutesAgo(9),
    },
    {
      id: 4,
      firstName: 'Jordan',
      lastName: 'Patel',
      email: 'jordan.patel@callflow.app',
      availabilityStatus: 'AWAY',
      createdAt: minutesAgo(14_000),
      updatedAt: minutesAgo(35),
    },
    {
      id: 5,
      firstName: 'Noah',
      lastName: 'Alvarez',
      email: 'noah.alvarez@callflow.app',
      availabilityStatus: 'OFFLINE',
      createdAt: minutesAgo(11_000),
      updatedAt: minutesAgo(240),
    },
  ];

  const calls: CallDetail[] = [
    {
      id: 4825,
      customerId: 3,
      customerName: 'Sora Takahashi',
      customerEmail: 'sora@kurokawa-labs.jp',
      customerPhoneNumber: '+1-206-555-0174',
      agentId: null,
      agentName: null,
      agentEmail: null,
      status: 'QUEUED',
      startedAt: null,
      endedAt: null,
      durationSeconds: null,
      notes: [
        {
          id: 109,
          authorAgentId: null,
          authorName: 'Queue Router',
          content: 'Enterprise SSO SAML metadata refresh requested; awaiting Tier-2 pickup.',
          createdAt: minutesAgo(4),
        },
      ],
      createdAt: minutesAgo(4),
      updatedAt: minutesAgo(4),
    },
    {
      id: 4824,
      customerId: 2,
      customerName: 'Devon Brooks',
      customerEmail: 'devon.brooks@northstarlogistics.com',
      customerPhoneNumber: '+1-312-555-0198',
      agentId: null,
      agentName: null,
      agentEmail: null,
      status: 'QUEUED',
      startedAt: null,
      endedAt: null,
      durationSeconds: null,
      notes: [
        {
          id: 108,
          authorAgentId: null,
          authorName: 'Queue Router',
          content: 'VIP SLA callback: needs carrier webhook rate-limit increase.',
          createdAt: minutesAgo(7),
        },
      ],
      createdAt: minutesAgo(7),
      updatedAt: minutesAgo(7),
    },
    {
      id: 4821,
      customerId: 1,
      customerName: 'Maya Lin',
      customerEmail: 'maya.lin@meridiancloud.io',
      customerPhoneNumber: '+1-415-555-0142',
      agentId: 2,
      agentName: 'Marcus Vance',
      agentEmail: 'marcus.vance@callflow.app',
      status: 'IN_PROGRESS',
      startedAt: minutesAgo(18),
      endedAt: null,
      durationSeconds: null,
      notes: [
        {
          id: 107,
          authorAgentId: 2,
          authorName: 'Marcus Vance',
          content: 'Verified webhook failover & rotated API keys. Reviewing audit log retention.',
          createdAt: minutesAgo(10),
        },
        {
          id: 106,
          authorAgentId: 2,
          authorName: 'Marcus Vance',
          content: 'Confirmed Enterprise SLA account ownership and secondary failover endpoint.',
          createdAt: minutesAgo(16),
        },
      ],
      createdAt: minutesAgo(20),
      updatedAt: minutesAgo(10),
    },
    {
      id: 4820,
      customerId: 4,
      customerName: "Liam O'Connor",
      customerEmail: 'liam@harborpay.co',
      customerPhoneNumber: '+1-617-555-0115',
      agentId: 1,
      agentName: 'Elena Rostova',
      agentEmail: 'elena.rostova@callflow.app',
      status: 'COMPLETED',
      startedAt: minutesAgo(58),
      endedAt: minutesAgo(54),
      durationSeconds: 248,
      notes: [
        {
          id: 105,
          authorAgentId: 1,
          authorName: 'Elena Rostova',
          content: 'Resolved invoice tax ID mismatch and re-issued September PDF statement.',
          createdAt: minutesAgo(54),
        },
      ],
      createdAt: minutesAgo(60),
      updatedAt: minutesAgo(54),
    },
    {
      id: 4819,
      customerId: 5,
      customerName: 'Camila Navarro',
      customerEmail: 'c.navarro@solsticehealth.org',
      customerPhoneNumber: '+1-512-555-0163',
      agentId: 3,
      agentName: 'Priya Sharma',
      agentEmail: 'priya.sharma@callflow.app',
      status: 'COMPLETED',
      startedAt: minutesAgo(135),
      endedAt: minutesAgo(131),
      durationSeconds: 215,
      notes: [
        {
          id: 104,
          authorAgentId: 3,
          authorName: 'Priya Sharma',
          content: 'Walked through HIPAA BAA counter-signature workflow and verified workspace roles.',
          createdAt: minutesAgo(131),
        },
      ],
      createdAt: minutesAgo(138),
      updatedAt: minutesAgo(131),
    },
    {
      id: 4818,
      customerId: 1,
      customerName: 'Maya Lin',
      customerEmail: 'maya.lin@meridiancloud.io',
      customerPhoneNumber: '+1-415-555-0142',
      agentId: 1,
      agentName: 'Elena Rostova',
      agentEmail: 'elena.rostova@callflow.app',
      status: 'COMPLETED',
      startedAt: minutesAgo(320),
      endedAt: minutesAgo(317),
      durationSeconds: 184,
      notes: [
        {
          id: 103,
          authorAgentId: 1,
          authorName: 'Elena Rostova',
          content: 'Initial onboarding call: provisioned sandbox tokens and webhook secret.',
          createdAt: minutesAgo(317),
        },
      ],
      createdAt: minutesAgo(322),
      updatedAt: minutesAgo(317),
    },
    {
      id: 4817,
      customerId: 6,
      customerName: 'Henrik Lindqvist',
      customerEmail: 'henrik@nordicgrid.se',
      customerPhoneNumber: '+1-646-555-0181',
      agentId: 4,
      agentName: 'Jordan Patel',
      agentEmail: 'jordan.patel@callflow.app',
      status: 'MISSED',
      startedAt: minutesAgo(440),
      endedAt: minutesAgo(439),
      durationSeconds: 32,
      notes: [
        {
          id: 102,
          authorAgentId: 4,
          authorName: 'Jordan Patel',
          content: 'Caller dropped before bridge connected; scheduled automatic follow-up email.',
          createdAt: minutesAgo(439),
        },
      ],
      createdAt: minutesAgo(442),
      updatedAt: minutesAgo(439),
    },
    {
      id: 4816,
      customerId: 2,
      customerName: 'Devon Brooks',
      customerEmail: 'devon.brooks@northstarlogistics.com',
      customerPhoneNumber: '+1-312-555-0198',
      agentId: 3,
      agentName: 'Priya Sharma',
      agentEmail: 'priya.sharma@callflow.app',
      status: 'COMPLETED',
      startedAt: minutesAgo(620),
      endedAt: minutesAgo(616),
      durationSeconds: 262,
      notes: [
        {
          id: 101,
          authorAgentId: 3,
          authorName: 'Priya Sharma',
          content: 'Confirmed outbound caller-ID verification for Midwest dispatch lines.',
          createdAt: minutesAgo(616),
        },
      ],
      createdAt: minutesAgo(625),
      updatedAt: minutesAgo(616),
    },
    {
      id: 4815,
      customerId: 4,
      customerName: "Liam O'Connor",
      customerEmail: 'liam@harborpay.co',
      customerPhoneNumber: '+1-617-555-0115',
      agentId: null,
      agentName: null,
      agentEmail: null,
      status: 'CANCELLED',
      startedAt: null,
      endedAt: minutesAgo(890),
      durationSeconds: null,
      notes: [
        {
          id: 100,
          authorAgentId: null,
          authorName: 'Queue Router',
          content: 'Caller cancelled request via self-service portal before agent pickup.',
          createdAt: minutesAgo(890),
        },
      ],
      createdAt: minutesAgo(895),
      updatedAt: minutesAgo(890),
    },
  ];

  return {
    customers,
    agents,
    calls,
    nextCustomerId: 7,
    nextAgentId: 6,
    nextCallId: 4826,
    nextNoteId: 110,
  };
}

let store: DemoStore = createInitialStore();

export function resetDemoSandbox(): void {
  store = createInitialStore();
}

function toCallSummary(call: CallDetail): CallSummary {
  return {
    id: call.id,
    customerId: call.customerId,
    customerName: call.customerName,
    customerEmail: call.customerEmail,
    agentId: call.agentId,
    agentName: call.agentName,
    status: call.status,
    startedAt: call.startedAt,
    endedAt: call.endedAt,
    durationSeconds: call.durationSeconds,
    noteCount: call.notes.length,
    createdAt: call.createdAt,
    updatedAt: call.updatedAt,
  };
}

function paginate<T>(items: T[], page: number, size: number): PageResponse<T> {
  const safePage = Math.max(0, page);
  const safeSize = Math.max(1, size);
  const start = safePage * safeSize;
  const content = items.slice(start, start + safeSize);
  const totalElements = items.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / safeSize));

  return {
    content,
    page: safePage,
    size: safeSize,
    totalElements,
    totalPages,
    first: safePage === 0,
    last: safePage >= totalPages - 1 || totalElements === 0,
  };
}

function applySort<T>(items: T[], sortParam: string | null): T[] {
  if (!sortParam) return [...items];
  const [field, dirRaw] = sortParam.split(',');
  const desc = dirRaw?.toLowerCase() === 'desc';

  return [...items].sort((a, b) => {
    const aVal = (a as Record<string, unknown>)[field];
    const bVal = (b as Record<string, unknown>)[field];

    if (aVal === bVal) return 0;
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;

    let cmp = 0;
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      cmp = aVal - bVal;
    } else {
      cmp = String(aVal).localeCompare(String(bVal));
    }
    return desc ? -cmp : cmp;
  });
}

function computeOverview(): AnalyticsOverview {
  let completedCalls = 0;
  let missedCalls = 0;
  let queuedCalls = 0;
  let inProgressCalls = 0;
  let cancelledCalls = 0;
  let durationSum = 0;
  let durationCount = 0;

  for (const c of store.calls) {
    if (c.status === 'COMPLETED') completedCalls += 1;
    else if (c.status === 'MISSED') missedCalls += 1;
    else if (c.status === 'QUEUED') queuedCalls += 1;
    else if (c.status === 'IN_PROGRESS') inProgressCalls += 1;
    else if (c.status === 'CANCELLED') cancelledCalls += 1;

    if (c.durationSeconds !== null && c.durationSeconds !== undefined) {
      durationSum += c.durationSeconds;
      durationCount += 1;
    }
  }

  return {
    totalCalls: store.calls.length,
    completedCalls,
    missedCalls,
    queuedCalls,
    inProgressCalls,
    cancelledCalls,
    averageDurationSeconds: durationCount > 0 ? Math.round(durationSum / durationCount) : 0,
  };
}

function computeCallsByStatus(): StatusCount[] {
  return ALL_CALL_STATUSES.map((status) => ({
    status,
    count: store.calls.filter((c) => c.status === status).length,
  }));
}

function computeAgentPerformance(): AgentPerformance[] {
  return store.agents.map((agent) => {
    const agentCalls = store.calls.filter((c) => c.agentId === agent.id);
    const completedCalls = agentCalls.filter((c) => c.status === 'COMPLETED').length;
    const missedCalls = agentCalls.filter((c) => c.status === 'MISSED').length;
    const durations = agentCalls
      .map((c) => c.durationSeconds)
      .filter((d): d is number => d !== null && d !== undefined);
    const averageDurationSeconds =
      durations.length > 0
        ? Math.round(durations.reduce((acc, d) => acc + d, 0) / durations.length)
        : 0;

    return {
      agentId: agent.id,
      agentName: `${agent.firstName} ${agent.lastName}`,
      email: agent.email,
      availabilityStatus: agent.availabilityStatus,
      totalCalls: agentCalls.length,
      completedCalls,
      missedCalls,
      averageDurationSeconds,
    };
  });
}

function parseIntParam(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Intercepts API requests when Demo Sandbox mode is active so visitors can
 * explore and interact with every operational page without a running backend.
 */
export async function handleDemoApiRequest<T>(
  normalizedPath: string,
  method = 'GET',
  body?: unknown,
): Promise<T> {
  const url = new URL(normalizedPath, 'http://demo.local');
  const pathname = url.pathname;
  const params = url.searchParams;
  const upperMethod = method.toUpperCase();

  // Auth
  if (pathname === '/auth/me' && upperMethod === 'GET') {
    return DEMO_USER as T;
  }

  // Analytics
  if (pathname === '/analytics/overview' && upperMethod === 'GET') {
    return computeOverview() as T;
  }
  if (pathname === '/analytics/calls-by-status' && upperMethod === 'GET') {
    return computeCallsByStatus() as T;
  }
  if (pathname === '/analytics/agent-performance' && upperMethod === 'GET') {
    return computeAgentPerformance() as T;
  }

  // Customers
  if (pathname === '/customers' && upperMethod === 'GET') {
    const query = (params.get('query') ?? '').trim().toLowerCase();
    const filtered = query
      ? store.customers.filter((c) =>
          `${c.firstName} ${c.lastName} ${c.email} ${c.phoneNumber}`.toLowerCase().includes(query),
        )
      : store.customers;
    const sorted = applySort(filtered, params.get('sort') ?? 'createdAt,desc');
    return paginate(
      sorted,
      parseIntParam(params.get('page'), 0),
      parseIntParam(params.get('size'), 20),
    ) as T;
  }

  if (pathname === '/customers' && upperMethod === 'POST') {
    const req = body as CustomerRequest;
    const emailLower = req.email.trim().toLowerCase();
    if (store.customers.some((c) => c.email.toLowerCase() === emailLower)) {
      throw new ApiClientError('A customer with this email already exists.', 409, 'DUPLICATE_RESOURCE');
    }
    const now = new Date().toISOString();
    const created: Customer = {
      id: store.nextCustomerId++,
      firstName: req.firstName.trim(),
      lastName: req.lastName.trim(),
      email: req.email.trim(),
      phoneNumber: req.phoneNumber.trim(),
      createdAt: now,
      updatedAt: now,
    };
    store.customers = [created, ...store.customers];
    return created as T;
  }

  const customerMatch = pathname.match(/^\/customers\/(\d+)$/);
  if (customerMatch) {
    const id = Number(customerMatch[1]);
    const customer = store.customers.find((c) => c.id === id);
    if (!customer) {
      throw new ApiClientError(`Customer #${id} not found.`, 404, 'RESOURCE_NOT_FOUND');
    }
    if (upperMethod === 'GET') {
      return customer as T;
    }
    if (upperMethod === 'PUT') {
      const req = body as CustomerRequest;
      const emailLower = req.email.trim().toLowerCase();
      if (store.customers.some((c) => c.id !== id && c.email.toLowerCase() === emailLower)) {
        throw new ApiClientError('A customer with this email already exists.', 409, 'DUPLICATE_RESOURCE');
      }
      customer.firstName = req.firstName.trim();
      customer.lastName = req.lastName.trim();
      customer.email = req.email.trim();
      customer.phoneNumber = req.phoneNumber.trim();
      customer.updatedAt = new Date().toISOString();

      for (const call of store.calls) {
        if (call.customerId === id) {
          call.customerName = `${customer.firstName} ${customer.lastName}`;
          call.customerEmail = customer.email;
          call.customerPhoneNumber = customer.phoneNumber;
        }
      }
      return { ...customer } as T;
    }
  }

  const customerCallsMatch = pathname.match(/^\/customers\/(\d+)\/calls$/);
  if (customerCallsMatch && upperMethod === 'GET') {
    const id = Number(customerCallsMatch[1]);
    const matching = store.calls.filter((c) => c.customerId === id).map(toCallSummary);
    return paginate(
      matching,
      parseIntParam(params.get('page'), 0),
      parseIntParam(params.get('size'), 20),
    ) as T;
  }

  // Agents
  if (pathname === '/agents' && upperMethod === 'GET') {
    const query = (params.get('query') ?? '').trim().toLowerCase();
    const status = params.get('availabilityStatus') as AgentAvailabilityStatus | null;
    const filtered = store.agents.filter((a) => {
      if (status && a.availabilityStatus !== status) return false;
      if (query && !`${a.firstName} ${a.lastName} ${a.email}`.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
    const sorted = applySort(filtered, params.get('sort') ?? 'firstName,asc');
    return paginate(
      sorted,
      parseIntParam(params.get('page'), 0),
      parseIntParam(params.get('size'), 20),
    ) as T;
  }

  if (pathname === '/agents' && upperMethod === 'POST') {
    const req = body as AgentRequest;
    const emailLower = req.email.trim().toLowerCase();
    if (store.agents.some((a) => a.email.toLowerCase() === emailLower)) {
      throw new ApiClientError('An agent with this email already exists.', 409, 'DUPLICATE_RESOURCE');
    }
    const now = new Date().toISOString();
    const created: Agent = {
      id: store.nextAgentId++,
      firstName: req.firstName.trim(),
      lastName: req.lastName.trim(),
      email: req.email.trim(),
      availabilityStatus: req.availabilityStatus ?? 'AVAILABLE',
      createdAt: now,
      updatedAt: now,
    };
    store.agents = [created, ...store.agents];
    return created as T;
  }

  const agentMatch = pathname.match(/^\/agents\/(\d+)$/);
  if (agentMatch) {
    const id = Number(agentMatch[1]);
    const agent = store.agents.find((a) => a.id === id);
    if (!agent) {
      throw new ApiClientError(`Agent #${id} not found.`, 404, 'RESOURCE_NOT_FOUND');
    }
    if (upperMethod === 'GET') {
      return agent as T;
    }
    if (upperMethod === 'PUT') {
      const req = body as AgentRequest;
      agent.firstName = req.firstName.trim();
      agent.lastName = req.lastName.trim();
      agent.email = req.email.trim();
      if (req.availabilityStatus) {
        agent.availabilityStatus = req.availabilityStatus;
      }
      agent.updatedAt = new Date().toISOString();

      for (const call of store.calls) {
        if (call.agentId === id) {
          call.agentName = `${agent.firstName} ${agent.lastName}`;
          call.agentEmail = agent.email;
        }
      }
      return { ...agent } as T;
    }
  }

  const agentAvailMatch = pathname.match(/^\/agents\/(\d+)\/availability$/);
  if (agentAvailMatch && upperMethod === 'PATCH') {
    const id = Number(agentAvailMatch[1]);
    const agent = store.agents.find((a) => a.id === id);
    if (!agent) {
      throw new ApiClientError(`Agent #${id} not found.`, 404, 'RESOURCE_NOT_FOUND');
    }
    const req = body as { availabilityStatus: AgentAvailabilityStatus };
    agent.availabilityStatus = req.availabilityStatus;
    agent.updatedAt = new Date().toISOString();
    return { ...agent } as T;
  }

  const agentCallsMatch = pathname.match(/^\/agents\/(\d+)\/calls$/);
  if (agentCallsMatch && upperMethod === 'GET') {
    const id = Number(agentCallsMatch[1]);
    const matching = store.calls.filter((c) => c.agentId === id).map(toCallSummary);
    return paginate(
      matching,
      parseIntParam(params.get('page'), 0),
      parseIntParam(params.get('size'), 20),
    ) as T;
  }

  // Calls
  if (pathname === '/calls' && upperMethod === 'GET') {
    const status = params.get('status') as CallStatus | null;
    const agentIdStr = params.get('agentId');
    const customerIdStr = params.get('customerId');
    const search = (params.get('search') ?? '').trim().toLowerCase();
    const fromDate = params.get('fromDate');
    const toDate = params.get('toDate');

    const filtered = store.calls.filter((c) => {
      if (status && c.status !== status) return false;
      if (agentIdStr && c.agentId !== Number(agentIdStr)) return false;
      if (customerIdStr && c.customerId !== Number(customerIdStr)) return false;
      if (fromDate && Date.parse(c.createdAt) < Date.parse(fromDate)) return false;
      if (toDate && Date.parse(c.createdAt) > Date.parse(toDate)) return false;
      if (search) {
        const haystack = [
          String(c.id),
          c.customerName,
          c.customerEmail,
          c.agentName ?? '',
          ...c.notes.map((n) => n.content),
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });

    const summaries = filtered.map(toCallSummary);
    const sorted = applySort(summaries, params.get('sort') ?? 'createdAt,desc');
    return paginate(
      sorted,
      parseIntParam(params.get('page'), 0),
      parseIntParam(params.get('size'), 10),
    ) as T;
  }

  if (pathname === '/calls' && upperMethod === 'POST') {
    const req = body as CreateCallRequest;
    const customer = store.customers.find((c) => c.id === req.customerId);
    if (!customer) {
      throw new ApiClientError('Selected customer was not found.', 404, 'RESOURCE_NOT_FOUND');
    }

    let agent: Agent | undefined;
    if (req.agentId) {
      agent = store.agents.find((a) => a.id === req.agentId);
      if (!agent) {
        throw new ApiClientError('Selected agent was not found.', 404, 'RESOURCE_NOT_FOUND');
      }
      if (agent.availabilityStatus === 'OFFLINE') {
        throw new ApiClientError(
          `${agent.firstName} ${agent.lastName} is OFFLINE and cannot be assigned.`,
          422,
          'BUSINESS_RULE_VIOLATION',
        );
      }
    }

    const now = new Date().toISOString();
    const status: CallStatus = req.status ?? (agent ? 'IN_PROGRESS' : 'QUEUED');
    const notes: CallNote[] = [];
    if (req.initialNote && req.initialNote.trim()) {
      notes.push({
        id: store.nextNoteId++,
        authorAgentId: agent?.id ?? null,
        authorName: agent ? `${agent.firstName} ${agent.lastName}` : DEMO_USER.fullName,
        content: req.initialNote.trim(),
        createdAt: now,
      });
    }

    const created: CallDetail = {
      id: store.nextCallId++,
      customerId: customer.id,
      customerName: `${customer.firstName} ${customer.lastName}`,
      customerEmail: customer.email,
      customerPhoneNumber: customer.phoneNumber,
      agentId: agent?.id ?? null,
      agentName: agent ? `${agent.firstName} ${agent.lastName}` : null,
      agentEmail: agent?.email ?? null,
      status,
      startedAt: req.startedAt ?? (status === 'IN_PROGRESS' || status === 'COMPLETED' ? now : null),
      endedAt: req.endedAt ?? (status === 'COMPLETED' || status === 'CANCELLED' ? now : null),
      durationSeconds: req.durationSeconds ?? (status === 'COMPLETED' ? 180 : null),
      notes,
      createdAt: now,
      updatedAt: now,
    };

    store.calls = [created, ...store.calls];
    return { ...created, notes: [...created.notes] } as T;
  }

  const callMatch = pathname.match(/^\/calls\/(\d+)$/);
  if (callMatch && upperMethod === 'GET') {
    const id = Number(callMatch[1]);
    const call = store.calls.find((c) => c.id === id);
    if (!call) {
      throw new ApiClientError(`Call #${id} not found.`, 404, 'RESOURCE_NOT_FOUND');
    }
    return { ...call, notes: [...call.notes] } as T;
  }

  const callAssignMatch = pathname.match(/^\/calls\/(\d+)\/assign$/);
  if (callAssignMatch && upperMethod === 'PATCH') {
    const id = Number(callAssignMatch[1]);
    const call = store.calls.find((c) => c.id === id);
    if (!call) {
      throw new ApiClientError(`Call #${id} not found.`, 404, 'RESOURCE_NOT_FOUND');
    }
    const { agentId } = body as { agentId: number };
    const agent = store.agents.find((a) => a.id === agentId);
    if (!agent) {
      throw new ApiClientError(`Agent #${agentId} not found.`, 404, 'RESOURCE_NOT_FOUND');
    }
    if (agent.availabilityStatus === 'OFFLINE') {
      throw new ApiClientError(
        `${agent.firstName} ${agent.lastName} is OFFLINE and cannot be assigned.`,
        422,
        'BUSINESS_RULE_VIOLATION',
      );
    }

    call.agentId = agent.id;
    call.agentName = `${agent.firstName} ${agent.lastName}`;
    call.agentEmail = agent.email;
    if (call.status === 'QUEUED') {
      call.status = 'IN_PROGRESS';
      call.startedAt = call.startedAt ?? new Date().toISOString();
    }
    call.updatedAt = new Date().toISOString();
    return { ...call, notes: [...call.notes] } as T;
  }

  const callStatusMatch = pathname.match(/^\/calls\/(\d+)\/status$/);
  if (callStatusMatch && upperMethod === 'PATCH') {
    const id = Number(callStatusMatch[1]);
    const call = store.calls.find((c) => c.id === id);
    if (!call) {
      throw new ApiClientError(`Call #${id} not found.`, 404, 'RESOURCE_NOT_FOUND');
    }
    const req = body as UpdateCallStatusRequest;
    const allowed = CALL_ALLOWED_TRANSITIONS[call.status];
    if (!allowed.includes(req.status)) {
      throw new ApiClientError(
        `Cannot transition call from ${call.status} to ${req.status}.`,
        422,
        'INVALID_STATE_TRANSITION',
      );
    }

    const now = new Date().toISOString();
    call.status = req.status;
    if (req.status === 'IN_PROGRESS') {
      call.startedAt = req.startedAt ?? call.startedAt ?? now;
    } else if (req.status === 'COMPLETED' || req.status === 'MISSED' || req.status === 'CANCELLED') {
      call.endedAt = req.endedAt ?? now;
      if (req.durationSeconds !== undefined && req.durationSeconds !== null) {
        call.durationSeconds = req.durationSeconds;
      } else if (req.status === 'COMPLETED' && call.durationSeconds === null) {
        const startedMs = call.startedAt ? Date.parse(call.startedAt) : Date.now() - 180_000;
        call.durationSeconds = Math.max(15, Math.round((Date.now() - startedMs) / 1000));
      }
    }
    call.updatedAt = now;
    return { ...call, notes: [...call.notes] } as T;
  }

  const callNotesMatch = pathname.match(/^\/calls\/(\d+)\/notes$/);
  if (callNotesMatch && upperMethod === 'POST') {
    const id = Number(callNotesMatch[1]);
    const call = store.calls.find((c) => c.id === id);
    if (!call) {
      throw new ApiClientError(`Call #${id} not found.`, 404, 'RESOURCE_NOT_FOUND');
    }
    const req = body as AddCallNoteRequest;
    const authorAgent = req.authorAgentId
      ? store.agents.find((a) => a.id === req.authorAgentId)
      : null;

    const note: CallNote = {
      id: store.nextNoteId++,
      authorAgentId: authorAgent?.id ?? null,
      authorName: authorAgent
        ? `${authorAgent.firstName} ${authorAgent.lastName}`
        : DEMO_USER.fullName,
      content: req.content.trim(),
      createdAt: new Date().toISOString(),
    };
    call.notes = [note, ...call.notes];
    call.updatedAt = note.createdAt;
    return note as T;
  }

  throw new ApiClientError(`Demo endpoint not implemented: ${upperMethod} ${pathname}`, 404, 'NOT_FOUND');
}
