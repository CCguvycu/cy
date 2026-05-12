import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { showMessage } from 'react-native-flash-message';
import { useAuthStore } from '../src/store/useAuthStore';
import { setServerUrl, getServerUrl } from '../src/services/api';
import { CyberButton } from '../src/components/CyberButton';
import { GlowText } from '../src/components/GlowText';
import { colors, spacing, borderRadius, typography } from '../src/utils/theme';

export default function LoginScreen() {
  const [serverUrl, setServerUrlState] = useState('http://192.168.1.100:8000');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [tab, setTab] = useState<'login' | 'setup'>('login');
  const { login, isLoading } = useAuthStore();
  const router = useRouter();

  const handleLogin = async () => {
    if (!serverUrl.trim() || !username.trim() || !password.trim()) {
      showMessage({ message: 'Fill in all fields', type: 'warning' });
      return;
    }
    try {
      await setServerUrl(serverUrl.trim());
      await login(username.trim(), password);
      router.replace('/(tabs)');
    } catch (e: any) {
      showMessage({
        message: 'Login failed',
        description: e?.response?.data?.detail || 'Check server URL and credentials',
        type: 'danger',
      });
    }
  };

  const handleQrScan = () => {
    router.push('/qr-scan');
  };

  return (
    <LinearGradient colors={['#000000', '#020208', '#000510']} style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <GlowText size="xxxl" style={styles.logo}>VOID</GlowText>
            <GlowText size="xxxl" color={colors.secondary} style={styles.logo}>LINK</GlowText>
            <Text style={styles.tagline}>/// Remote AI Interface ///</Text>
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            {(['login', 'setup'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.tab, tab === t && styles.activeTab]}
                onPress={() => setTab(t)}
              >
                <Text style={[styles.tabText, tab === t && styles.activeTabText]}>
                  {t.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>SERVER URL</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={serverUrl}
                  onChangeText={setServerUrlState}
                  placeholder="http://192.168.x.x:8000"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  keyboardType="url"
                />
                <TouchableOpacity style={styles.qrBtn} onPress={handleQrScan}>
                  <Ionicons name="qr-code" size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>USERNAME</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="admin"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>PASSWORD</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <CyberButton
              title="CONNECT"
              onPress={handleLogin}
              loading={isLoading}
              style={styles.loginBtn}
            />

            <Text style={styles.hint}>
              Tip: Use Tailscale for secure remote access from anywhere
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  header: { alignItems: 'center', marginBottom: spacing.xxxl },
  logo: { fontSize: 44, fontWeight: '900', letterSpacing: 8, lineHeight: 52 },
  tagline: { color: colors.textMuted, fontSize: typography.fontSizes.sm, letterSpacing: 3, marginTop: spacing.sm },
  tabs: { flexDirection: 'row', borderWidth: 1, borderColor: colors.cardBorder, borderRadius: borderRadius.md, marginBottom: spacing.xl },
  tab: { flex: 1, paddingVertical: spacing.md, alignItems: 'center' },
  activeTab: { backgroundColor: colors.surfaceLight, borderRadius: borderRadius.md },
  tabText: { color: colors.textMuted, fontSize: typography.fontSizes.sm, fontWeight: '600', letterSpacing: 1 },
  activeTabText: { color: colors.primary },
  form: { gap: spacing.lg },
  field: { gap: spacing.xs },
  label: { color: colors.textMuted, fontSize: typography.fontSizes.xs, letterSpacing: 2, fontWeight: '600' },
  input: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  qrBtn: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  eyeBtn: {
    position: 'absolute',
    right: spacing.md,
  },
  loginBtn: { marginTop: spacing.md },
  hint: { color: colors.textMuted, fontSize: typography.fontSizes.xs, textAlign: 'center', lineHeight: 18 },
});
