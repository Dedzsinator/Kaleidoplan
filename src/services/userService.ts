import api from './api';
import { User, ApiResponse } from '../app/models/types';

export const getUserById = async (userId: string): Promise<User | null> => {
  try {
    return await api.get(`/user/${userId}`);
  } catch (error) {
    console.error(`Error fetching user ${userId}:`, error);
    throw error;
  }
};

export const getUsers = async (params: { page?: number; limit?: number; role?: string }) => {
  try {
    // Fix params by converting to query string
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });
    const queryString = queryParams.toString();
    return await api.get(`/user${queryString ? `?${queryString}` : ''}`);
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

export const updateUser = async (userId: string, userData: Partial<User>): Promise<User> => {
  try {
    return await api.put(`/user/${userId}`, userData);
  } catch (error) {
    console.error(`Error updating user ${userId}:`, error);
    throw error;
  }
};

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
