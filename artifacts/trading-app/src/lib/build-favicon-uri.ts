/**
 * Client-side version: builds a favicon URI from the app name.
 * In Vite, the favicon is set via index.html.
 * This function provides the same letter-badge SVG as a data URI
 * for programmatic use (e.g. dynamic favicon updates).
 */
export function buildFaviconUri(): string | null {
  const appName = import.meta.env.VITE_DERIV_APP_NAME ?? 'Deriv App';
  const letter = appName.trim().charAt(0).toUpperCase() || 'A';

  // Use the primary brand color (orange from the theme)
  const bgColor = '#D38301'; // rgb(211, 131, 1) — matches --primary in globals.css

  const svgString = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">',
    `<rect width="32" height="32" rx="6" fill="${bgColor}"/>`,
    '<text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle"',
    ` fill="white" font-size="20" font-family="sans-serif" font-weight="bold">${letter}</text>`,
    '</svg>',
  ].join('');

  const base64Svg = btoa(svgString);
  return `data:image/svg+xml;base64,${base64Svg}`;
}
