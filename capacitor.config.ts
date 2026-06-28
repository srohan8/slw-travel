import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bysloth.app',
  appName: 'By Sloth',
  webDir: '_site',
  server: {
    startPath: '/app/'
  }
};

export default config;
