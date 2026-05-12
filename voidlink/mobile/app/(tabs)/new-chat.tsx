import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { modelsApi, chatApi } from '../../src/services/api';
import { useChatStore } from '../../src/store/useChatStore';
import { CyberButton } from '../../src/components/CyberButton';
import { colors, spacing, borderRadius, typography } from '../../src/utils/theme';

const QUICK_PROMPTS = [
  { icon: '💻', label: 'Code Review', prompt: 'Review my code and suggest improvements:' },
  { icon: '📝', label: 'Summarize', prompt: 'Summarize the following text:' },
  { icon: '🔍', label: 'Explain', prompt: 'Explain this concept in simple terms:' },
  { icon: '🛠', label: 'Debug', prompt: 'Help me debug this issue:' },
  { icon: '✍️', label: 'Write', prompt: 'Write a professional email about:' },
  { icon: '🧠', label: 'Brainstorm', prompt: 'Brainstorm ideas for:' },
];

const CHARACTER_MODES = [
  { id: 'default', label: 'Default', icon: '🤖', desc: 'Helpful AI assistant' },
  { id: 'hacker', label: 'Hacker', icon: '🕶', desc: 'Elite cyberpunk coder' },
  { id: 'coder', label: 'Coder', icon: '💻', desc: 'Expert programmer' },
  { id: 'researcher', label: 'Researcher', icon: '🔬', desc: 'Analytical and thorough' },
  { id: 'creative', label: 'Creative', icon: '🎨', desc: 'Outside-the-box thinking' },
  { id: 'assistant', label: 'Assistant', icon: '📋', desc: 'Professional and formal' },
];

export default function NewChatScreen() {
  const router = useRouter();
  const { selectedModel, setSelectedModel, folders } = useChatStore();
  const [models, setModels] = useState<any[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState('default');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null);
  const [initialMessage, setInitialMessage] = useState('');

  useEffect(() => {
    modelsApi.list().then((res) => setModels(res.data.models || [])).catch(() => {});
  }, []);

  const startChat = async () => {
    const res = await chatApi.createConversation(
      selectedModel,
      'New Chat',
      selectedFolder ?? undefined
    );
    router.push({
      pathname: `/chat/${res.data.id}`,
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>MODEL</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modelScroll}>
        {models.map((m) => (
          <TouchableOpacity
            key={m.name}
            style={[styles.modelChip, selectedModel === m.name && styles.modelChipActive]}
            onPress={() => setSelectedModel(m.name)}
          >
            <Text style={[styles.modelChipText, selectedModel === m.name && styles.modelChipTextActive]}>
              {m.display || m.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.sectionTitle}>CHARACTER MODE</Text>
      <View style={styles.characterGrid}>
        {CHARACTER_MODES.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={[styles.characterCard, selectedCharacter === c.id && styles.characterCardActive]}
            onPress={() => setSelectedCharacter(c.id)}
          >
            <Text style={styles.characterIcon}>{c.icon}</Text>
            <Text style={[styles.characterLabel, selectedCharacter === c.id && styles.characterLabelActive]}>
              {c.label}
            </Text>
            <Text style={styles.characterDesc}>{c.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>QUICK START</Text>
      <View style={styles.quickGrid}>
        {QUICK_PROMPTS.map((q) => (
          <TouchableOpacity
            key={q.label}
            style={styles.quickCard}
            onPress={() => setInitialMessage(q.prompt + ' ')}
          >
            <Text style={styles.quickIcon}>{q.icon}</Text>
            <Text style={styles.quickLabel}>{q.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {folders.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>FOLDER</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.folderChip, selectedFolder == null && styles.folderChipActive]}
              onPress={() => setSelectedFolder(null)}
            >
              <Text style={styles.folderChipText}>None</Text>
            </TouchableOpacity>
            {folders.map((f) => (
              <TouchableOpacity
                key={f.id}
                style={[styles.folderChip, selectedFolder === f.id && { borderColor: f.color }]}
                onPress={() => setSelectedFolder(f.id === selectedFolder ? null : f.id)}
              >
                <Text style={[styles.folderChipText, selectedFolder === f.id && { color: f.color }]}>
                  {f.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      <Text style={styles.sectionTitle}>CUSTOM SYSTEM PROMPT (OPTIONAL)</Text>
      <TextInput
        style={styles.promptInput}
        value={systemPrompt}
        onChangeText={setSystemPrompt}
        placeholder="You are a helpful assistant..."
        placeholderTextColor={colors.textMuted}
        multiline
        numberOfLines={3}
      />

      <CyberButton title="START CHAT" onPress={startChat} style={styles.startBtn} size="lg" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 80, gap: spacing.md },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
    letterSpacing: 2,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  modelScroll: { marginHorizontal: -spacing.lg, paddingHorizontal: spacing.lg },
  modelChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
  },
  modelChipActive: { borderColor: colors.primary, backgroundColor: colors.surfaceLight },
  modelChipText: { color: colors.textMuted, fontSize: typography.fontSizes.sm },
  modelChipTextActive: { color: colors.primary, fontWeight: '600' },
  characterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  characterCard: {
    width: '30%',
    flex: 1,
    minWidth: 90,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  characterCardActive: { borderColor: colors.primary },
  characterIcon: { fontSize: 24 },
  characterLabel: { color: colors.textSecondary, fontSize: typography.fontSizes.sm, fontWeight: '600' },
  characterLabelActive: { color: colors.primary },
  characterDesc: { color: colors.textMuted, fontSize: typography.fontSizes.xs, textAlign: 'center' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  quickCard: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: 80,
  },
  quickIcon: { fontSize: 22 },
  quickLabel: { color: colors.textSecondary, fontSize: typography.fontSizes.xs, fontWeight: '600' },
  folderChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
  },
  folderChipActive: { borderColor: colors.primary },
  folderChipText: { color: colors.textMuted, fontSize: typography.fontSizes.sm },
  promptInput: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    textAlignVertical: 'top',
  },
  startBtn: { marginTop: spacing.xl },
});
