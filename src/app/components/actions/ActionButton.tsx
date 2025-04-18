import React from 'react';
import '../../styles/ActionButton.css';

interface ActionButtonProps {
  icon?: React.ReactNode;
  label?: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

const ActionButton = ({
  icon,
  label,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  fullWidth = false,
  className = '',
  type = 'button',
}: ActionButtonProps) => {
  return (
    <button
      type={type}
      className={`action-button ${variant} ${size} ${fullWidth ? 'full-width' : ''} ${className}`}
      onClick={onPress}
      disabled={disabled}
    >
      {icon && <span className="action-button-icon">{icon}</span>}
      {label && <span className="action-button-label">{label}</span>}
    </button>
  );
};

export default ActionButton;
