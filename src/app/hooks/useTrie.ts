import { useState, useEffect, useCallback } from 'react';
import { trieService } from '../../services/trieService';
import { Event } from '../models/types';

export function useTrieSearch() {
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize the trie with events from storage or API
  useEffect(() => {
    const initializeTrie = async () => {
      if (isInitialized) return;

      try {
        setIsLoading(true);
        setError(null);

        // Try to load events from session storage first
        let events: Event[] = [];
        const cachedEvents = sessionStorage.getItem('all-events');

        if (cachedEvents) {
          events = JSON.parse(cachedEvents);
        } else {
          // If no cached events, fetch from API
          const response = await fetch('/api/events');
          if (!response.ok) throw new Error('Failed to fetch events');
          events = await response.json();

          // Cache the events
          sessionStorage.setItem('all-events', JSON.stringify(events));
        }

        // Populate the trie with event data
        events.forEach((event: Event) => {
          // Insert event name as primary search term
          trieService.insert(event.name, event);

          // Add location as searchable term if available
          if (event.location) {
            trieService.insert(event.location, event);
          }

          // Add description words as searchable terms
          if (event.description) {
            const words = event.description.split(/\s+/).filter((word: string) => word.length > 3);

            words.forEach((word: string) => {
              trieService.insert(word, event);
            });
          }
        });

        setIsInitialized(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error initializing search');
        console.error('Error initializing trie search:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeTrie();
  }, [isInitialized]);

  /**
   * Get search suggestions based on input query
   */
  const getSuggestions = useCallback((query: string) => {
    if (!query || query.length < 2) return [];
    return trieService.findWordsWithPrefix(query);
  }, []);

  return { getSuggestions, isLoading, error, isInitialized };
}
