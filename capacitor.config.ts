import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bysloth.app',
  appName: 'By Sloth',
  webDir: '_site',
  server: {
    appStartPath: '/app/index.html'
  },
  android: {
    // Required by @capacitor-community/background-geolocation — without this,
    // location updates halt after ~5 minutes in the background.
    useLegacyBridge: true
  }
};

export default config;
