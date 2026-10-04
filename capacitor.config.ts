import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.photoequality.app.native',
  appName: 'Photo-Equality',
  webDir: 'artifacts/photo-editor/dist',
  plugins: {
    Keyboard: {
      resize: 'none'
    }
  }
};

export default config;
