import api from './api';
import { getAuth } from 'firebase/auth';

/**
 * Get all users (admin only)
 */
export const getAllUsers = async (): Promise<any[]> => {
  try {
    console.log('Fetching all users...');
    // The issue is that api.get() returns direct JSON, not a response object with a data property
    const response = await api.get('/users');
    
    // Log the actual response to debug
    console.log('Users API response:', response);
    
    // Handle different response formats
    if (Array.isArray(response)) {
      return response;
    } else if (response && response.users) {
      return response.users;
    }
    return [];
  } catch (error) {
    console.error('Error fetching users:', error);
    // Return empty array to prevent UI errors
    return [];
  }
};

/**
 * Update a user's role
 * @param userId The ID of the user to update
 * @param role The new role to assign
 */
export const updateUserRole = async (userId: string, role: string): Promise<any> => {
  try {
    console.log(`Updating user ${userId} to role: ${role}`);
    const response = await api.patch(`/users/${userId}/role`, { role });
    return response;
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
};
