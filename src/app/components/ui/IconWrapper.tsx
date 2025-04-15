import React from 'react';

interface IconWrapperProps {
    children: React.ReactNode;
    className?: string;
}


export const IconWrapper = ({ children, className = '' }: IconWrapperProps) => {
    return (
        <div className={`flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 p-2 ${className}`}>
            {children}
        </div>
    );
};