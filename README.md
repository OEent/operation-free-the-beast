# IRONFANG: BEASTFIRE
Original dark-fantasy arcade game with adaptive enemies, six guns, infernal beast transformation and offline-friendly canvas rendering.

## Play / develop
```sh
npm install
npm run dev
npm run build
```
Main build is a static browser game, hosted for free through GitHub Pages. Keyboard: arrows/WASD to move, SPACE jump, J melee, K shoot, Q cycle weapons, E transform, L special, SHIFT dash. Landscape mobile touch controls are generated automatically.

## Native mobile app roadmap
This project uses **Capacitor**, an open-source web-to-native wrapper, to avoid rebuilding our canvas engine. The native Android and iOS projects must first be created locally with the free platform toolchains:
```sh
npm install
npx cap add android
npm run mobile:android
npx cap open android
```
On a Mac with Xcode installed:
```sh
npx cap add ios
npm run mobile:ios
npx cap open ios
```
Android Studio and Xcode compile and sign the native package. No native binary is committed yet. Do not publish/store-list until thoroughly testing real devices, adding store artwork, privacy policy, player support, age ratings and compliant monetization.

## Monetization design
Keep the game playable without payment. Monetization can later use cosmetic skins, optional expansion packs, or rewarded ads if implemented with explicit player consent and platform compliant SDKs. **No ad SDK, purchases or tracking are included yet.** Test player retention before adding any monetization.
