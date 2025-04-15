import React from 'react';
import '../../styles/IconSymbol.css';

// Define icon name type
export type IconSymbolName =
  | 'house.fill'
  | 'paperplane.fill'
  | 'chevron.left.forwardslash.chevron.right'
  | 'chevron.right';

// Map SF Symbol names to Font Awesome icons
const MAPPING: Record<IconSymbolName, string> = {
  'house.fill': 'fa-solid fa-home',
  'paperplane.fill': 'fa-solid fa-paper-plane',
  'chevron.left.forwardslash.chevron.right': 'fa-solid fa-code',
  'chevron.right': 'fa-solid fa-chevron-right',
};

/**
 * An icon component that uses FontAwesome icons on web
 * to replace SFSymbols from React Native
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string;
  style?: React.CSSProperties;
}) {
  return (
    <i
      className={`icon-symbol ${MAPPING[name]}`}
      style={{
        fontSize: `${size}px`,
        color: color,
        ...style,
      }}
    />
  );
}