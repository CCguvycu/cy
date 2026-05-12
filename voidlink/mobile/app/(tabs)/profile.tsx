import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { showMessage } from 'react-native-flash-message';
import { useAuthStore } from '../../src/store/useAuthStore';
import { systemApi } from '../../src/services/api';
import { CyberButton } from '../../src/components/CyberButton';
import { GlowText } from '../../src/components/GlowText';
import { colors, spacing, borderRadius, typography } from '../../src/utils/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, refreshUser } = useAuthStore();
  const [systemPrompt, setSystemPrompt] = useState(user?.system_prompt || '');
  const [memoryEnabled, setMemoryEnabled] = useState(user?.memory_enabled ?? true);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await systemApi.updateSettings({
        system_prompt: systemPrompt,
        memory_enabled: memoryEnabled,
      });
      await refreshUser();
      showMessage({ message: 'Settings saved', type: 'success' });
    } catch {
      showMessage({ message: 'Save failed', type: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* User info */}
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <GlowText size="xl" style={{ fontWeight: '700' }}>
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </GlowText>
        </View>
        <View>
          <Text style={styles.username}>{user?.username}</Text>
          <Text style={styles.role}>{user?.is_admin ? 'ADMIN' : 'USER'}</Text>
        </View>
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI SETTINGS</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Memory</Text>
            <Text style={styles.settingDesc}>Remember context across conversations</Text>
          </View>
          <Switch
            value={memoryEnabled}
            onValueChange={setMemoryEnabled}
            trackColor={{ false: colors.cardBorder, true: colors.primaryDim }}
            thumbColor={memoryEnabled ? colors.primary : colors.textMuted}
          />
        </View>

        <Text style={styles.inputLabel}>SYSTEM PROMPT</Text>
        <TextInput
          style={styles.textarea}
          value={systemPrompt}
          onChangeText={setSystemPrompt}
          placeholder="You are a helpful AI assistant..."
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <CyberButton title="SAVE SETTINGS" onPress={handleSave} loading={saving} />
      </View>

      {/* Navigation */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>TOOLS</Text>

        {[
          { icon: 'cube', label: 'Model Manager', route: '/models' },
          { icon: 'terminal', label: 'Terminal', route: '/terminal', admin: true },
          { icon: 'folder', label: 'Manage Folders', route: '/(tabs)' },
          { icon: 'qr-code', label: 'Scan QR / Pair Device', route: '/qr-scan' },
        ].map((item) => {
          if (item.admin && !user?.is_admin) return null;
          return (
            <TouchableOpacity
              key={item.label}
              style={styles.navItem}
              onPress={() => router.push(item.route as any)}
            >
              <Ionicons name={item.icon as any} size={20} color={colors.primary} />
              <Text style={styles.navLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Logout */}
      <CyberButton
        title="LOGOUT"
        onPress={handleLogout}
        variant="danger"
        style={styles.logoutBtn}
      />

      <Text style={styles.version}>VoidLink v1.0.0 · No telemetry · Local-first</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 80 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  username: { color: colors.textPrimary, fontSize: typography.fontSizes.xl, fontWeight: '700' },
  role: { color: colors.primary, fontSize: typography.fontSizes.xs, letterSpacing: 2, fontWeight: '700' },
  section: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: { color: colors.textMuted, fontSize: typography.fontSizes.xs, letterSpacing: 2, fontWeight: '700' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingInfo: { flex: 1 },
  settingLabel: { color: colors.textPrimary, fontSize: typography.fontSizes.md, fontWeight: '600' },
  settingDesc: { color: colors.textMuted, fontSize: typography.fontSizes.xs, marginTop: 2 },
  inputLabel: { color: colors.textMuted, fontSize: typography.fontSizes.xs, letterSpacing: 2, fontWeight: '700' },
  textarea: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    minHeight: 100,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  navLabel: { flex: 1, color: colors.textSecondary, fontSize: typography.fontSizes.md },
  logoutBtn: { marginTop: spacing.md },
  version: { color: colors.textMuted, fontSize: typography.fontSizes.xs, textAlign: 'center' },
});
