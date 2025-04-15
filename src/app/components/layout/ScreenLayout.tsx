import React from 'react';
import '../../styles/ScreenLayout.css';

interface ScreenLayoutProps {
    children: React.ReactNode;
    scrollable?: boolean;
    className?: string;
}

export const ScreenLayout: React.FC<ScreenLayoutProps> = ({
    children,
    scrollable = true,
    className = ''
}: ScreenLayoutProps) => {
    return (
        <div className="screen-safe-area">
            {scrollable ? (
                <div className={`screen-scrollable-content ${className}`}>
                    {children}
                </div>
            ) : (
                <div className={`screen-content ${className}`}>
                    {children}
                </div>
            )}
        </div>
    );
};

export default ScreenLayout;