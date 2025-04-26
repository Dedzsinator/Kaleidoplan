import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../../services/api';
import { useNavigate } from 'react-router-dom';
import '../../styles/InterestButton.css';

interface InterestResponse {
  status: 'found' | 'removed' | 'updated';
  interestLevel?: 'interested' | 'attending' | null;
}

interface InterestButtonProps {
  eventId: string;
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
}

const InterestButton: React.FC<InterestButtonProps> = ({ eventId, size = 'medium', showText = false }) => {
  const { currentUser, isAuthenticated } = useAuth();
  const [interestLevel, setInterestLevel] = useState<'interested' | 'attending' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkInterestLevel = async () => {
      try {
        const response = await api.get(`/events/${eventId}/interest`);

        if (response && response.status === 'found') {
          setInterestLevel(response.interestLevel || null);
        } else {
          setInterestLevel(null);
        }
      } catch (error) {
        console.error('Error checking interest level:', error);
      }
    };

    if (isAuthenticated && eventId) {
      checkInterestLevel();
    }
  }, [isAuthenticated, eventId]);

  const toggleInterest = async (level: 'interested' | 'attending') => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: window.location.pathname } });
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post<InterestResponse>(`/events/${eventId}/interest`, {
        interestLevel: level,
      });

      if (response && typeof response === 'object') {
        if ('status' in response) {
          if (response.status === 'removed') {
            setInterestLevel(null);
          } else {
            setInterestLevel('interestLevel' in response ? response.interestLevel || null : null);
          }
        }
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
