import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { systemApi } from '../src/services/api';
import { colors, spacing, borderRadius, typography } from '../src/utils/theme';

interface TerminalLine {
  type: 'input' | 'output' | 'error' | 'system';
  content: string;
}

const ALLOWED_CMDS = ['ls', 'pwd', 'echo', 'cat', 'grep', 'find', 'ps', 'df', 'free', 'uname', 'ollama', 'date', 'uptime'];

export default function TerminalScreen() {
  const [lines, setLines] = useState<TerminalLine[]>([
    { type: 'system', content: '╔════════════════════════════════╗' },
    { type: 'system', content: '║   VoidLink Terminal v1.0.0     ║' },
    { type: 'system', content: '║   Permission-gated execution   ║' },
    { type: 'system', content: '╚════════════════════════════════╝' },
    { type: 'system', content: `Allowed commands: ${ALLOWED_CMDS.join(', ')}` },
  ]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const execute = async () => {
    const cmd = input.trim();
    if (!cmd) return;

    setLines((prev) => [...prev, { type: 'input', content: `$ ${cmd}` }]);
    setHistory((prev) => [cmd, ...prev]);
    setHistoryIdx(-1);
    setInput('');
    setLoading(true);

    try {
      const res = await systemApi.terminal(cmd);
      const { stdout, stderr, returncode } = res.data;
      if (stdout) {
        stdout.split('\n').filter(Boolean).forEach((line: string) => {
          setLines((prev) => [...prev, { type: 'output', content: line }]);
        });
      }
      if (stderr) {
        stderr.split('\n').filter(Boolean).forEach((line: string) => {
          setLines((prev) => [...prev, { type: 'error', content: line }]);
        });
      }
      if (!stdout && !stderr) {
        setLines((prev) => [...prev, { type: 'system', content: `[exit ${returncode}]` }]);
      }
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'Command failed';
      setLines((prev) => [...prev, { type: 'error', content: `Error: ${msg}` }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const lineColor = (type: TerminalLine['type']) => {
    switch (type) {
      case 'input': return colors.secondary;
      case 'error': return colors.error;
      case 'system': return colors.primary;
      default: return colors.textPrimary;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.output}
        contentContainerStyle={styles.outputContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {lines.map((line, i) => (
          <Text key={i} style={[styles.line, { color: lineColor(line.type) }]}>
            {line.content}
          </Text>
        ))}
        {loading && <Text style={[styles.line, { color: colors.primary }]}>▋</Text>}
      </ScrollView>

      <View style={styles.inputRow}>
        <Text style={styles.prompt}>$</Text>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="enter command..."
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          fontFamily="monospace"
          onSubmitEditing={execute}
          returnKeyType="send"
          editable={!loading}
        />
        <TouchableOpacity onPress={execute} disabled={loading || !input.trim()} style={styles.execBtn}>
          <Ionicons name="return-down-back" size={18} color={loading ? colors.textMuted : colors.primary} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  output: { flex: 1 },
  outputContent: { padding: spacing.md },
  line: { fontFamily: 'monospace', fontSize: typography.fontSizes.sm, lineHeight: 20, marginBottom: 1 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    padding: spacing.md,
    gap: spacing.sm,
  },
  prompt: { color: colors.primary, fontFamily: 'monospace', fontSize: typography.fontSizes.md, fontWeight: '700' },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontFamily: 'monospace',
    fontSize: typography.fontSizes.sm,
    padding: 0,
  },
  execBtn: { padding: spacing.xs },
});
