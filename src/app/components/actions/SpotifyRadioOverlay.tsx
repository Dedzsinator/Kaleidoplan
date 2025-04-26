import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Event, Playlist, Track } from '../../models/types';
import { usePlaylist } from '../../hooks/usePlaylist';
import spotifyService from '../../../services/spotify-web-api';
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
  currentEvent: Event;
  isPlaying: boolean;
  onTogglePlay: () => void;
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

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch playlist data using the hook
  const { playlist, loading: playlistLoading, error } = usePlaylist(currentEvent?.playlistId);

  // Initialize Audio or Spotify Player
  useEffect(() => {
    const initPlayback = async () => {
      try {
        // First check if user is authenticated with Spotify
        const isAuthenticated = await spotifyService.isUserAuthenticated();

        if (isAuthenticated) {
          // Try to initialize the Spotify Web Playback SDK
          console.log('Trying to initialize Spotify Web Playback SDK');
          const sdkInitialized = await spotifyService.initializePlayer();

          if (sdkInitialized) {
            console.log('Successfully initialized Spotify Web Playback SDK');
            setUsingSdkPlayback(true);
            setIsPremiumUser(true);
            setAudioInitialized(true);
            return;
          } else {
            console.log('Failed to initialize Spotify Web Playback SDK, falling back to audio element');
            setIsPremiumUser(false);
          }
        }

        // Fall back to audio element for non-authenticated or non-Premium users
        if (!audioRef.current) {
          audioRef.current = new Audio();
          audioRef.current.onended = () => {
            nextTrack();
          };
        }
        setUsingSdkPlayback(false);
        setAudioInitialized(true);
      } catch (error) {
        console.error('Error initializing playback:', error);
        setPlaybackError('Could not initialize audio system');
        setAudioInitialized(true); // Still set to true so we can show error state
      }
    };

    initPlayback();

    // Cleanup
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Process raw track IDs from playlist data
  useEffect(() => {
    const processPlaylistTracks = async () => {
      if (!playlist) return;

      try {
        console.log('Processing playlist tracks:', playlist);
        if (playlist.tracks) {
          const tracks: Track[] = [];

          // If tracks is already a Record<string, Track>, convert to array
          if (
            typeof playlist.tracks === 'object' &&
            !Array.isArray(playlist.tracks) &&
            !('length' in playlist.tracks)
          ) {
            Object.values(playlist.tracks).forEach((track) => {
              tracks.push(track as Track);
            });
          }
          // Handle array of strings (track IDs)
          else if (Array.isArray(playlist.tracks)) {
            const trackIds = playlist.tracks as string[];
            console.log('Track IDs from playlist (array):', trackIds);

            // Fetch track data for each ID
            for (const trackId of trackIds) {
              try {
                const spotifyTrack = await spotifyService.getTrack(trackId);
                if (spotifyTrack) {
                  const track: Track = {
                    name: spotifyTrack.name || 'Unknown Track',
                    artist: spotifyTrack.artists?.[0]?.name || 'Unknown Artist',
                    spotifyId: trackId,
                    previewUrl: spotifyTrack.preview_url || undefined,
                    albumArt: spotifyTrack.album?.images?.[0]?.url,
                  };
                  tracks.push(track);
                }
              } catch (error) {
                console.error(`Error fetching track ${trackId}:`, error);
              }
            }
          }
          // Handle string (could be a JSON string of track IDs)
          else if (typeof playlist.tracks === 'string') {
            let trackIds: string[] = [];
            const tracksStr = playlist.tracks as string;

            if (tracksStr.startsWith('[')) {
              try {
                trackIds = JSON.parse(tracksStr.replace(/\\/g, ''));
              } catch (e) {
                console.error('Error parsing track IDs:', e);
                trackIds = [];
              }
            }

            console.log('Track IDs from playlist (string):', trackIds);

            // Fetch track data for each ID
            for (const trackId of trackIds) {
              try {
                const spotifyTrack = await spotifyService.getTrack(trackId);
                if (spotifyTrack) {
                  const track: Track = {
                    name: spotifyTrack.name || 'Unknown Track',
                    artist: spotifyTrack.artists?.[0]?.name || 'Unknown Artist',
                    spotifyId: trackId,
                    previewUrl: spotifyTrack.preview_url || undefined,
                    albumArt: spotifyTrack.album?.images?.[0]?.url,
                  };
                  tracks.push(track);
                }
              } catch (error) {
                console.error(`Error fetching track ${trackId}:`, error);
              }
            }
          }

          console.log('Processed track data:', tracks);
          setTrackData(tracks);
        }
      } catch (error) {
        console.error('Error processing playlist tracks:', error);
        setPlaybackError('Failed to process playlist tracks');
      }
    };

    processPlaylistTracks();
  }, [playlist]);

  // Get current track
  const getCurrentTrack = useCallback((): Track | null => {
    if (trackData.length === 0) return null;
    return trackData[currentTrackIndex % trackData.length];
  }, [trackData, currentTrackIndex]);

  // Next track function
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
      // Play will be triggered by the effect
    }
  }, [trackData.length, isPlaying, usingSdkPlayback]);

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

  // Handle playback state changes
  useEffect(() => {
    const handlePlayback = async () => {
      const track = getCurrentTrack();
      if (!track) return;

      if (isPlaying) {
        setIsLoading(true);
        setPlaybackError(null);

        try {
          if (usingSdkPlayback) {
            // Use Spotify Web Playback SDK (for Premium users)
            console.log(`Playing track ${track.spotifyId} via Spotify SDK`);
            try {
              const success = await spotifyService.playTrackWithSpotify(track.spotifyId || '');

              if (success) {
                console.log('Playback started via SDK');
                setIsLoading(false);
                return;
              } else {
                console.warn('SDK playback failed, falling back to preview URL');
              }
            } catch (sdkError) {
              console.warn('SDK error occurred, falling back to preview URL', sdkError);
              // Don't change usingSdkPlayback here - we'll still try SDK for other tracks
            }
          }

          // Fall back to audio element for preview URLs
          if (!audioRef.current) {
            audioRef.current = new Audio();
            audioRef.current.onended = nextTrack;
          }

          // Get preview URL for playback
          const previewUrl = await spotifyService.playTrack(track.spotifyId);
          console.log(`Got preview URL: ${previewUrl}`);

          if (!previewUrl) {
            throw new Error('No audio available for this track');
          }

          // Set up error handler
          audioRef.current.onerror = (e) => {
            console.error('Audio error:', e);
            const errorDetails = audioRef.current?.error
              ? `${audioRef.current.error.code}: ${audioRef.current.error.message}`
              : 'Unknown error';
            setPlaybackError(`Audio error: ${errorDetails}`);
            setIsLoading(false);

            // Skip to next track after error
            setTimeout(() => nextTrack(), 1000);
          };

          // Set the audio source
          audioRef.current.src = previewUrl;
          audioRef.current.crossOrigin = 'anonymous';
          audioRef.current.load();

          // Play the audio
          try {
            await audioRef.current.play();
            setIsLoading(false);
          } catch (playError) {
            console.error('Error playing track:', playError);
            setPlaybackError(
              `Couldn't play track: ${playError instanceof Error ? playError.message : 'unknown error'}`,
            );
            setIsLoading(false);
            setTimeout(() => nextTrack(), 1000);
          }
        } catch (error) {
          console.error('Error playing track:', error);
          setPlaybackError(`${error instanceof Error ? error.message : 'Error playing track'}`);
          setIsLoading(false);
          setTimeout(() => nextTrack(), 1000);
        }
      } else {
        // Pause playback
        if (usingSdkPlayback) {
          await spotifyService.pausePlayback();
        } else if (audioRef.current) {
          audioRef.current.pause();
        }
      }
    };

    if (audioInitialized) {
      handlePlayback();
    }
  }, [isPlaying, audioInitialized, getCurrentTrack, nextTrack, usingSdkPlayback]);

  // Get the current track
  const currentTrack = getCurrentTrack();

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

  // Handle play/pause toggle
  const handlePlayPauseToggle = () => {
    onTogglePlay();
  };

  // Render the full player when we have track data
  return expanded ? (
    <div className={`spotify-overlay expanded-container`}>
      <button className="close-button" onClick={onExpand}>
        <CloseIcon />
      </button>

      <div className="expanded-player">
        <img
          src={currentTrack.albumArt || currentEvent.coverImageUrl || 'https://via.placeholder.com/200'}
          className="album-art"
          alt={`Album art for ${currentTrack.name}`}
        />

        <span className="playlist-name">{playlist?.name || 'Event Playlist'}</span>
        <span className="track-title">{currentTrack.name}</span>
        <span className="artist-name">{currentTrack.artist}</span>

        {playbackError && <span className="error-text">{playbackError}</span>}

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

        <span className="event-name">From: {currentEvent.name}</span>
      </div>
    </div>
  ) : (
    <div className="spotify-overlay mini-player">
      <div className="mini-image-container" onClick={onExpand}>
        <img
          src={currentTrack.albumArt || currentEvent.coverImageUrl || 'https://via.placeholder.com/50'}
          className="mini-image"
          alt="Album cover"
        />
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
  );
};

export default SpotifyRadioOverlay;
