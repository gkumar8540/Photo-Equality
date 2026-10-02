import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.photoequality.app.native',
  appName: 'Photo-Equality',
  webDir: 'artifacts/photo-editor/dist',
  plugins: {
    Keyboard: {
      resize: 'none',
    },
  },
  server: {
    url: 'https://photo-equality-bap.vercel.app',
    cleartext: true,
    androidScheme: 'https'
  }
};

export default config;
