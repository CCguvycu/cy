import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { modelsApi } from '../services/api';
import { useChatStore } from '../store/useChatStore';
import { colors, spacing, borderRadius, typography } from '../utils/theme';

interface Model {
  name: string;
  display: string;
  size?: number;
  context_length?: number;
}

export const ModelSelector: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(false);
  const { selectedModel, setSelectedModel } = useChatStore();

  useEffect(() => {
    if (open) fetchModels();
  }, [open]);

  const fetchModels = async () => {
    setLoading(true);
    try {
      const res = await modelsApi.list();
      setModels(res.data.models || []);
    } catch {
      setModels([]);
    } finally {
      setLoading(false);
    }
  };

  const select = (m: Model) => {
    setSelectedModel(m.name);
    setOpen(false);
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    const gb = bytes / 1e9;
    return gb >= 1 ? `${gb.toFixed(1)}GB` : `${(bytes / 1e6).toFixed(0)}MB`;
  };

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)}>
        <Ionicons name="cube-outline" size={16} color={colors.primary} />
        <Text style={styles.triggerText} numberOfLines={1}>
          {selectedModel}
        </Text>
        <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity style={styles.backdrop} onPress={() => setOpen(false)} activeOpacity={1}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.title}>Select Model</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {loading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.xl }} />
            ) : models.length === 0 ? (
              <Text style={styles.empty}>No models found. Make sure Ollama is running.</Text>
            ) : (
              <FlatList
                data={models}
                keyExtractor={(m) => m.name}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.modelItem, item.name === selectedModel && styles.selectedItem]}
                    onPress={() => select(item)}
                  >
                    <View style={styles.modelInfo}>
                      <Text style={styles.modelName}>{item.display || item.name}</Text>
                      <Text style={styles.modelMeta}>
                        {item.name}
                        {item.context_length ? ` · ${(item.context_length / 1000).toFixed(0)}K ctx` : ''}
                        {item.size ? ` · ${formatSize(item.size)}` : ''}
                      </Text>
                    </View>
                    {item.name === selectedModel && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    maxWidth: 200,
  },
  triggerText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderTopWidth: 1,
    borderColor: colors.cardBorder,
    maxHeight: '70%',
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: '700',
  },
  modelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  selectedItem: {
    backgroundColor: colors.surfaceLight,
  },
  modelInfo: {
    flex: 1,
  },
  modelName: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: '600',
  },
  modelMeta: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    padding: spacing.xl,
    fontSize: typography.fontSizes.md,
  },
});
