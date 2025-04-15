import React from 'react';
import '../../styles/ActionCard.css';

interface ActionCardProps {
    title: string;
    description?: string;
    icon?: React.ReactNode;
    onPress?: () => void;
    style?: React.CSSProperties;
    className?: string;
    children?: React.ReactNode;
    actionText?: string;
    actionVariant?: 'primary' | 'secondary' | 'link';
    badgeText?: string;
    badgeColor?: string;
}

const ActionCard = ({
    title,
    description,
    icon,
    onPress,
    style,
    className = '',
    children,
    actionText,
    actionVariant = 'primary',
    badgeText,
    badgeColor,
}: ActionCardProps) => {
    return (
        <div
            className={`action-card ${onPress ? 'clickable' : ''} ${className}`}
            style={style}
            onClick={onPress}
        >
            <div className="action-card-content">
                {badgeText && (
                    <div className="action-card-badge" style={badgeColor ? { backgroundColor: badgeColor } : {}}>
                        {badgeText}
                    </div>
                )}

                {icon && <div className="action-card-icon">{icon}</div>}

                <div className="action-card-text">
                    <h3 className="action-card-title">{title}</h3>
                    {description && <p className="action-card-description">{description}</p>}
                </div>

                {children}
            </div>

            {actionText && (
                <div className="action-card-footer">
                    <button className={`action-card-button ${actionVariant}`}>
                        {actionText}
                    </button>
                </div>
            )}
        </div>
    );
};

export default ActionCard;