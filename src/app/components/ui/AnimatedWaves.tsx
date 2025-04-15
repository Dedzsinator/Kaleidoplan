import React from 'react';
import '../../styles/AnimatedWaves.css';

interface AnimatedWavesProps {
    height?: number;
    colors?: string[];
}

const AnimatedWaves: React.FC<AnimatedWavesProps> = ({
    height = 200,
    colors = ['rgba(106, 17, 203, 0.4)', 'rgba(37, 117, 252, 0.35)', 'rgba(60, 16, 83, 0.3)']
}) => {
    return (
        <div className="animated-waves" style={{ height: `${height}px` }}>
            {colors.map((color, index) => (
                <div
                    key={`wave-${index}`}
                    className={`animated-wave wave-${index + 1}`}
                    style={{
                        background: color,
                        animationDuration: `${15 + index * 2}s`,
                        animationDelay: `${-index * 3}s`
                    }}
                />
            ))}
        </div>
    );
};

export default AnimatedWaves;