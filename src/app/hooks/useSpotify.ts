import { useQuery, useMutation } from '@tanstack/react-query';
import SpotifyService from '@services/spotify-web-api';
import spotifyService from '@services/spotify-web-api';

import { Track } from '../models/types';

// Create a singleton instance

// Hook for getting a track
export function useSpotifyTrack(trackId?: string) {
  return useQuery({
    queryKey: ['spotify', 'track', trackId],
    queryFn: () => spotifyService.getTrack(trackId as string),
    enabled: !!trackId,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 60 minutes
  });
}

// Hook for checking authentication status
export function useSpotifyAuthStatus() {
  return useQuery({
    queryKey: ['spotify', 'auth-status'],
    queryFn: () => spotifyService.isUserAuthenticated(),
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

export function usePlaySpotifyTrack() {
  return useMutation<string | boolean | null, Error, string>({
    mutationFn: (trackId: string) => spotifyService.playTrack(trackId),
  });
}

// Hook for getting authorization URL
export function useSpotifyAuthUrl() {
  return useQuery({
    queryKey: ['spotify', 'auth-url'],
    queryFn: () => spotifyService.getAuthorizationUrl(),
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

// Hook to fetch multiple tracks at once
export function useSpotifyTracks(trackIds: string[] = []) {
  return useQuery({
    queryKey: ['spotify', 'tracks', trackIds],
    queryFn: async () => {
      if (trackIds.length === 0) return [];

      const trackPromises = trackIds.map((id) => spotifyService.getTrack(id));
      return Promise.all(trackPromises);
    },
    enabled: trackIds.length > 0,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

// Hook for checking premium status
export function useSpotifyPremiumStatus() {
  return useQuery({
    queryKey: ['spotify', 'premium-status'],
    queryFn: async () => {
      const isAuthenticated = await spotifyService.isUserAuthenticated();
      if (!isAuthenticated) return false;

      // You'll need to implement this method in your spotify-web-api.tsx
      return spotifyService.checkPremiumStatus();
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}
