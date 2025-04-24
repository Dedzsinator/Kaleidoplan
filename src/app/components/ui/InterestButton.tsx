import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../../services/api';
import { useNavigate } from 'react-router-dom';
import '../../styles/InterestButton.css';

interface InterestButtonProps {
  eventId: string;
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
}

const InterestButton: React.FC<InterestButtonProps> = ({
  eventId,
  size = 'medium',
  showText = false
}) => {
  const { currentUser, isAuthenticated } = useAuth();
  const [interestLevel, setInterestLevel] = useState<'interested' | 'attending' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check current interest level if user is authenticated
    if (isAuthenticated && eventId) {
      checkInterestLevel();
    }
  }, [isAuthenticated, eventId]);

  const checkInterestLevel = async () => {
    try {
      const response = await api.get(`/events/${eventId}/interest`);
      if (response.status === 'found') {
        setInterestLevel(response.interestLevel);
      } else {
        setInterestLevel(null);
      }
    } catch (error) {
      console.error('Error checking interest level:', error);
    }
  };

  const toggleInterest = async (level: 'interested' | 'attending') => {
    if (!isAuthenticated) {
      // Redirect to login if not authenticated
      navigate('/login', { state: { from: window.location.pathname } });
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post(`/events/${eventId}/interest`, {
        interestLevel: level
      });

      if (response.status === 'removed') {
        setInterestLevel(null);
      } else {
        setInterestLevel(response.interestLevel);
      }
    } catch (error) {
      console.error('Error toggling interest:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`interest-button-container ${size}`}>
      <button
        className={`interest-button ${interestLevel === 'interested' ? 'active' : ''}`}
        onClick={() => toggleInterest('interested')}
        disabled={isLoading}
        aria-label="Mark as interested"
        title="Interested"
      >
        <i className="fa fa-heart"></i>
        {showText && <span>Interested</span>}
      </button>

      <button
        className={`attending-button ${interestLevel === 'attending' ? 'active' : ''}`}
        onClick={() => toggleInterest('attending')}
        disabled={isLoading}
        aria-label="Mark as attending"
        title="Attending"
      >
        <i className="fa fa-calendar-check"></i>
        {showText && <span>Attending</span>}
      </button>
    </div>
  );
};

export default InterestButton;
