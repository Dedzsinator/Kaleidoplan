import React, { useEffect, useRef } from 'react';
import { useEvents } from '../../hooks/useEvents';
import socketService from '@services/socketService';

interface EventSubscriptionProviderProps {
  children: React.ReactNode;
}

/**
 * Component that handles event subscriptions for socket notifications
 * throughout the app, including the guest/home screens
 */
export const EventSubscriptionProvider: React.FC<EventSubscriptionProviderProps> = ({ children }) => {
  const { data: events = [] } = useEvents();
  const subscribedEventsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Subscribe to all events when they load
    events.forEach((event) => {
      const eventId = event.id || event._id;
      if (eventId && !subscribedEventsRef.current.has(eventId)) {
        socketService.subscribeToEvent(eventId);
        subscribedEventsRef.current.add(eventId);
      }
    });

    // Capture the current subscribed events for cleanup
    const currentSubscribedEvents = new Set(subscribedEventsRef.current);

    // Cleanup function
    return () => {
      currentSubscribedEvents.forEach((eventId) => {
        socketService.unsubscribeFromEvent(eventId);
      });
    };
  }, [events]);

  return <>{children}</>;
};
