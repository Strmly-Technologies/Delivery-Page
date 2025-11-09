import { useCallback, useRef } from 'react';

export function useSound(soundUrl: string, volume: number = 0.5) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = useCallback(() => {
    try {
      // Create new audio instance if it doesn't exist
      if (!audioRef.current) {
        audioRef.current = new Audio(soundUrl);
        audioRef.current.volume = volume;
      }

      // Reset and play
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((error) => {
        console.error('Error playing sound:', error);
      });
    } catch (error) {
      console.error('Sound playback error:', error);
    }
  }, [soundUrl, volume]);

  return { play };
}