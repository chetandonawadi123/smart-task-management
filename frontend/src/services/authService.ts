import api from '../lib/api';
import type { User } from '../types';

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  organization_name: string;
}

export interface LoginData {
  username: string; // email in OAuth2PasswordRequestForm
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export const authService = {
  async register(data: RegisterData): Promise<User> {
    const response = await api.post<User>('/api/v1/auth/register', data);
    return response.data;
  },

  async login(data: LoginData): Promise<TokenResponse> {
    const formData = new URLSearchParams();
    formData.append('username', data.username);
    formData.append('password', data.password);

    const response = await api.post<TokenResponse>('/api/v1/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },

  async getCurrentUser(): Promise<User> {
    const response = await api.get<User>('/api/v1/auth/me');
    return response.data;
  },
};

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'data' in error.response
  ) {
    const data = error.response.data;
    if (typeof data === 'object' && data !== null && 'detail' in data) {
      const detail = data.detail;
      if (typeof detail === 'string') return detail;
      if (Array.isArray(detail)) {
        return detail
          .map((item) =>
            typeof item === 'object' && item !== null && 'msg' in item
              ? String(item.msg)
              : String(item)
          )
          .join(', ');
      }
    }
  }
  return fallback;
}
