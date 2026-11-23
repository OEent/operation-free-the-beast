## IRONFANG 3.3 — Mobile thumbstick + illustrated beast art

**Lovable is not used by this update.** GitHub is the source of truth, building the web game and Android test APK independently.

- Mobile D-pad replaced with a floating analog joystick: touch anywhere in the lower-left movement region, drag in any direction, and let go to stop. Works while holding FIRE/SLASH with your other thumb. Magnitude controls speed, not merely direction; keyboard and physical gamepads still work.
- Four smoother, newly drawn illustrative SVG beasts now replace the polygon-built monsters in the runtime: Inferno Hound (quadruped), Storm Drake (winged dragon), Moonfang (upright werewolf), Arcane Titan (kaiju). Their artwork is cached and animated with movement/special effects, and the original renderer remains a fallback.
- The game's **LOAD HD BEAST ART** option is shown on the title and pause menus. Select the original high-detail beast PNG/WebP images (named `inferno_hound`, `storm_drake`, `moonfang_werebeast`, `arcane_titan`). These replace the built-in illustrations *inside gameplay* and save locally via IndexedDB for that device. Select all four together. RESET ART removes custom skins. No account, credits, or upload to a server is required.
- The original detailed concept art is not bundled in GitHub yet. Until added to the repository as production assets, the built-in smooth SVG illustrations appear by default. Even custom still images only get modest motion; full walk/attack frame animations remain a separate future art pipeline.

# IRONFANG: BEASTFIRE — ASCENSION (Version 3.0)

Free-to-play arcade belt-scroller prototype with original hand-coded fantasy artwork, depth-lane movement, huge melee attacks, eight gun classes, challenge rewards, three combat arenas, and four transformative beast powers.

**Play:** https://oeent.github.io/operation-free-the-beast/

**3.1 (exploration update):** Waves are limited to 2/4/6 active enemies, and new encounters only start when you advance down the road. Beast form is randomly selected on every transformation, never the same one twice in a row. Three breakable alchemist shops award random gun upgrades plus magic potions or arcane bombs. Trees, towers and shop rooftops have jump-to-land platforms. Combat breaks deliberately leave room to explore.

**Development repository:** https://github.com/OEent/operation-free-the-beast

## 3.2 — Animated Combat / Mobile Test Build

The running game now uses articulated character animation driven by movement and combat state (not a concept-image slideshow). The storm knight has independent gait/leg movement, flowing cape, weapon recoil, slash windup/follow-through, sky-blue slash arcs, jump poses, and dash afterimages. Holding the melee button queues combos automatically for mobile. Successful melee hits add brief arcade hit-stop, enemy stagger and impact bursts. The four beast bodies now respond to locomotion as well. These are procedural in-game character rigs and animations; the high-resolution illustrated concept sheets are **not** yet converted to production sprite atlases.

- Live web game: https://oeent.github.io/operation-free-the-beast/
- Installable Android test APK: download the latest successful `Build Android test APK` artifact from GitHub Actions.
- Browser tests verify movement-driven animation states, combo buffering, and the older combat mechanics.
- Future production graphics milestone: art-direct and rig actual high-resolution sprite assets, then optimize for mobile performance.

## What's new in 3.0
- Side-scrolling 2.5D battlefield: move LEFT, RIGHT, UP and DOWN on the road; characters overlap based on their lane depth.
- 3 chapters: Shattered Road, Witchfire Marsh, Obsidian Forge. Three combat-lock arenas with 2/4/6 enemy waves and rewards; Void Colossus finale. More roadside shops, trees, towers, jumpable ledges and downtime for exploration.
- Widened melee combos, area knockback, greater reach; the boss and elites have distinct stats.
- Eight switchable guns: Ranger, Storm SMG, Scattergun, Rail Lance, Inferno, Homing Rocket, Arc Caster, Frost Burst. Auto-aim helps find targets; pickups level guns up.
- Smash destructible loot chests and breakable alchemist shops, or shoot floating rune targets for ammo, gun caches, temporary shields, health, magic potions, bombs, and beast fury.
- Four randomized beast transformations (~28 seconds): Inferno Hound, Storm Drake, Moonfang, and Arcane Titan. A different beast is chosen for each activation and none repeats immediately. Forms have different anatomies, power, speed and projectile properties.
- Original drawn monsters and scenery, particle explosions, glow, camera shake, scoring and local high score.
- Landscape touch controls are auto-created in mobile browser and native app.

## Controls

| Action | Keyboard | Mobile |
| --- | --- | --- |
| Move in the road | WASD / arrows | On-screen D-pad |
| Attack with wide melee | J | CLAW |
| Shoot / auto-aim | K (hold) | FIRE (hold) |
| Switch gun | Q | GUN |
| Beast roulette | E (randomizes when activated) | BEAST |
| Transform (requires 40 energy) | E | BEAST |
| Magic shockwave / potion strikes | L | BLAST |
| Arcane bomb | F (after collecting bombs) | BOMB |
| Jump | Space | JUMP |
| Dash | Shift | DASH |
| Pause | P | Pause |
| Start/replay | Enter | START |

## Developer quick start

```sh
npm install
npm run dev
npm run build
npx tsc --noEmit -p tsconfig.arena.json
```

Game 3.0 is in `src/game/arena.ts` and the original procedural renderer is `src/game/arena-art.ts`. The previous Lovable-derived platform engine is preserved as `src/game/engine.ts` for rollback. `src/game/standalone.ts` selects which engine starts.

### Android APK
GitHub Actions automatically builds an Android debug APK after code pushes. Download the artifact named `ironfang-beastfire-android-debug-apk` from successful **Build Android test APK** runs. These debug builds are for development/testing, not signed Play Store releases.

To build Android locally:
```sh
npm install
npx cap add android
npm run mobile:android
npx cap open android
```

For iOS, use a Mac with Xcode:
```sh
npx cap add ios
npm run mobile:ios
npx cap open ios
```

### Publishing and monetization
No paid loot boxes, ads, purchases, tracking SDKs, or monetization code are installed. Loot crates use in-game combat rewards, no cash. If monetized later, favor cosmetic items and optional content, avoid manipulative mechanics, and meet the relevant store's testing, privacy, disclosure, age-rating and billing policies.

## License and safety
Game characters, names, levels, and procedural artwork here were newly authored for IRONFANG. No sprites, trademarks or copyrighted soundtracks were extracted from any existing arcade franchise. The app relies on permissive/open-source web tooling (Vite, TypeScript and Capacitor) and native platform build tools. Inspect dependency and asset licenses before introducing external packages or art.

## Development status
Web/Android builds are run automatically in GitHub Actions; a successful build checks compilation, **not** whether combat is bug-free or the performance feels polished on a real phone. Player feedback, gameplay balancing, device testing, reliable saves, polished sprite sheets and store-ready packaging remain future milestones.
