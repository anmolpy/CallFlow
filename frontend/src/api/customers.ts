import { apiRequest, buildQueryString } from './client';
import type { CallSummary, Customer, CustomerRequest, PageResponse } from '../types/api';

export interface CustomerSearchParams {
  query?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export const customersApi = {
  list: (params: CustomerSearchParams = {}) =>
    apiRequest<PageResponse<Customer>>(`/customers${buildQueryString({ ...params })}`),

  getById: (id: number) => apiRequest<Customer>(`/customers/${id}`),

  create: (payload: CustomerRequest) =>
    apiRequest<Customer>('/customers', {
      method: 'POST',
      body: payload,
    }),

  update: (id: number, payload: CustomerRequest) =>
    apiRequest<Customer>(`/customers/${id}`, {
      method: 'PUT',
      body: payload,
    }),

  getCalls: (id: number, page = 0, size = 20) =>
    apiRequest<PageResponse<CallSummary>>(`/customers/${id}/calls${buildQueryString({ page, size })}`),
};
