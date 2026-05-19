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
    // Cream (matches body bg in globals.css). This is the Activity window
    // colour shown AFTER the splash hides but BEFORE the Vercel WebView has
    // painted its first frame. Earlier this was forest green (#0d4a2e),
    // which produced the "permanent green screen" — the splash faded at
    // 1.2 s, then the WebView took another 2-3 s to load the page, and
    // during that gap the user saw solid forest. Cream makes the gap look
    // like a clean loading state instead of a broken green wall.
    backgroundColor: '#f7efe1',
  },
  ios: {
    backgroundColor: '#f7efe1',
    // Allow the WebView to launch into the in-app browser for any external
    // links (Twilio sandbox, payment gateways) without leaving the app.
    contentInset: 'always',
  },
  plugins: {
    SplashScreen: {
      // Hold the branded splash long enough to cover a typical Vercel cold
      // start (~2.5-3 s on first open). When the WebView paints sooner the
      // splash still hides early via Capacitor's auto-hide hook; this is
      // the maximum, not a minimum.
      launchShowDuration: 3000,
      // Splash itself stays brand green — this is the *splash* background,
      // not the Activity background. User sees green splash → cream gap
      // (if any) → page. No solid-green-for-3s screen anymore.
      backgroundColor: '#0d4a2e',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      // Fade out cleanly instead of cutting to whatever's behind.
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
