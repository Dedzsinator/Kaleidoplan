import React from 'react';

import { useThemeColor } from '../hooks/useThemeColor'; // Assuming this exists for Web

export type ThemedTextProps = React.HTMLAttributes<HTMLSpanElement> & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
  style?: React.CSSProperties;
  children?: React.ReactNode;
};

export function ThemedText({ style, lightColor, darkColor, type = 'default', children, ...rest }: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  const baseStyle: React.CSSProperties = {
    color,
    ...(type === 'default' && styles.default),
    ...(type === 'title' && styles.title),
    ...(type === 'defaultSemiBold' && styles.defaultSemiBold),
    ...(type === 'subtitle' && styles.subtitle),
    ...(type === 'link' && styles.link),
    ...style,
  };

  return (
    <span style={baseStyle} {...rest}>
      {children}
    </span>
  );
}

const styles = {
  default: {
    fontSize: '16px',
    lineHeight: '24px',
  },
  defaultSemiBold: {
    fontSize: '16px',
    lineHeight: '24px',
    fontWeight: 600,
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    lineHeight: '32px',
  },
  subtitle: {
    fontSize: '20px',
    fontWeight: 'bold',
  },
  link: {
    lineHeight: '30px',
    fontSize: '16px',
    textDecoration: 'underline',
    cursor: 'pointer',
  },
};
