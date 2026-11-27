import { apiRequest, buildQueryString } from './client';
import type {
  AddCallNoteRequest,
  CallDetail,
  CallNote,
  CallStatus,
  CallSummary,
  CreateCallRequest,
  PageResponse,
  UpdateCallStatusRequest,
} from '../types/api';

export interface CallSearchParams {
  status?: CallStatus | '';
  agentId?: number;
  customerId?: number;
  search?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export const callsApi = {
  list: (params: CallSearchParams = {}) =>
    apiRequest<PageResponse<CallSummary>>(`/calls${buildQueryString({ ...params })}`),

  getById: (id: number) => apiRequest<CallDetail>(`/calls/${id}`),

  create: (payload: CreateCallRequest) =>
    apiRequest<CallDetail>('/calls', {
      method: 'POST',
      body: payload,
    }),

  assign: (id: number, agentId: number) =>
    apiRequest<CallDetail>(`/calls/${id}/assign`, {
      method: 'PATCH',
      body: { agentId },
    }),

  updateStatus: (id: number, payload: UpdateCallStatusRequest) =>
    apiRequest<CallDetail>(`/calls/${id}/status`, {
      method: 'PATCH',
      body: payload,
    }),

  addNote: (id: number, payload: AddCallNoteRequest) =>
    apiRequest<CallNote>(`/calls/${id}/notes`, {
      method: 'POST',
      body: payload,
    }),
};
