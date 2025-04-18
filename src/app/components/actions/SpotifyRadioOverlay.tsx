import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Event, Playlist, Track } from '../../models/types';
import { usePlaylist } from '../../hooks/usePlaylist';
import spotifyService from '../../../services/spotify-web-api';
import { playTrack, pauseTrack, resumeTrack } from '../../../services/playlistService';
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

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { playlist, loading, error } = usePlaylist(currentEvent?.playlistId);

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

  // Get current track
  const getCurrentTrack = useCallback((): Track | null => {
    if (!playlist || !playlist.tracks) return null;
    const trackIds = Object.keys(playlist.tracks);
    if (trackIds.length === 0) return null;

    return playlist.tracks[trackIds[currentTrackIndex % trackIds.length]];
  }, [playlist, currentTrackIndex]);

  // Handle playback state changes
  useEffect(() => {
    const handlePlayback = async () => {
      const track = getCurrentTrack();
      if (!track || !audioRef.current) return;

      if (isPlaying) {
        setIsLoading(true);

        try {
          // For web implementation
          if (audioRef.current.src !== track.previewUrl) {
            audioRef.current.src = track.previewUrl || '';
          }

          await audioRef.current.play();
          setIsLoading(false);
        } catch (error) {
          setIsLoading(false);
          setPlaybackError('Unable to play track');
          onTogglePlay(); // Turn off play state
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
  }, [isPlaying, audioInitialized, getCurrentTrack]);

  // Next track function
  const nextTrack = useCallback(() => {
    if (!playlist?.tracks) return;
    const trackIds = Object.keys(playlist.tracks);
    setCurrentTrackIndex((prev) => (prev + 1) % trackIds.length);

    // If playing, restart with new track
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();

      const nextTrack = playlist.tracks[trackIds[(currentTrackIndex + 1) % trackIds.length]];
      if (nextTrack && nextTrack.previewUrl) {
        audioRef.current.src = nextTrack.previewUrl;
        audioRef.current.play().catch((err) => {
          console.error('Error playing next track:', err);
          setPlaybackError('Unable to play next track');
        });
      }
    }
  }, [playlist, currentTrackIndex, isPlaying]);

  // Previous track function
  const prevTrack = useCallback(() => {
    if (!playlist?.tracks) return;
    const trackIds = Object.keys(playlist.tracks);
    setCurrentTrackIndex((prev) => (prev - 1 + trackIds.length) % trackIds.length);

    // If playing, restart with new track
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();

      const prevTrack = playlist.tracks[trackIds[(currentTrackIndex - 1 + trackIds.length) % trackIds.length]];
      if (prevTrack && prevTrack.previewUrl) {
        audioRef.current.src = prevTrack.previewUrl;
        audioRef.current.play().catch((err) => {
          console.error('Error playing previous track:', err);
          setPlaybackError('Unable to play previous track');
        });
      }
    }
  }, [playlist, currentTrackIndex, isPlaying]);

  // Get the current track
  const currentTrack = getCurrentTrack();

  // If there's no playlist or no tracks, show a simplified version
  if (loading || !playlist || !currentTrack) {
    return (
      <div className="spotify-overlay mini-player">
        <img src={currentEvent?.coverImageUrl} className="mini-image" alt="Event cover" />
        <div className="mini-info">
          <span className="mini-title" title={currentEvent?.name || 'Loading event'}>
            {currentEvent?.name || 'Loading event'}
          </span>
          <span className="mini-artist" title="Loading music...">
            Loading music...
          </span>
        </div>
        <button className="mini-play-button" disabled={true}>
          <span className="play-button-icon">⏳</span>
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
          src={currentTrack.albumArt || currentEvent.coverImageUrl}
          className="album-art"
          alt={`Album art for ${currentTrack.name}`}
        />

        <span className="playlist-name">{playlist.name}</span>
        <span className="track-title">{currentTrack.name}</span>
        <span className="artist-name">{currentTrack.artist}</span>

        {playbackError && <span className="error-text">{playbackError}</span>}

        <div className="controls">
          <button className="control-button" onClick={prevTrack}>
            <span className="control-button-icon">⏮️</span>
          </button>

          <button className="play-button" onClick={handlePlayPauseToggle} disabled={isLoading}>
            <span className="play-button-icon">{isLoading ? '⏳' : isPlaying ? '⏸' : '▶️'}</span>
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
        <img src={currentTrack.albumArt || currentEvent.coverImageUrl} className="mini-image" alt="Album cover" />
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
