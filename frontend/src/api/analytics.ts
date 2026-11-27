import { apiRequest } from './client';
import type { AgentPerformance, AnalyticsOverview, StatusCount } from '../types/api';

export const analyticsApi = {
  getOverview: () => apiRequest<AnalyticsOverview>('/analytics/overview'),
  getCallsByStatus: () => apiRequest<StatusCount[]>('/analytics/calls-by-status'),
  getAgentPerformance: () => apiRequest<AgentPerformance[]>('/analytics/agent-performance'),
};
