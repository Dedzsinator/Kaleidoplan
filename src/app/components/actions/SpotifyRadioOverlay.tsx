import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Event, Playlist, Track, SpotifyTrack } from '../../models/types';
import { usePlaylist } from '../../hooks/usePlaylist';
import spotifyService from '../../../services/spotify-web-api';
import '../../styles/SpotifyRadioOverlay.css';

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

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch playlist data using the hook
  const { playlist, loading: playlistLoading, error } = usePlaylist(currentEvent?.playlistId);

  // Initialize Audio
  useEffect(() => {
    const initAudio = async () => {
      try {
        // For web, we'll create an audio element
        if (!audioRef.current) {
          audioRef.current = new Audio();
          audioRef.current.onended = () => {
            nextTrack();
          };
        }
        setAudioInitialized(true);
      } catch (error) {
        console.error('Error initializing audio:', error);
        setPlaybackError('Could not initialize audio system');
      }
    };

    initAudio();

    // Cleanup audio on unmount
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

  // Handle playback state changes
  useEffect(() => {
    const handlePlayback = async () => {
      const track = getCurrentTrack();
      if (!track || !audioRef.current) return;

      if (isPlaying) {
        setIsLoading(true);
        setPlaybackError(null);

        try {
          // Use track.spotifyId instead of track.id
          const previewUrl = await spotifyService.playTrack(track.spotifyId);
          console.log(`Got preview URL: ${previewUrl}`);

          if (!previewUrl) {
            throw new Error('No preview available for this track');
          }

          // Set up error handler first
          audioRef.current.onerror = (e) => {
            console.error('Audio error:', e);
            setPlaybackError(`Audio error: ${audioRef.current?.error?.message || 'Unknown error'}`);
            setIsLoading(false);
            onTogglePlay(); // Turn off the play state
            // Try next track
            setTimeout(() => nextTrack(), 1000);
          };

          // Set the audio source to the preview URL
          audioRef.current.src = previewUrl;
          audioRef.current.load(); // Force reload

          // Play the audio
          const playPromise = audioRef.current.play();

          // Handle the play promise
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                setIsLoading(false);
              })
              .catch((error) => {
                console.error('Error playing track:', error);
                setPlaybackError(`Couldn't play track: ${error.message}`);
                setIsLoading(false);
                onTogglePlay(); // Turn off the play state

                // Try the next track automatically
                setTimeout(() => nextTrack(), 1000);
              });
          }
        } catch (error) {
          console.error('Error playing track:', error);
          setPlaybackError(`${error instanceof Error ? error.message : 'Error playing track'}`);
          setIsLoading(false);
          onTogglePlay(); // Turn off the play state

          // Try the next track automatically
          setTimeout(() => nextTrack(), 1000);
        }
      } else {
        if (audioRef.current) {
          audioRef.current.pause();
        }
      }
    };

    if (audioInitialized) {
      handlePlayback();
    }
  }, [isPlaying, audioInitialized, getCurrentTrack, onTogglePlay]);

  // Next track function
  const nextTrack = useCallback(() => {
    if (trackData.length === 0) return;

    setCurrentTrackIndex((prev) => (prev + 1) % trackData.length);

    // If playing, restart with new track
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();

      // Play will be triggered by the effect
    }
  }, [trackData, isPlaying]);

  // Previous track function
  const prevTrack = useCallback(() => {
    if (trackData.length === 0) return;

    setCurrentTrackIndex((prev) => (prev - 1 + trackData.length) % trackData.length);

    // If playing, restart with new track
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();

      // Play will be triggered by the effect
    }
  }, [trackData, isPlaying]);

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
          <span className="play-button-icon">⏳</span>
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
          <span className="play-button-icon">❌</span>
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
        <span className="close-button-text">×</span>
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

        <div className="controls">
          <button className="control-button" onClick={prevTrack}>
            <span className="control-button-icon">⏮️</span>
          </button>

          <button className="play-button" onClick={handlePlayPauseToggle} disabled={isLoading}>
            <span className="play-button-icon">{isLoading ? '⌛' : isPlaying ? '⏸' : '▶'}</span>
          </button>

          <button className="control-button" onClick={nextTrack}>
            <span className="control-button-icon">⏭️</span>
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

      <button className="mini-play-button" onClick={handlePlayPauseToggle} disabled={isLoading}>
        <span className="play-button-icon">{isLoading ? '⏳' : isPlaying ? '⏸' : '▶️'}</span>
      </button>
    </div>
  );
};

export default SpotifyRadioOverlay;
