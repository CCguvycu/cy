# Building VoidLink APK

## Method 1: Expo EAS Build (Recommended)

No local Android SDK required. Builds in the cloud.

### Setup

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo account (free)
eas login

# Navigate to mobile directory
cd voidlink/mobile
```

### Build Preview APK (sideloadable)

```bash
eas build --platform android --profile preview
```

This outputs an `.apk` file you can directly install on Android devices.

### Build Production AAB (Play Store)

```bash
eas build --platform android --profile production
```

### Download & Install

1. After build completes, EAS provides a download URL
2. On Android: Settings → Security → Install Unknown Apps → Allow
3. Open the APK file to install

---

## Method 2: Local Build

Requires Android Studio + SDK.

### Prerequisites

```bash
# Install Android Studio
# https://developer.android.com/studio

# Set environment variables
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### Build

```bash
cd voidlink/mobile

# Install dependencies
npm install

# Generate native project
npx expo prebuild --platform android

# Build debug APK
cd android
./gradlew assembleDebug

# Build release APK
./gradlew assembleRelease

# APK location:
# android/app/build/outputs/apk/debug/app-debug.apk
# android/app/build/outputs/apk/release/app-release.apk
```

### Sign Release APK

```bash
# Generate keystore
keytool -genkey -v \
  -keystore voidlink.keystore \
  -alias voidlink \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# Add to android/app/build.gradle:
android {
  signingConfigs {
    release {
      storeFile file('../../voidlink.keystore')
      storePassword 'YOUR_STORE_PASSWORD'
      keyAlias 'voidlink'
      keyPassword 'YOUR_KEY_PASSWORD'
    }
  }
  buildTypes {
    release {
      signingConfig signingConfigs.release
    }
  }
}

# Build signed APK
./gradlew assembleRelease
```

---

## Method 3: iOS Build

### EAS (requires Apple Developer account)

```bash
eas build --platform ios
```

### Local (requires macOS + Xcode)

```bash
npx expo prebuild --platform ios
cd ios
pod install
open VoidLink.xcworkspace
# Build from Xcode
```

---

## Configure Server URL at Build Time

To bake in your server URL:

```typescript
// mobile/src/services/api.ts
// Change default URL before building
const DEFAULT_SERVER_URL = 'http://YOUR_SERVER_IP:8000';
```

Or use Expo's app config:

```javascript
// app.config.js
export default {
  expo: {
    extra: {
      serverUrl: process.env.SERVER_URL || 'http://192.168.1.100:8000',
    },
  },
};
```

```typescript
// In your app
import Constants from 'expo-constants';
const defaultUrl = Constants.expoConfig?.extra?.serverUrl;
```

---

## Distribution

### Direct APK

Share the `.apk` file via:
- USB transfer
- Google Drive / Dropbox
- QR code linking to download

### Expo Updates (OTA)

```bash
# Push updates without rebuilding
eas update --branch production --message "Update chat UI"
```

App auto-updates on next launch.
