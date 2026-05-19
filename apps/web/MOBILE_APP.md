# Magarpatta Go — Mobile app build guide

This wraps the existing Next.js site (deployed at https://web-eta-ebon-80.vercel.app) into a native APK (Android) and IPA (iOS) using **Capacitor**. The app is a thin WebView shell pointed at the live deploy, so every code change you push to `main` is reflected on next app open — no new APK needed for content changes.

## What's already wired up

- `capacitor.config.ts` — app id `com.magarpattago.app`, name **Magarpatta Go**, server URL pinned to the prod Vercel URL.
- Capacitor 7 packages installed in `apps/web`:
  - `@capacitor/core`, `@capacitor/cli`
  - `@capacitor/android`, `@capacitor/ios`

No native project folders yet — those are generated on first `cap add` (separately for Android and iOS).

---

## Android APK — one-time setup

**Pre-requisites (install once on your laptop):**
- [Android Studio](https://developer.android.com/studio) — includes the SDK
- Java 17 (Android Studio bundles this)

**Generate the Android project:**

```bash
cd apps/web
npx cap add android
```

This creates `apps/web/android/` — a Gradle project Capacitor will keep in sync with your config.

**Build the APK:**

```bash
cd apps/web
npx cap sync android         # copies config into the Android project
npx cap open android         # opens Android Studio
```

In Android Studio:
1. Wait for Gradle sync (~2 minutes on a fresh machine)
2. Menu: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
3. When it finishes, click the "locate" link in the toast — the APK is at `apps/web/android/app/build/outputs/apk/debug/app-debug.apk`

That `.apk` file is what you sideload onto Android phones for testing. It's signed with a debug key (not Play-Store-ready, but installs fine on any Android device with "Install from unknown sources" enabled).

---

## iOS IPA — one-time setup

**Pre-requisites:**
- A **Mac** (Apple's Xcode toolchain only runs on macOS — this isn't a Capacitor limitation, it's an Apple one)
- [Xcode](https://apps.apple.com/in/app/xcode/id497799835) (free from the App Store)
- An **Apple ID** for signing — `$99/year` Apple Developer membership only required if you want to TestFlight or App Store; a free Apple ID can sideload to your own devices for 7 days at a time

**Generate the iOS project (on the Mac):**

```bash
cd apps/web
npx cap add ios
```

This creates `apps/web/ios/` — an Xcode workspace.

**Build the IPA:**

```bash
cd apps/web
npx cap sync ios
npx cap open ios         # opens Xcode
```

In Xcode:
1. Top-left dropdown → select your Apple ID under "Signing & Capabilities" (or pick "Personal Team" if you don't have a paid account)
2. Connect your iPhone via USB, select it in the device dropdown next to the Play button
3. Hit **Play (▶)** — Xcode builds, signs with your Apple ID, and installs the app on your phone
4. First launch: on the phone, go to **Settings → General → VPN & Device Management** → trust your Apple ID

For a distributable IPA (to share or upload to TestFlight):
- Xcode menu: **Product → Archive**
- Window → Organizer → select the archive → **Distribute App** → pick destination (Ad Hoc / Development / TestFlight)

---

## Updating the apps

For **content / code changes** (anything in the Next.js app): just `git push` and `vercel deploy`. The app will pick up the new version on next launch because it's pointed at the live URL.

For **native changes** (icons, splash screen, new Capacitor plugins, app id rename):
```bash
cd apps/web
npx cap sync
```
Then rebuild APK / IPA from Android Studio / Xcode.

---

## Distribution paths (truly free)

**Android:**
- **Direct APK download** — host the `.apk` somewhere (Vercel Blob, S3, your website) and share the link. Users install with one tap (after enabling unknown sources).
- **Firebase App Distribution** — free, lets up to a few dozen testers self-install via a link/email.
- **Google Play Internal Testing** — needs ₹2,000 (~$25) one-time developer fee but then internal testing is free. Closer to a real-app feel.

**iOS:**
- **Sideload via Xcode** — fine for you + a few internal testers (Apple ID, 7-day signing).
- **TestFlight** — needs the $99/year Apple Developer account. There is no free TestFlight.
- **App Store** — same $99/year + review.

Nothing iOS-related is "free" in any real sense; budget the $99/year if you want public distribution.

---

## Caveats with the WebView approach

- **First load** needs internet — the app shows a blank/splash until Vercel responds. Subsequent navigations cache via the WebView, but cold start hits the network.
- **Push notifications** aren't wired up (Capacitor supports them via a separate plugin if you need them later).
- **Cookies persist** within the app's WebView, so session-based auth (Firebase phone OTP, admin/vendor sessions) work normally.
- **External links** (like a Razorpay payment page) open in the in-app browser by default — they can be tweaked to open in Safari/Chrome if needed.

For the wholesale trial scope (browse menu, place order, see status, WhatsApp goes to vendor) this WebView shell is functionally identical to running the site in mobile Safari/Chrome — just with a real home-screen icon and standalone window chrome.
