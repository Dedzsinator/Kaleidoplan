import React, { useEffect, useState } from 'react';
import '../../styles/SplashScreen.css';

interface SplashScreenProps {
  status?: string;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ status }) => {
  const [loadingText, setLoadingText] = useState('Preparing your experience...');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Update loading message based on status
    if (status) {
      setLoadingText(status);
    }

    // Start animations
    setIsVisible(true);
  }, [status]);

  return (
    <div className="splash-container">
      <div className="splash-gradient-background"></div>

      <div className="splash-waves">
        {/* Static waves as fallback - we'll create the AnimatedWaves component separately */}
        <div className="splash-wave splash-wave-1"></div>
        <div className="splash-wave splash-wave-2"></div>
        <div className="splash-wave splash-wave-3"></div>
      </div>

      <div className={`splash-content ${isVisible ? 'visible' : ''}`}>
        <div className={`splash-logo-container ${isVisible ? 'visible' : ''}`}>
          <img src="../../assets/images/favicon.jpg" alt="Kaleidoplan Logo" className="splash-logo" />
          <h1 className="splash-app-name">Kaleidoplan</h1>
        </div>

        <div className="splash-loading-container">
          <div className="splash-spinner"></div>
          <p className="splash-loading-text">{loadingText}</p>
        </div>
      </div>
    </div>
  );
};
