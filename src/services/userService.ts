import api from './api';
import { User, ApiResponse } from '../app/models/types';

export const getAllUsers = async (): Promise<User[]> => {
  try {
    const response = await api.get('/user?limit=100');

    // Type assertion after receiving the response
    if (Array.isArray(response)) {
      return response as User[];
    } else if (response && 'users' in response) {
      return (response as { users: User[] }).users;
    }
    return [];
  } catch (error: unknown) {
    console.error('Error fetching users:', error);
    return [];
  }
};

export const updateUserRole = async (userId: string, role: string): Promise<ApiResponse<User>> => {
  try {
    const response = await api.patch<ApiResponse<User>>(`/user/${userId}/role`, { role });
    return response;
  } catch (error: unknown) {
    console.error('Error updating user role:', error);
    // Re-throw the error after logging
    throw error;
  }
};
