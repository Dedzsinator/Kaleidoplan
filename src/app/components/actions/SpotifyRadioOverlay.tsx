import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Event, Track } from '@models/types';
import spotifyService from '@services/spotify-web-api';

import { usePlaylist } from '../../hooks/usePlaylists';
import { useSpotifyTracks, useSpotifyAuthStatus, usePlaySpotifyTrack } from '../../hooks/useSpotify';
import '../../styles/SpotifyRadioOverlay.css';

// Add SVG icons as components for better appearance
const PlayIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const PauseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
);

const PrevIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
  </svg>
);

const NextIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
  </svg>
);

const LoadingIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="loading-icon">
    <path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8Z" />
  </svg>
);

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </svg>
);

const ErrorIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
  </svg>
);

interface SpotifyRadioOverlayProps {
  currentEvent: Event | null;
  isPlaying: boolean;
  onTogglePlay: (isPlaying: boolean) => void;
  onExpand: () => void;
  expanded: boolean;
}

const SpotifyRadioOverlay: React.FC<SpotifyRadioOverlayProps> = ({
  currentEvent,
  isPlaying,
  onTogglePlay,
  onExpand,
  expanded,
}) => {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [trackData, setTrackData] = useState<Track[]>([]);
  const [usingSdkPlayback, setUsingSdkPlayback] = useState(false);
  const [isPremiumUser, setIsPremiumUser] = useState<boolean | null>(null);
  const [errorState, setErrorState] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { playlist, loading: playlistLoading, error } = usePlaylist(currentEvent?.playlistId);

  // Check Spotify authentication status
  const { data: isAuthenticated, isLoading: authLoading } = useSpotifyAuthStatus();

  // Extract track IDs from playlist
  const trackIds = React.useMemo(() => {
    if (!playlist?.tracks) return [];

    if (Array.isArray(playlist.tracks)) {
      return playlist.tracks.filter(Boolean) as string[];
    }

    if (typeof playlist.tracks === 'object' && !Array.isArray(playlist.tracks)) {
      return Object.values(playlist.tracks as Record<string, unknown>)
        .map((track) => (track as Track).spotifyId)
        .filter(Boolean) as string[];
    }

    if (typeof playlist.tracks === 'string') {
      try {
        const parsed = JSON.parse(playlist.tracks as string);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
      } catch {
        return [];
      }
    }

    return [];
  }, [playlist]);

  // Fetch all tracks data using React Query
  const { data: spotifyTracks, isLoading: tracksLoading } = useSpotifyTracks(trackIds);

  // Process spotify tracks to create track data
  useEffect(() => {
    if (spotifyTracks && Array.isArray(spotifyTracks)) {
      const processedTracks = spotifyTracks
        .filter((track) => track) // Filter out null/undefined tracks
        .map((track) => ({
          name: track.name || 'Unknown Track',
          artist: track.artists?.[0]?.name || 'Unknown Artist',
          spotifyId: track.id,
          previewUrl: track.preview_url || undefined,
          albumArt: track.album?.images?.[0]?.url,
        }));

      if (processedTracks.length > 0) {
        setTrackData(processedTracks);
        setErrorState(null);
      } else if (!tracksLoading && trackIds.length > 0) {
        setErrorState('No tracks available');
      }
    }
  }, [spotifyTracks, tracksLoading, trackIds]);

  // Use mutation for playing tracks
  const playTrackMutation = usePlaySpotifyTrack();

  const nextTrack = useCallback(() => {
    if (trackData.length === 0) return;

    setCurrentTrackIndex((prev) => (prev + 1) % trackData.length);

    // If playing, restart with new track
    if (isPlaying) {
      if (usingSdkPlayback) {
        // For SDK playback, we'll trigger playback in the handlePlayback function
      } else if (audioRef.current) {
        audioRef.current.pause();
      }
      // Play will be triggered by the effect calling handlePlayback
    }
  }, [trackData.length, isPlaying, usingSdkPlayback]);

  const handlePlayback = useCallback(async () => {
    if (!trackData.length || currentTrackIndex >= trackData.length) {
      setErrorState('No track available to play');
      return;
    }

    const track = trackData[currentTrackIndex];
    if (!track.spotifyId) {
      setErrorState('Track ID missing');
      nextTrack(); // Move to next track automatically
      return;
    }

    setIsLoading(true);
    setErrorState(null);
    setPlaybackError(null);

    try {
      const playResult = await playTrackMutation.mutateAsync(track.spotifyId);

      if (playResult === 'NEXT_TRACK') {
        // Special signal to move to the next track
        setPlaybackError('Track unavailable, trying next one...');
        setTimeout(() => {
          nextTrack();
        }, 500);
        return;
      }

      if (playResult === 'spotify:sdk:playing' || playResult === true) {
        // Track is playing via Spotify SDK (handles both string and boolean true responses)
        onTogglePlay(true);
        setUsingSdkPlayback(true);
      } else if (playResult) {
        // We have a preview URL (any truthy string that isn't 'spotify:sdk:playing')
        onTogglePlay(true);
        setUsingSdkPlayback(false);
      } else {
        // Track exists but isn't playable - try next track
        setPlaybackError('Track unavailable in your region, trying next one...');
        setTimeout(() => {
          nextTrack();
        }, 1000);
      }
    } catch (error) {
      // Special handling for CloudPlaybackClientError
      if (
        error instanceof Error &&
        (error.message.includes('CloudPlaybackClientError') || error.message.includes('PlayLoad event failed'))
      ) {
        console.warn('Received expected CloudPlaybackClientError - continuing playback');
        // These errors can be ignored, they don't affect actual playback
        onTogglePlay(true);
        setUsingSdkPlayback(true);

        // Force UI to show correct play state after a short delay
        setTimeout(() => {
          if (isPlaying) {
            // Reaffirm that we're playing
            onTogglePlay(true);
          }
        }, 500);
        return;
      }

      console.error(`Error playing track ${track.spotifyId}:`, error);
      setPlaybackError('Playback failed. Trying next track...');
      setTimeout(() => {
        nextTrack();
      }, 1000);
    } finally {
      setIsLoading(false);
    }
  }, [trackData, currentTrackIndex, playTrackMutation, onTogglePlay, nextTrack, isPlaying]);

  // Trigger playback when track changes or play state changes
  useEffect(() => {
    if (isPlaying && trackData.length > 0 && !isLoading) {
      handlePlayback();
    }
  }, [currentTrackIndex, isPlaying, trackData.length, handlePlayback, isLoading]);

  useEffect(() => {
    if (usingSdkPlayback && isPlaying) {
      // Function to check if track has ended and play next track
      const checkTrackEnded = async () => {
        try {
          const state = await spotifyService.player?.getCurrentState();

          // If track has finished (position near the end of duration)
          if (state && state.duration - state.position < 1000) {
            nextTrack();
          }
        } catch (error) {
          console.warn('Error checking playback state:', error);
        }
      };

      // Set interval to check track position periodically
      const interval = setInterval(checkTrackEnded, 3000);

      return () => {
        clearInterval(interval);
      };
    }
  }, [usingSdkPlayback, isPlaying, nextTrack]);

  const handleAudioEnded = useCallback(() => {
    if (!usingSdkPlayback) {
      nextTrack();
    }
  }, [nextTrack, usingSdkPlayback]);

  // Setup audio element and ended event listener
  useEffect(() => {
    const currentAudioRef = audioRef.current;

    if (currentAudioRef) {
      currentAudioRef.addEventListener('ended', handleAudioEnded);

      return () => {
        if (currentAudioRef) {
          currentAudioRef.removeEventListener('ended', handleAudioEnded);
        }
      };
    }
  }, [handleAudioEnded]);

  // Get current track
  const getCurrentTrack = useCallback((): Track | null => {
    if (trackData.length === 0) return null;
    return trackData[currentTrackIndex % trackData.length];
  }, [trackData, currentTrackIndex]);

  // Previous track function
  const prevTrack = useCallback(() => {
    if (trackData.length === 0) return;

    setCurrentTrackIndex((prev) => (prev - 1 + trackData.length) % trackData.length);

    // If playing, restart with new track
    if (isPlaying) {
      if (usingSdkPlayback) {
        // For SDK playback, we'll trigger in handlePlayback
      } else if (audioRef.current) {
        audioRef.current.pause();
      }
      // Play will be triggered by the effect
    }
  }, [trackData.length, isPlaying, usingSdkPlayback]);

  // Get the current track
  const currentTrack = getCurrentTrack();

  const handlePlayPauseToggle = () => {
    if (isPlaying) {
      onTogglePlay(false);
    } else {
      if (currentTrack?.spotifyId) {
        handlePlayback();
      } else {
        onTogglePlay(true);
      }
    }
  };

  // If there's no playlist or no tracks, show a simplified version
  if (playlistLoading) {
    return (
      <div className="spotify-overlay mini-player">
        <img
          src={currentEvent?.coverImageUrl || 'https://via.placeholder.com/50'}
          className="mini-image"
          alt="Loading"
        />
        <div className="mini-info">
          <span className="mini-title">Loading music...</span>
          <span className="mini-artist">Please wait</span>
        </div>
        <button className="mini-play-button" disabled={true}>
          <LoadingIcon />
        </button>
      </div>
    );
  }

  if (!currentTrack) {
    return (
      <div className="spotify-overlay mini-player">
        <img
          src={currentEvent?.coverImageUrl || 'https://via.placeholder.com/50'}
          className="mini-image"
          alt="Event cover"
        />
        <div className="mini-info">
          <span className="mini-title" title={currentEvent?.name || 'Loading event'}>
            {currentEvent?.name || 'Loading event'}
          </span>
          <span className="mini-artist" title="Music unavailable">
            Music unavailable
          </span>
        </div>
        <button className="mini-play-button" disabled={true}>
          <ErrorIcon />
        </button>
      </div>
    );
  }

  // Render the full player when we have track data
  return (
    <>
      <audio
        ref={audioRef}
        style={{ display: 'none' }}
        src={!usingSdkPlayback && currentTrack?.previewUrl ? currentTrack.previewUrl : undefined}
        onEnded={handleAudioEnded}
        autoPlay={!usingSdkPlayback && isPlaying}
      />
      {expanded ? (
        <div className={`spotify-overlay expanded-container`}>
          <button className="close-button" onClick={onExpand}>
            <CloseIcon />
          </button>

          <div className="expanded-player">
            <img
              src={currentTrack.albumArt || currentEvent?.coverImageUrl || 'https://via.placeholder.com/200'}
              className="album-art"
              alt={`Album art for ${currentTrack.name}`}
            />

            <span className="playlist-name">{playlist?.name || 'Event Playlist'}</span>
            <span className="track-title">{currentTrack.name}</span>
            <span className="artist-name">{currentTrack.artist}</span>

            {(playbackError || errorState) && <span className="error-text">{playbackError || errorState}</span>}

            {isPremiumUser === false && (
              <span className="premium-notice">Connect with Spotify Premium for full tracks</span>
            )}

            <div className="controls">
              <button className="control-button" onClick={prevTrack}>
                <PrevIcon />
              </button>

              <button className="play-button" onClick={handlePlayPauseToggle} disabled={isLoading}>
                {isLoading ? <LoadingIcon /> : isPlaying ? <PauseIcon /> : <PlayIcon />}
              </button>

              <button className="control-button" onClick={nextTrack}>
                <NextIcon />
              </button>
            </div>

            <span className="event-name">From: {currentEvent?.name || 'Unknown Event'}</span>
          </div>
        </div>
      ) : (
        <div className="spotify-overlay mini-player">
          <div className="mini-image-container" onClick={onExpand}>
            <img
              src={currentTrack.albumArt || currentEvent?.coverImageUrl || 'https://via.placeholder.com/50'}
              className="mini-image"
              alt="Album cover"
            />
            {(playbackError || errorState) && <div className="error-indicator">!</div>}
          </div>

          <div className="mini-info">
            <span className="mini-title" title={currentTrack.name}>
              {currentTrack.name}
            </span>
            <span className="mini-artist" title={currentTrack.artist}>
              {currentTrack.artist}
            </span>
          </div>

          <div className="mini-controls">
            <button className="mini-control-button" onClick={prevTrack}>
              <PrevIcon />
            </button>

            <button className="mini-play-button" onClick={handlePlayPauseToggle} disabled={isLoading}>
              {isLoading ? <LoadingIcon /> : isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>

            <button className="mini-control-button" onClick={nextTrack}>
              <NextIcon />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default SpotifyRadioOverlay;
