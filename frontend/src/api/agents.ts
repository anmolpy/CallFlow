import { apiRequest, buildQueryString } from './client';
import type {
  Agent,
  AgentAvailabilityStatus,
  AgentRequest,
  CallSummary,
  PageResponse,
} from '../types/api';

export interface AgentListParams {
  query?: string;
  availabilityStatus?: AgentAvailabilityStatus | '';
  page?: number;
  size?: number;
  sort?: string;
}

export const agentsApi = {
  list: (params: AgentListParams = {}) =>
    apiRequest<PageResponse<Agent>>(`/agents${buildQueryString({ ...params })}`),

  getById: (id: number) => apiRequest<Agent>(`/agents/${id}`),

  create: (payload: AgentRequest) =>
    apiRequest<Agent>('/agents', {
      method: 'POST',
      body: payload,
    }),

  update: (id: number, payload: AgentRequest) =>
    apiRequest<Agent>(`/agents/${id}`, {
      method: 'PUT',
      body: payload,
    }),

  updateAvailability: (id: number, availabilityStatus: AgentAvailabilityStatus) =>
    apiRequest<Agent>(`/agents/${id}/availability`, {
      method: 'PATCH',
      body: { availabilityStatus },
    }),

  getCalls: (id: number, page = 0, size = 20) =>
    apiRequest<PageResponse<CallSummary>>(`/agents/${id}/calls${buildQueryString({ page, size })}`),
};
