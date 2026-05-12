import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { setServerUrl, storeToken } from '../src/services/api';
import { showMessage } from 'react-native-flash-message';
import { colors, spacing, typography } from '../src/utils/theme';

export default function QrScanScreen() {
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const router = useRouter();

  if (!permission?.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Camera permission required</Text>
      </View>
    );
  }

  const handleBarCode = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    // Expected format: voidlink://server:port?token=xxx
    if (data.startsWith('voidlink://')) {
      try {
        const url = new URL(data.replace('voidlink://', 'http://'));
        const serverUrl = `http://${url.host}`;
        const token = url.searchParams.get('token');

        if (serverUrl && token) {
          await setServerUrl(serverUrl);
          await storeToken(token);
          showMessage({ message: 'Device paired successfully!', type: 'success' });
          router.replace('/(tabs)');
          return;
        }
      } catch {
        // fall through
      }
    }

    Alert.alert('Invalid QR Code', 'This QR code is not a valid VoidLink pairing code.', [
      { text: 'Try Again', onPress: () => setScanned(false) },
    ]);
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        onBarcodeScanned={handleBarCode}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      >
        <View style={styles.overlay}>
          <View style={styles.scanBox} />
          <Text style={styles.hint}>Scan the VoidLink QR code from your server</Text>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  text: { color: colors.textPrimary, fontSize: typography.fontSizes.md },
  camera: { flex: 1 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xl },
  scanBox: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowRadius: 20,
    shadowOpacity: 0.8,
    shadowOffset: { width: 0, height: 0 },
  },
  hint: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});
