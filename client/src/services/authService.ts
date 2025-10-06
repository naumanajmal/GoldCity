import api from './api';
import { LoginCredentials, RegisterCredentials, User } from '../types';

export const login = async (credentials: LoginCredentials): Promise<{ user: User; token: string }> => {
  const response = await api.post('/auth/login', credentials);
  return response.data.data;
};

export const register = async (credentials: RegisterCredentials): Promise<void> => {
  await api.post('/auth/register', credentials);
};
