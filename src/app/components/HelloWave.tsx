import React, { useEffect, useState } from 'react';
import '../styles/HelloWave.css'; // Create this CSS file

interface ThemedTextProps {
  type?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

// Simple ThemedText replacement for web
const ThemedText = ({ type, style, children }: ThemedTextProps) => {
  return (
    <span style={style} className={`themed-text ${type || ''}`}>
      {children}
    </span>
  );
};

export function HelloWave() {
  const [isWaving, setIsWaving] = useState(false);

  useEffect(() => {
    // Start the animation when component mounts
    setIsWaving(true);

    // Reset animation after 4 waves (1200ms)
    const timer = setTimeout(() => {
      setIsWaving(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`wave-container ${isWaving ? 'waving' : ''}`}>
      <ThemedText style={styles.text}>👋</ThemedText>
    </div>
  );
}

const styles = {
  text: {
    fontSize: 28,
    lineHeight: '32px',
    marginTop: -6,
  },
};
