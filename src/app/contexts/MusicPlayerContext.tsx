import React, { createContext, useState, useContext } from 'react';

interface MusicPlayerContextType {
  isPlaying: boolean;
  currentTrack: any | null;
  togglePlayback: () => void;
  playTrack: (track: any) => void;
}

const defaultContext: MusicPlayerContextType = {
  isPlaying: false,
  currentTrack: null,
  togglePlayback: () => {},
  playTrack: () => {},
};

const MusicPlayerContext = createContext<MusicPlayerContextType>(defaultContext);

export const MusicPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<any | null>(null);

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
    console.log('Toggle playback:', !isPlaying);
  };

  const playTrack = (track: any) => {
    setCurrentTrack(track);
    setIsPlaying(true);
    console.log('Playing track:', track);
  };

  return (
    <MusicPlayerContext.Provider
      value={{
        isPlaying,
        currentTrack,
        togglePlayback,
        playTrack,
      }}
    >
      {children}
    </MusicPlayerContext.Provider>
  );
};

export const useMusicPlayer = () => useContext(MusicPlayerContext);
