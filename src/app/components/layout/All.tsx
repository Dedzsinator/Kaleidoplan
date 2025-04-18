import React from 'react';
import '../../styles/components.css';

// Base props interface
interface BaseComponentProps {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  [key: string]: any;
}

// Container components
export const Container: React.FC<BaseComponentProps> = ({ className, style, children, ...props }) => (
  <div className={`container ${className || ''}`} style={style} {...props}>
    {children}
  </div>
);

interface GradientProps extends BaseComponentProps {
  colors?: [string, string] | string[];
}

export const GradientContainer: React.FC<GradientProps> = ({
  colors = ['#4a6cf7', '#0e3ebc'],
  className,
  style,
  children,
  ...props
}) => {
  // Convert colors array to CSS gradient
  const gradientStyle = {
    ...style,
    background: Array.isArray(colors) ? `linear-gradient(135deg, ${colors.join(', ')})` : colors,
  };

  return (
    <div className={`gradient-container ${className || ''}`} style={gradientStyle} {...props}>
      {children}
    </div>
  );
};

// Card components
export const Card: React.FC<BaseComponentProps> = ({ className, style, children, ...props }) => (
  <div className={`card ${className || ''}`} style={style} {...props}>
    {children}
  </div>
);

export const EventCard: React.FC<BaseComponentProps> = ({ className, style, children, onClick, ...props }) => (
  <div
    className={`event-card ${className || ''}`}
    style={style}
    onClick={onClick}
    role="button"
    tabIndex={0}
    {...props}
  >
    {children}
  </div>
);

// Header components
export const Header: React.FC<GradientProps> = ({
  colors = ['#4a6cf7', '#0e3ebc'],
  className,
  style,
  children,
  ...props
}) => {
  const gradientStyle = {
    ...style,
    background: Array.isArray(colors) ? `linear-gradient(135deg, ${colors.join(', ')})` : colors,
  };

  return (
    <header className={`header ${className || ''}`} style={gradientStyle} {...props}>
      {children}
    </header>
  );
};

// Text component props
interface TextComponentProps {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  [key: string]: any;
}

export const HeaderTitle: React.FC<TextComponentProps> = ({ className, style, children, ...props }) => (
  <h1 className={`header-title ${className || ''}`} style={style} {...props}>
    {children}
  </h1>
);

export const HeaderSubtitle: React.FC<TextComponentProps> = ({ className, style, children, ...props }) => (
  <h2 className={`header-subtitle ${className || ''}`} style={style} {...props}>
    {children}
  </h2>
);

// Typography components
export const Title: React.FC<TextComponentProps> = ({ className, style, children, ...props }) => (
  <h2 className={`title ${className || ''}`} style={style} {...props}>
    {children}
  </h2>
);

export const Subtitle: React.FC<TextComponentProps> = ({ className, style, children, ...props }) => (
  <h3 className={`subtitle ${className || ''}`} style={style} {...props}>
    {children}
  </h3>
);

export const BodyText: React.FC<TextComponentProps> = ({ className, style, children, ...props }) => (
  <p className={`body-text ${className || ''}`} style={style} {...props}>
    {children}
  </p>
);

export const CaptionText: React.FC<TextComponentProps> = ({ className, style, children, ...props }) => (
  <span className={`caption-text ${className || ''}`} style={style} {...props}>
    {children}
  </span>
);

export const LinkText: React.FC<TextComponentProps> = ({ className, style, children, ...props }) => (
  <a className={`link-text ${className || ''}`} style={style} {...props}>
    {children}
  </a>
);

// Form components
export const Label: React.FC<TextComponentProps> = ({ className, style, children, ...props }) => (
  <label className={`form-label ${className || ''}`} style={style} {...props}>
    {children}
  </label>
);

interface InputProps extends BaseComponentProps {
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export const Input: React.FC<InputProps> = ({ className, style, ...props }) => (
  <input className={`form-input ${className || ''}`} style={style} {...props} />
);

export const TextArea: React.FC<InputProps> = ({ className, style, ...props }) => (
  <textarea className={`form-textarea ${className || ''}`} style={style} {...props} />
);

// Button components
export const PrimaryButton: React.FC<BaseComponentProps> = ({ className, style, children, ...props }) => (
  <button className={`btn btn-primary ${className || ''}`} style={style} {...props}>
    {children}
  </button>
);

export const PrimaryButtonText: React.FC<TextComponentProps> = ({ className, style, children, ...props }) => (
  <span className={`btn-text ${className || ''}`} style={style} {...props}>
    {children}
  </span>
);

export const SecondaryButton: React.FC<BaseComponentProps> = ({ className, style, children, ...props }) => (
  <button className={`btn btn-secondary ${className || ''}`} style={style} {...props}>
    {children}
  </button>
);

export const SecondaryButtonText: React.FC<TextComponentProps> = ({ className, style, children, ...props }) => (
  <span className={`btn-text ${className || ''}`} style={style} {...props}>
    {children}
  </span>
);

// Helper function for gradient backgrounds
export const createGradient = (defaultColors: [string, string]) => {
  return ({ colors = defaultColors, className, style, children, ...props }: GradientProps) => {
    const gradientStyle = {
      ...style,
      background: Array.isArray(colors) ? `linear-gradient(135deg, ${colors.join(', ')})` : colors,
    };

    return (
      <div className={`gradient ${className || ''}`} style={gradientStyle} {...props}>
        {children}
      </div>
    );
  };
};

// Export helper components with web-compatible gradients
export const PrimaryGradient = createGradient(['#4a6cf7', '#0e3ebc']);
export const HeaderGradient = createGradient(['#4a6cf7', '#0e3ebc']);
export const PlaceholderGradient = createGradient(['#e2e8f0', '#cbd5e1']);
