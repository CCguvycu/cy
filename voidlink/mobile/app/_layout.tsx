import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import FlashMessage from 'react-native-flash-message';
import { useAuthStore } from '../src/store/useAuthStore';
import { initApi } from '../src/services/api';
import { colors } from '../src/utils/theme';

export default function RootLayout() {
  const { loadFromStorage } = useAuthStore();

  useEffect(() => {
    const init = async () => {
      await initApi();
      await loadFromStorage();
    };
    init();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor={colors.background} />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.textPrimary,
            headerTitleStyle: { fontWeight: '700', color: colors.primary },
            contentStyle: { backgroundColor: colors.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="chat/[id]" options={{ title: 'Chat', headerBackTitle: '' }} />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
          <Stack.Screen name="terminal" options={{ title: 'Terminal', headerStyle: { backgroundColor: '#000' } }} />
          <Stack.Screen name="models" options={{ title: 'Model Manager' }} />
          <Stack.Screen name="qr-scan" options={{ title: 'Scan QR Code', presentation: 'modal' }} />
        </Stack>
        <FlashMessage position="top" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
