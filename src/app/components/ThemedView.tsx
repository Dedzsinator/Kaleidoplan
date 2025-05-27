import React from 'react';

import { useThemeColor } from '../hooks/useThemeColor'; // Assuming this exists for Web

export type ThemedViewProps = React.HTMLAttributes<HTMLDivElement> & {
  lightColor?: string;
  darkColor?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
};

export function ThemedView({ style, lightColor, darkColor, children, ...rest }: ThemedViewProps) {
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');

  const combinedStyle: React.CSSProperties = {
    backgroundColor,
    ...style,
  };

  return (
    <div style={combinedStyle} {...rest}>
      {children}
    </div>
  );
}
