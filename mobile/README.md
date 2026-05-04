# FlyGift Mobile (Expo WebView Shell)

A thin React Native shell that hosts the FlyGift Next.js app inside a
hardened `react-native-webview`, exposing native capabilities (haptics,
secure storage, share sheet) through a typed bridge.

## Setup

```bash
cd mobile
npm install
npx expo start
# press "i" for iOS simulator, "a" for Android emulator
```

> Place `icon.png`, `adaptive-icon.png`, and `splash.png` (1024×1024) in `mobile/assets/`.

## Pointing at a different web URL

```bash
EXPO_PUBLIC_WEB_URL=http://192.168.1.42:3000 npx expo start
```

The default in [`app.json`](./app.json) is `https://app.flygift.com`.

## What the shell provides

| Capability      | Web call (`nativeBridge`)             | Native impl                                   |
|-----------------|----------------------------------------|-----------------------------------------------|
| Haptics         | `nativeBridge.haptic('success')`       | `expo-haptics` (impact + notification)        |
| Save JWT        | `nativeBridge.saveToken(jwt)`          | `expo-secure-store` (Keychain / EncryptedSP)  |
| Read JWT        | `nativeBridge.emit('getToken')`*       | replies via `flygift-bridge-message` event    |
| Logout          | `nativeBridge.logout()`                | clears SecureStore + reloads WebView          |
| Share           | `nativeBridge.share({ title, url })`   | RN `Share` API                                |

\* Add a `getToken()` helper on the web side when you need it.

## Detection contract

Every request sends header `x-flygift-client: mobile` (read by
`detectWebViewFromHeaders()` in SSR), and the user-agent includes
`FlyGiftApp/0.1 (Expo)`. On the client, the bridge sets
`window.__FLYGIFT_NATIVE__ = true` and dispatches the
`flygift-bridge-ready` event.
