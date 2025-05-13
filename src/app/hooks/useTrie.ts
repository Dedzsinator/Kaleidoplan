import { useState, useEffect, useCallback } from 'react';
import { trieService } from '@services/trieService';
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

        // Inside useTrieSearch function where events are processed:
        events.forEach((event: Event) => {
          // Only insert if event has required properties
          if (event.id && event.name) {
            // Create a properly typed object with required fields
            const insertableEvent = {
              id: event.id, // Ensures id is not undefined
              location: event.location || '', // Provide default for location
              ...event, // Include all other properties
            };

            // Insert event name as primary search term
            trieService.insert(event.name, insertableEvent);

            // Add location as searchable term if available
            if (event.location) {
              trieService.insert(event.location, insertableEvent);
            }

            // Add description words as searchable terms
            if (event.description) {
              const words = event.description.split(/\s+/).filter((word: string) => word.length > 3);

              words.forEach((word: string) => {
                trieService.insert(word, insertableEvent);
              });
            }
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
