import { useEffect, useState } from 'react';

/**
 * A hook to detect the user's color scheme preference in the browser
 * @returns 'dark' | 'light' based on system preference
 */
export function useColorScheme(): 'light' | 'dark' {
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>(() => {
    // Check if window exists (for SSR compatibility)
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches 
        ? 'dark' 
        : 'light';
    }
    return 'light'; // Default for server-side
  });

  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') return;
    
    // Create media query list
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Event handler function
    const handleChange = (event: MediaQueryListEvent) => {
      setColorScheme(event.matches ? 'dark' : 'light');
    };

    // Add listener using the appropriate method (modern or legacy)
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // For older browsers (Safari < 14)
      mediaQuery.addListener(handleChange);
    }

    // Cleanup function
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        // For older browsers
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  return colorScheme;
}