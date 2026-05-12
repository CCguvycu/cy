import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, borderRadius, spacing, typography } from '../utils/theme';

interface CyberButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const variantStyles = {
  primary: {
    bg: colors.primary,
    text: '#000',
    border: colors.primary,
  },
  secondary: {
    bg: colors.secondary,
    text: '#000',
    border: colors.secondary,
  },
  outline: {
    bg: 'transparent',
    text: colors.primary,
    border: colors.primary,
  },
  danger: {
    bg: colors.error,
    text: '#fff',
    border: colors.error,
  },
  ghost: {
    bg: 'transparent',
    text: colors.textSecondary,
    border: 'transparent',
  },
};

const sizeStyles = {
  sm: { paddingVertical: 6, paddingHorizontal: 12, fontSize: typography.fontSizes.sm },
  md: { paddingVertical: 12, paddingHorizontal: 20, fontSize: typography.fontSizes.md },
  lg: { paddingVertical: 16, paddingHorizontal: 28, fontSize: typography.fontSizes.lg },
};

export const CyberButton: React.FC<CyberButtonProps> = ({
  onPress,
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
}) => {
  const v = variantStyles[variant];
  const s = sizeStyles[size];

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        styles.base,
        {
          backgroundColor: v.bg,
          borderColor: v.border,
          paddingVertical: s.paddingVertical,
          paddingHorizontal: s.paddingHorizontal,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} size="small" />
      ) : (
        <Text
          style={[
            styles.text,
            { color: v.text, fontSize: s.fontSize },
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
