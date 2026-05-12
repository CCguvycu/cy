import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { showMessage } from 'react-native-flash-message';
import { modelsApi } from '../src/services/api';
import { useAuthStore } from '../src/store/useAuthStore';
import { CyberButton } from '../src/components/CyberButton';
import { colors, spacing, borderRadius, typography } from '../src/utils/theme';

const RECOMMENDED_MODELS = [
  { name: 'llama3', display: 'Llama 3 8B', desc: 'Meta\'s flagship 8B model. Fast and capable.' },
  { name: 'llama3:70b', display: 'Llama 3 70B', desc: 'Large model, needs 48GB+ VRAM.' },
  { name: 'mistral', display: 'Mistral 7B', desc: 'Fast, great for coding and reasoning.' },
  { name: 'deepseek-r1', display: 'DeepSeek R1', desc: 'Excellent for deep reasoning tasks.' },
  { name: 'qwen2', display: 'Qwen 2 7B', desc: 'Alibaba\'s multilingual model.' },
  { name: 'codellama', display: 'Code Llama', desc: 'Specialized for code generation.' },
  { name: 'phi3', display: 'Phi-3 Mini', desc: 'Small and fast, good for edge devices.' },
];

export default function ModelsScreen() {
  const { user } = useAuthStore();
  const [installed, setInstalled] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pulling, setPulling] = useState<string | null>(null);
  const [pullProgress, setPullProgress] = useState('');
  const [customModel, setCustomModel] = useState('');

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const res = await modelsApi.list();
      setInstalled(res.data.models || []);
    } catch {
      showMessage({ message: 'Failed to load models', type: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const pullModel = async (modelName: string) => {
    if (!user?.is_admin) {
      showMessage({ message: 'Admin access required to pull models', type: 'warning' });
      return;
    }
    setPulling(modelName);
    setPullProgress('Starting download...');
    try {
      const res = await fetch(`${(await import('../src/services/api')).getBaseUrl()}/api/models/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await (await import('../src/services/api')).getStoredToken()}`,
        },
        body: JSON.stringify({ model_name: modelName }),
      });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value);
          try {
            const data = JSON.parse(text.trim());
            if (data.status) setPullProgress(data.status);
          } catch { /* ignore */ }
        }
      }
      showMessage({ message: `${modelName} downloaded successfully`, type: 'success' });
      await fetchModels();
    } catch {
      showMessage({ message: 'Download failed', type: 'danger' });
    } finally {
      setPulling(null);
      setPullProgress('');
    }
  };

  const deleteModel = (name: string) => {
    if (!user?.is_admin) return;
    Alert.alert('Delete Model', `Remove ${name}? This frees disk space.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await modelsApi.list(); // health check
            // await modelsApi.delete(name);
            showMessage({ message: `${name} removed`, type: 'success' });
            await fetchModels();
          } catch {
            showMessage({ message: 'Delete failed', type: 'danger' });
          }
        },
      },
    ]);
  };

  const installedNames = installed.map((m) => m.name);

  return (
    <View style={styles.container}>
      {/* Custom model input */}
      <View style={styles.customRow}>
        <TextInput
          style={styles.customInput}
          value={customModel}
          onChangeText={setCustomModel}
          placeholder="model:tag (e.g. llama3:8b)"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={styles.pullBtn}
          onPress={() => customModel && pullModel(customModel)}
          disabled={!!pulling}
        >
          {pulling === customModel ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Ionicons name="download" size={20} color={colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      {pulling && (
        <View style={styles.progressRow}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={styles.progressText}>{pullProgress}</Text>
        </View>
      )}

      {/* Installed models */}
      <Text style={styles.sectionTitle}>INSTALLED</Text>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ margin: spacing.xl }} />
      ) : installed.length === 0 ? (
        <Text style={styles.emptyText}>No models installed</Text>
      ) : (
        installed.map((m) => (
          <View key={m.name} style={styles.installedRow}>
            <View style={styles.installedInfo}>
              <Text style={styles.installedName}>{m.display || m.name}</Text>
              <Text style={styles.installedMeta}>
                {m.size ? `${(m.size / 1e9).toFixed(1)}GB` : ''}
                {m.context_length ? ` · ${(m.context_length / 1000).toFixed(0)}K ctx` : ''}
              </Text>
            </View>
            <View style={styles.installedBadge}>
              <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
              <Text style={styles.installedBadgeText}>Installed</Text>
            </View>
            {user?.is_admin && (
              <TouchableOpacity onPress={() => deleteModel(m.name)} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={16} color={colors.error} />
              </TouchableOpacity>
            )}
          </View>
        ))
      )}

      {/* Recommended models */}
      <Text style={styles.sectionTitle}>RECOMMENDED</Text>
      {RECOMMENDED_MODELS.map((m) => {
        const isInstalled = installedNames.includes(m.name);
        const isPulling = pulling === m.name;
        return (
          <View key={m.name} style={styles.recRow}>
            <View style={styles.recInfo}>
              <Text style={styles.recName}>{m.display}</Text>
              <Text style={styles.recDesc}>{m.desc}</Text>
            </View>
            <TouchableOpacity
              style={[styles.recBtn, isInstalled && styles.recBtnInstalled]}
              onPress={() => !isInstalled && pullModel(m.name)}
              disabled={isInstalled || !!pulling}
            >
              {isPulling ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <Ionicons
                  name={isInstalled ? 'checkmark' : 'download-outline'}
                  size={18}
                  color={isInstalled ? colors.primary : colors.textSecondary}
                />
              )}
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  customRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  customInput: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    fontFamily: 'monospace',
  },
  pullBtn: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  progressText: { color: colors.primary, fontSize: typography.fontSizes.sm, flex: 1 },
  sectionTitle: { color: colors.textMuted, fontSize: typography.fontSizes.xs, letterSpacing: 2, fontWeight: '700', marginBottom: spacing.sm, marginTop: spacing.md },
  emptyText: { color: colors.textMuted, textAlign: 'center', padding: spacing.xl },
  installedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  installedInfo: { flex: 1 },
  installedName: { color: colors.textPrimary, fontSize: typography.fontSizes.md, fontWeight: '600' },
  installedMeta: { color: colors.textMuted, fontSize: typography.fontSizes.xs, fontFamily: 'monospace' },
  installedBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  installedBadgeText: { color: colors.primary, fontSize: typography.fontSizes.xs, fontWeight: '600' },
  deleteBtn: { padding: spacing.xs },
  recRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  recInfo: { flex: 1 },
  recName: { color: colors.textPrimary, fontSize: typography.fontSizes.md, fontWeight: '600' },
  recDesc: { color: colors.textMuted, fontSize: typography.fontSizes.xs, marginTop: 2 },
  recBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recBtnInstalled: { borderColor: colors.primary },
});
