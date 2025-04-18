import React, { useState, useEffect } from 'react';
import '../../styles/Hero.css';

interface HeroProps {
  title: string;
  subtitle?: string;
  ctaText?: string;
  onCtaClick?: () => void;
  backgroundImage?: string;
  overlayOpacity?: number;
  height?: number | string;
  children?: React.ReactNode;
}

const Hero = ({
  title,
  subtitle,
  ctaText,
  onCtaClick,
  backgroundImage = '/images/hero-bg.jpg',
  overlayOpacity = 0.5,
  height = '80vh',
  children,
}: HeroProps) => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Calculate parallax effect
  const translateY = scrollY * 0.4;

  return (
    <div
      className="hero-section"
      style={{
        height,
        backgroundImage: `url(${backgroundImage})`,
      }}
    >
      <div
        className="hero-background"
        style={{
          transform: `translateY(${translateY}px)`,
        }}
      />

      <div className="hero-overlay" style={{ opacity: overlayOpacity }} />

      <div className="hero-content">
        <h1 className="hero-title">{title}</h1>
        {subtitle && <p className="hero-subtitle">{subtitle}</p>}

        {ctaText && (
          <button className="hero-cta-button" onClick={onCtaClick}>
            {ctaText}
          </button>
        )}

        {children}
      </div>
    </div>
  );
};

export default Hero;
