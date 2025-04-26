export interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string): RGB | null {
  // Remove # if present
  hex = hex.replace('#', '');

  // Handle shorthand hex
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    console.warn(`Invalid hex color: ${hex}`);
    return null;
  }

  return { r, g, b };
}

/**
 * Interpolate between two RGB colors
 * @param color1 Starting RGB color
 * @param color2 Ending RGB color
 * @param progress Value between 0 and 1 representing interpolation progress
 */
export function interpolateColors(color1: RGB, color2: RGB, progress: number): RGB {
  // Ensure progress is between 0 and 1
  const p = Math.max(0, Math.min(1, progress));

  // Linear interpolation
  return {
    r: Math.round(color1.r + (color2.r - color1.r) * p),
    g: Math.round(color1.g + (color2.g - color1.g) * p),
    b: Math.round(color1.b + (color2.b - color1.b) * p),
  };
}

/**
 * Calculate a contrasting text color (black or white) based on background
 * @param backgroundColor RGB background color
 */
export function getContrastingTextColor(backgroundColor: RGB): string {
  // Calculate perceived brightness using the formula:
  // (0.299*R + 0.587*G + 0.114*B)
  const brightness = (0.299 * backgroundColor.r + 0.587 * backgroundColor.g + 0.114 * backgroundColor.b) / 255;

  // Use white text on dark backgrounds, black text on light backgrounds
  return brightness > 0.5 ? '#000000' : '#ffffff';
}
