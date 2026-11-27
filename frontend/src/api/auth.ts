import { apiRequest } from './client';
import type { AuthResponse, LoginRequest, UserProfile } from '../types/api';

export const authApi = {
  login: (payload: LoginRequest) =>
    apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: payload,
      skipAuth: true,
    }),

  me: () => apiRequest<UserProfile>('/auth/me'),
};
