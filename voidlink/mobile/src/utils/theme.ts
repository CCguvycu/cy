export const colors = {
  // Primary palette - cyberpunk
  background: '#000000',
  surface: '#0a0a0f',
  surfaceLight: '#0f0f1a',
  card: '#0d0d1a',
  cardBorder: '#1a1a2e',

  // Accent
  primary: '#00ff88',
  primaryDim: '#00cc66',
  secondary: '#0088ff',
  secondaryDim: '#0066cc',
  accent: '#ff0088',
  accentDim: '#cc0066',
  warning: '#ffaa00',
  error: '#ff4444',

  // Text
  textPrimary: '#ffffff',
  textSecondary: '#8888aa',
  textMuted: '#444466',
  textAccent: '#00ff88',

  // Gradients
  gradientStart: '#000000',
  gradientEnd: '#0a0a1a',

  // Message bubbles
  userBubble: '#001a33',
  userBubbleBorder: '#0088ff',
  aiBubble: '#0a0a0f',
  aiBubbleBorder: '#00ff88',

  // UI elements
  inputBg: '#0d0d1a',
  inputBorder: '#1a1a2e',
  inputFocusBorder: '#00ff88',
  divider: '#1a1a2e',
  overlay: 'rgba(0,0,0,0.8)',

  // Status
  online: '#00ff88',
  offline: '#ff4444',
  idle: '#ffaa00',
};

export const typography = {
  fontSizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  fontWeights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const borderRadius = {
  sm: 6,
  md: 12,
  lg: 18,
  xl: 24,
  full: 999,
};
