import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { colors, typography } from '../utils/theme';

interface GlowTextProps extends TextProps {
  color?: string;
  size?: keyof typeof typography.fontSizes;
  weight?: keyof typeof typography.fontWeights;
}

export const GlowText: React.FC<GlowTextProps> = ({
  color = colors.primary,
  size = 'md',
  weight = 'regular',
  style,
  children,
  ...props
}) => (
  <Text
    style={[
      {
        color,
        fontSize: typography.fontSizes[size],
        fontWeight: typography.fontWeights[weight],
        textShadowColor: color,
        textShadowRadius: 8,
        textShadowOffset: { width: 0, height: 0 },
      },
      style,
    ]}
    {...props}
  >
    {children}
  </Text>
);
