import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { systemApi, modelsApi } from '../../src/services/api';
import { colors, spacing, borderRadius, typography } from '../../src/utils/theme';

interface SystemStats {
  cpu: { percent: number; cores: number; threads: number; frequency_mhz: number };
  ram: { total_gb: number; used_gb: number; percent: number };
  disk: { total_gb: number; used_gb: number; percent: number };
  gpu: Array<{ name: string; load_percent: number; memory_used_mb: number; memory_total_mb: number; temperature_c: number }>;
  timestamp: string;
}

function ProgressBar({ value, color = colors.primary }: { value: number; color?: string }) {
  return (
    <View style={styles.progressBg}>
      <View style={[styles.progressFill, { width: `${Math.min(value, 100)}%` as any, backgroundColor: color }]} />
    </View>
  );
}

function StatCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name={icon as any} size={16} color={colors.primary} />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export default function SystemScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [ollamaOk, setOllamaOk] = useState<boolean | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [models, setModels] = useState<any[]>([]);

  const fetchStats = async () => {
    try {
      const [statsRes, modelsRes] = await Promise.all([
        systemApi.stats(),
        modelsApi.list(),
      ]);
      setStats(statsRes.data);
      setOllamaOk(modelsRes.data.ollama_healthy);
      setModels(modelsRes.data.models || []);
    } catch {
      setOllamaOk(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  const cpuColor = stats ? (stats.cpu.percent > 80 ? colors.error : stats.cpu.percent > 60 ? colors.warning : colors.primary) : colors.primary;
  const ramColor = stats ? (stats.ram.percent > 85 ? colors.error : stats.ram.percent > 70 ? colors.warning : colors.secondary) : colors.secondary;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={styles.content}>
        {/* Ollama status */}
        <View style={[styles.statusBadge, { borderColor: ollamaOk ? colors.primary : colors.error }]}>
          <View style={[styles.statusDot, { backgroundColor: ollamaOk ? colors.primary : colors.error }]} />
          <Text style={[styles.statusText, { color: ollamaOk ? colors.primary : colors.error }]}>
            Ollama {ollamaOk ? 'Connected' : 'Disconnected'}
          </Text>
          <Text style={styles.modelCount}>{models.length} models loaded</Text>
        </View>

        {/* CPU */}
        {stats && (
          <>
            <StatCard title="CPU" icon="hardware-chip-outline">
              <View style={styles.statRow}>
                <Text style={styles.statValue}>{stats.cpu.percent.toFixed(1)}%</Text>
                <Text style={styles.statLabel}>{stats.cpu.cores}C / {stats.cpu.threads}T · {stats.cpu.frequency_mhz}MHz</Text>
              </View>
              <ProgressBar value={stats.cpu.percent} color={cpuColor} />
            </StatCard>

            <StatCard title="RAM" icon="server-outline">
              <View style={styles.statRow}>
                <Text style={styles.statValue}>{stats.ram.used_gb}GB</Text>
                <Text style={styles.statLabel}>of {stats.ram.total_gb}GB · {stats.ram.percent.toFixed(1)}%</Text>
              </View>
              <ProgressBar value={stats.ram.percent} color={ramColor} />
            </StatCard>

            <StatCard title="DISK" icon="disc-outline">
              <View style={styles.statRow}>
                <Text style={styles.statValue}>{stats.disk.used_gb}GB</Text>
                <Text style={styles.statLabel}>of {stats.disk.total_gb}GB · {stats.disk.percent.toFixed(1)}%</Text>
              </View>
              <ProgressBar value={stats.disk.percent} color={colors.accent} />
            </StatCard>

            {stats.gpu.length > 0 && stats.gpu.map((gpu, i) => (
              <StatCard key={i} title={`GPU: ${gpu.name}`} icon="flash-outline">
                <View style={styles.statRow}>
                  <Text style={styles.statValue}>{gpu.load_percent.toFixed(1)}%</Text>
                  <Text style={styles.statLabel}>
                    VRAM: {(gpu.memory_used_mb / 1024).toFixed(1)}GB / {(gpu.memory_total_mb / 1024).toFixed(1)}GB · {gpu.temperature_c}°C
                  </Text>
                </View>
                <ProgressBar value={gpu.load_percent} color={colors.warning} />
              </StatCard>
            ))}
          </>
        )}

        {/* Loaded Models */}
        <StatCard title="LOADED MODELS" icon="cube-outline">
          {models.length === 0 ? (
            <Text style={styles.emptyText}>No models available</Text>
          ) : (
            models.map((m) => (
              <View key={m.name} style={styles.modelRow}>
                <Text style={styles.modelName}>{m.display || m.name}</Text>
                <Text style={styles.modelSize}>{m.size ? `${(m.size / 1e9).toFixed(1)}GB` : ''}</Text>
              </View>
            ))
          )}
        </StatCard>

        {/* Quick actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/models')}>
            <Ionicons name="download-outline" size={20} color={colors.primary} />
            <Text style={styles.actionText}>Model Manager</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/terminal')}>
            <Ionicons name="terminal-outline" size={20} color={colors.secondary} />
            <Text style={styles.actionText}>Terminal</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 80 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontWeight: '700', fontSize: typography.fontSizes.sm, flex: 1 },
  modelCount: { color: colors.textMuted, fontSize: typography.fontSizes.xs },
  card: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTitle: { color: colors.textMuted, fontSize: typography.fontSizes.xs, letterSpacing: 2, fontWeight: '700' },
  statRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  statValue: { color: colors.textPrimary, fontSize: typography.fontSizes.xxl, fontWeight: '700' },
  statLabel: { color: colors.textMuted, fontSize: typography.fontSizes.xs },
  progressBg: { height: 4, backgroundColor: colors.cardBorder, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  modelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.divider },
  modelName: { color: colors.textSecondary, fontSize: typography.fontSizes.sm },
  modelSize: { color: colors.textMuted, fontSize: typography.fontSizes.xs, fontFamily: 'monospace' },
  emptyText: { color: colors.textMuted, fontSize: typography.fontSizes.sm, textAlign: 'center', paddingVertical: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.md },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  actionText: { color: colors.textSecondary, fontSize: typography.fontSizes.sm, fontWeight: '600' },
});
