import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserById, getUsers, updateUser, updateUserRole } from '@services/userService';

import { User } from '../models/types';

// Get a single user by ID
export function useUser(userId?: string) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      if (!userId) return null;
      return getUserById(userId);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get a list of users with optional filtering
export function useUsers(
  params: {
    page?: number;
    limit?: number;
    role?: string;
  } = {},
) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => getUsers(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Update a user
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<User> }) => updateUser(id, data),
    onSuccess: (data, variables) => {
      // Update cache for the specific user
      queryClient.setQueryData(['user', variables.id], data);
      // Invalidate users list
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => updateUserRole(id, role),
    onSuccess: (data, variables) => {
      // Update cache for the specific user
      queryClient.setQueryData(['user', variables.id], data);
      // Invalidate users list
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
