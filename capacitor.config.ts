import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bysloth.app',
  appName: 'By Sloth',
  webDir: '_site',
  server: {
    appStartPath: '/app/index.html'
  }
};

export default config;
