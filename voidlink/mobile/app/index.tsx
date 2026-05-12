import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/useAuthStore';
import { GlowText } from '../src/components/GlowText';
import { colors } from '../src/utils/theme';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace('/(tabs)');
      } else {
        router.replace('/login');
      }
    }
  }, [isAuthenticated, isLoading]);

  return (
    <View style={styles.container}>
      <GlowText size="xxxl" style={styles.logo}>
        VOID
      </GlowText>
      <GlowText size="xxxl" color={colors.secondary} style={styles.logo}>
        LINK
      </GlowText>
      <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 8,
    lineHeight: 56,
  },
});
