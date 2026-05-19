import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Magarpatta Go — mobile app shell config.
 *
 * Architecture: the APK / IPA is a thin WebView wrapper that loads the
 * production Vercel deploy directly. Every code change you push to main
 * shows up on the next app open with no rebuild — only changes to native
 * config (icons, splash, capacitor plugins) require a fresh APK/IPA.
 *
 * Build:
 *   cd apps/web
 *   npx cap sync                    # syncs config + assets into native projects
 *   npx cap open android            # opens Android Studio → Build APK
 *   npx cap open ios                # opens Xcode → Archive → Export IPA (Mac only)
 */
const config: CapacitorConfig = {
  appId: 'com.magarpattago.app',
  appName: 'Magarpatta Go',
  // webDir is unused when `server.url` is set, but Capacitor still requires
  // the property to exist. Pointing at the Next.js public dir keeps the
  // CLI happy without needing a `next build && next export`.
  webDir: 'public',
  server: {
    url: 'https://web-eta-ebon-80.vercel.app',
    cleartext: false,
    // Allow the app to also load the Vercel preview deploy if needed.
    allowNavigation: [
      'web-eta-ebon-80.vercel.app',
      '*.vercel.app',
    ],
  },
  android: {
    // White status-bar text on the forest theme colour, matches the PWA.
    backgroundColor: '#0d4a2e',
  },
  ios: {
    backgroundColor: '#0d4a2e',
    // Allow the WebView to launch into the in-app browser for any external
    // links (Twilio sandbox, payment gateways) without leaving the app.
    contentInset: 'always',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#0d4a2e',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
};

export default config;
