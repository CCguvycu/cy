import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Clipboard,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Message } from '../store/useChatStore';
import { colors, spacing, borderRadius, typography } from '../utils/theme';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;
  const isUser = message.role === 'user';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleCopy = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Clipboard.setString(message.content);
  };

  return (
    <Animated.View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.aiContainer,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {!isUser && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>V</Text>
        </View>
      )}

      <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
        {isUser ? (
          <Text style={styles.userText}>{message.content}</Text>
        ) : (
          <Markdown style={markdownStyles}>
            {message.content + (message.isStreaming ? '▋' : '')}
          </Markdown>
        )}

        {message.model && !isUser && (
          <Text style={styles.modelLabel}>{message.model}</Text>
        )}

        <View style={styles.actions}>
          <TouchableOpacity onPress={handleCopy} style={styles.actionBtn}>
            <Ionicons name="copy-outline" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {isUser && (
        <View style={[styles.avatar, styles.userAvatar]}>
          <Ionicons name="person" size={14} color={colors.secondary} />
        </View>
      )}
    </Animated.View>
  );
};

const markdownStyles = {
  body: { color: colors.textPrimary, fontSize: typography.fontSizes.md, lineHeight: 22 },
  heading1: { color: colors.primary, fontWeight: '700' as const },
  heading2: { color: colors.primary, fontWeight: '600' as const },
  heading3: { color: colors.primaryDim },
  code_inline: {
    backgroundColor: '#0a0a1a',
    color: colors.primary,
    fontFamily: 'monospace',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  fence: {
    backgroundColor: '#0a0a1a',
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  code_block: {
    backgroundColor: '#0a0a1a',
    color: colors.primary,
    fontFamily: 'monospace',
  },
  link: { color: colors.secondary },
  blockquote: { borderLeftColor: colors.primary, borderLeftWidth: 3 },
  bullet_list_icon: { color: colors.primary },
  strong: { color: colors.textPrimary, fontWeight: '700' as const },
  em: { color: colors.textSecondary },
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  aiContainer: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  userAvatar: {
    borderColor: colors.secondary,
  },
  avatarText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
  },
  userBubble: {
    backgroundColor: colors.userBubble,
    borderColor: colors.userBubbleBorder,
    borderBottomRightRadius: borderRadius.sm,
  },
  aiBubble: {
    backgroundColor: colors.aiBubble,
    borderColor: colors.aiBubbleBorder,
    borderBottomLeftRadius: borderRadius.sm,
  },
  userText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    lineHeight: 22,
  },
  modelLabel: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
    marginTop: spacing.xs,
    fontFamily: 'monospace',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.xs,
  },
  actionBtn: {
    padding: 4,
  },
});
