import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { showMessage } from 'react-native-flash-message';
import { useAuthStore } from '../src/store/useAuthStore';
import { setServerUrl } from '../src/services/api';
import { useServerDiscovery } from '../src/hooks/useServerDiscovery';
import { CyberButton } from '../src/components/CyberButton';
import { GlowText } from '../src/components/GlowText';
import { colors, spacing, borderRadius, typography } from '../src/utils/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const { discover, discovering, servers } = useServerDiscovery();

  const [phase, setPhase] = useState<'scan' | 'manual'>('scan');
  const [serverUrl, setServerUrlState] = useState('');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedServer, setSelectedServer] = useState('');

  // Auto-scan on mount
  useEffect(() => {
    runDiscovery();
  }, []);

  const runDiscovery = async () => {
    const found = await discover();
    if (found.length === 1) {
      // Exactly one server found — pre-select it
      setSelectedServer(found[0].url);
      setServerUrlState(found[0].url);
    }
  };

  const handleConnect = async (urlOverride?: string) => {
    const url = (urlOverride || selectedServer || serverUrl).trim();
    if (!url) {
      showMessage({ message: 'Enter a server URL', type: 'warning' });
      return;
    }
    if (!password.trim()) {
      showMessage({ message: 'Enter your password', type: 'warning' });
      return;
    }

    try {
      await setServerUrl(url);
      await login(username.trim(), password);
      router.replace('/(tabs)');
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      showMessage({
        message: 'Connection failed',
        description: detail || 'Check URL and credentials',
        type: 'danger',
      });
    }
  };

  // ── Scan phase ──────────────────────────────────────────────────────────────
  if (phase === 'scan') {
    return (
      <LinearGradient colors={['#000000', '#020208', '#000510']} style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

            {/* Logo */}
            <View style={styles.header}>
              <GlowText size="xxxl" style={styles.logo}>VOID</GlowText>
              <GlowText size="xxxl" color={colors.secondary} style={styles.logo}>LINK</GlowText>
              <Text style={styles.tagline}>/// Remote AI Interface ///</Text>
            </View>

            {/* Scan status */}
            <View style={styles.scanCard}>
              {discovering ? (
                <>
                  <ActivityIndicator color={colors.primary} size="large" />
                  <Text style={styles.scanTitle}>Scanning network...</Text>
                  <Text style={styles.scanSub}>Looking for VoidLink servers on your WiFi</Text>
                </>
              ) : servers.length === 0 ? (
                <>
                  <Ionicons name="wifi-outline" size={40} color={colors.textMuted} />
                  <Text style={styles.scanTitle}>No servers found</Text>
                  <Text style={styles.scanSub}>
                    Make sure VoidLink Desktop is running on your PC and both devices are on the same WiFi.
                  </Text>
                  <View style={styles.scanActions}>
                    <CyberButton
                      title="Scan Again"
                      onPress={runDiscovery}
                      variant="outline"
                      size="sm"
                    />
                    <CyberButton
                      title="Enter Manually"
                      onPress={() => setPhase('manual')}
                      variant="ghost"
                      size="sm"
                    />
                  </View>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={36} color={colors.primary} />
                  <Text style={styles.scanTitle}>
                    {servers.length === 1 ? 'Server found!' : `${servers.length} servers found`}
                  </Text>

                  {/* Server list */}
                  {servers.map((s) => (
                    <TouchableOpacity
                      key={s.url}
                      style={[
                        styles.serverRow,
                        selectedServer === s.url && styles.serverRowSelected,
                      ]}
                      onPress={() => {
                        setSelectedServer(s.url);
                        setServerUrlState(s.url);
                      }}
                    >
                      <View style={styles.serverInfo}>
                        <Text style={styles.serverUrl}>{s.url}</Text>
                        {s.hostname && (
                          <Text style={styles.serverMeta}>{s.hostname}</Text>
                        )}
                      </View>
                      {selectedServer === s.url && (
                        <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </View>

            {/* Password field — shown when a server is selected */}
            {(selectedServer || servers.length > 0) && !discovering && (
              <View style={styles.form}>
                <View style={styles.field}>
                  <Text style={styles.label}>USERNAME</Text>
                  <TextInput
                    style={styles.input}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>PASSWORD</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      placeholder="Your VoidLink password"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
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
                  <Text style={styles.hint}>
                    Find your password in the VoidLink tray icon → Show Credentials
                  </Text>
                </View>

                <CyberButton
                  title="CONNECT"
                  onPress={() => handleConnect()}
                  loading={isLoading}
                  size="lg"
                  style={styles.connectBtn}
                />

                <TouchableOpacity
                  style={styles.switchMode}
                  onPress={() => router.push('/qr-scan')}
                >
                  <Ionicons name="qr-code-outline" size={16} color={colors.textMuted} />
                  <Text style={styles.switchModeText}>Scan QR code instead</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.switchMode}
                  onPress={() => setPhase('manual')}
                >
                  <Ionicons name="settings-outline" size={16} color={colors.textMuted} />
                  <Text style={styles.switchModeText}>Enter server URL manually</Text>
                </TouchableOpacity>
              </View>
            )}

          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    );
  }

  // ── Manual phase ─────────────────────────────────────────────────────────────
  return (
    <LinearGradient colors={['#000000', '#020208', '#000510']} style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <View style={styles.header}>
            <GlowText size="xxxl" style={styles.logo}>VOID</GlowText>
            <GlowText size="xxxl" color={colors.secondary} style={styles.logo}>LINK</GlowText>
          </View>

          <View style={styles.form}>

            <TouchableOpacity style={styles.backBtn} onPress={() => setPhase('scan')}>
              <Ionicons name="arrow-back" size={16} color={colors.textMuted} />
              <Text style={styles.backText}>Back to auto-discover</Text>
            </TouchableOpacity>

            <View style={styles.field}>
              <Text style={styles.label}>SERVER URL</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={serverUrl}
                  onChangeText={setServerUrlState}
                  placeholder="http://192.168.1.x:8000"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  keyboardType="url"
                />
                <TouchableOpacity
                  style={styles.qrBtn}
                  onPress={() => router.push('/qr-scan')}
                >
                  <Ionicons name="qr-code" size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.hint}>
                Find your IP: open tray icon → Copy Server URL
              </Text>
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
                  autoCapitalize="none"
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
              onPress={() => handleConnect(serverUrl)}
              loading={isLoading}
              size="lg"
              style={styles.connectBtn}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  header: { alignItems: 'center', marginBottom: spacing.xxl },
  logo: { fontSize: 44, fontWeight: '900', letterSpacing: 8, lineHeight: 52 },
  tagline: { color: colors.textMuted, fontSize: typography.fontSizes.sm, letterSpacing: 3, marginTop: spacing.sm },

  scanCard: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  scanTitle: { color: colors.textPrimary, fontSize: typography.fontSizes.lg, fontWeight: '700', textAlign: 'center' },
  scanSub: { color: colors.textMuted, fontSize: typography.fontSizes.sm, textAlign: 'center', lineHeight: 20 },
  scanActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },

  serverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    backgroundColor: colors.card,
  },
  serverRowSelected: { borderColor: colors.primary, backgroundColor: colors.surfaceLight },
  serverInfo: { flex: 1 },
  serverUrl: { color: colors.textPrimary, fontSize: typography.fontSizes.sm, fontFamily: 'monospace' },
  serverMeta: { color: colors.textMuted, fontSize: typography.fontSizes.xs, marginTop: 2 },

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
  eyeBtn: { position: 'absolute', right: spacing.md },
  qrBtn: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  hint: { color: colors.textMuted, fontSize: typography.fontSizes.xs, lineHeight: 16 },
  connectBtn: { marginTop: spacing.sm },
  switchMode: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.xs },
  switchModeText: { color: colors.textMuted, fontSize: typography.fontSizes.sm },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  backText: { color: colors.textMuted, fontSize: typography.fontSizes.sm },
});
