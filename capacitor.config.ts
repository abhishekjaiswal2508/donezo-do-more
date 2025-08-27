import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.1c27e6abfddc42ebb5ba0f82d35b6865',
  appName: 'donezo-do-more',
  webDir: 'dist',
  server: {
    url: 'https://1c27e6ab-fddc-42eb-b5ba-0f82d35b6865.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#F8FAFC',
      showSpinner: false
    }
  }
};

export default config;