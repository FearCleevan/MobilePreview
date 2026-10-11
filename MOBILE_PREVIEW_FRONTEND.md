# LazDev Device Preview: Frontend Implementation (Reviewed & Corrected)

> **Status:** Reviewed 2026-10-11. Corrections are applied inline and summarized in the Review Changelog below.
> **Backend:** `MOBILE_PREVIEW_BACKEND.md` (reviewed and corrected; it is the authority for IPC). Every `B5/B8/B9/B10` reference here maps to that file's Integration Map. See "Backend Contract" before Execution Protocol.

---

## Review Changelog (what was wrong and what changed)

### Blocking / correctness
| # | Issue in original | Correction |
|---|---|---|
| 1 | **Feasibility.** RN and Flutter *native* apps cannot render in a `<webview>`/`<iframe>`. `localhost:8081` (Metro) only serves a page for Expo web / react-native-web. Flutter needs a web target. Plain "Dart" has no UI. | New **Framework Feasibility** section. Preview source is a **web target URL** (Expo web, RN-web, `flutter run -d web-server`, `dart` web via `webdev`) or, later, an emulator stream. "Dart" is renamed "Dart (web)". |
| 2 | **Rotation.** "Rotate the frame via CSS, keep the WebView unrotated" is contradictory. A CSS rotate also rotates the WebView, and CSS never changes the viewport size the app sees. | Orientation **swaps logical width/height** and uses a landscape frame variant. The WebView gets the swapped viewport, with no CSS rotation of content. |
| 3 | **Snapshot.** `html-to-image` cannot rasterize `<iframe>`/`<webview>` content, so snapshots would capture bezels only. | Frontend mock captures bezel + placeholder content only, with a visible note. Real capture uses `webContents.capturePage` composited onto the frame (B9). |
| 4 | **Recording.** `capturePage` loops can't hold 60 fps at physical resolution, and MP4 needs an encoder. | Record at **logical resolution** (not physical), 15/24/30 fps max for MVP, output WebM via `MediaRecorder` and optional ffmpeg → MP4 in backend. 60 fps removed. |
| 5 | **Registry data errors.** Galaxy S24 Ultra: `devicePixelRatio: 3` with `physicalWidth: 1440` is inconsistent (1440 ÷ 384 = **3.75**). `physical` must equal `screen × DPR`. | Fixed to 3.75 → 384×832. Added registry **invariant test** (`physical = screen × DPR`, ±1px). |
| 6 | **Registry is not buildable.** `{ id: ..., /* ... */ } as unknown as DevicePreset` defeats type safety, and `iphone-15-pro-max`, `ipad-pro-11` used by mocks don't exist. | Casts banned. Added **Required Device IDs** table. Mock panes may only reference IDs in the table. |
| 7 | **Frame mapping wrong.** `iphone-notch` listed "11, 12, 13 (non-Pro)" which omits 12/13 Pro/Pro Max and iPhone 14/14 Plus (all notch). Pixel 8 punch-hole is **center**, not left (left was Pixel 4a). | Mapping rewritten. `pixel-punchhole` is center, so `punch_hole_left` is dropped from the Pixel 8+ presets. |
| 8 | **`mockPanes` doesn't match `Pane` type** (`zoom` vs `zoomMultiplier`, missing `showBezel/showSafeArea/pinned`, `orientation` widened to `string`). | Mock typed as `Pane[]`. |
| 9 | **`fitScale` ignores orientation, bezel thickness and zoom override.** | New signature (below). |
| 10 | **Phase dependency cycle.** Phase 1 toolbar needs the store (Phase 3), Phase 2 "Add" needs the store, Phase 2 cards need frame SVGs (Phase 4). | Stores are created in **Pre-Phase**. Phase 2 uses a simple CSS silhouette thumbnail, upgraded in Phase 4. |
| 11 | **Nothing is scaffolded.** Phase 1 says MODIFY `main.tsx` / `globals.css` that don't exist; "match `globals.css`" refers to nothing. | New **Phase 0: Scaffold**. |
| 12 | **Settings inconsistency.** Phase 1 says modal, Phase 10 says MODIFY `SettingsPage.tsx` (never created). | Single `SettingsDialog.tsx`, no page. |

### Security items (must be answered, see Blocking Questions)
`disablewebsecurity` + `allowpopups` (and the latter contradicts "block popups"), `persist:` partitions keyed by random UUID leaking storage, `<webview>` itself being discouraged by Electron, and sync replaying clicks into arbitrary apps.

### Conflicts and polish
- Shortcuts: `Ctrl+Shift+R` (Chromium hard reload) and `Ctrl+Shift+C` (inspect element) collide with Electron defaults. `Tab` as "cycle pane" breaks keyboard accessibility. `Ctrl+0` is conventionally zoom reset. Single-key shortcuts (`R`, `[`, `]`, `Delete`) fire while typing in the previewed app.
- Sync groups named A/B/C collide with Compare "A/B".
- Removed unused deps (Recharts, Data-Router-only features). Added deps actually required (`@dnd-kit`, `jszip`).
- Added missing: console drawer, Design Direction, UI states with real copy, reduced-motion/focus/min-window quality floor, **Integration Audit** phase.
- Repaired broken markdown (unclosed code fence, diagrams outside fences).

---

## Blocking Questions (answer before Phase 0)

1. **Preview source.** Is v1 web-target only (Expo web / RN-web / Flutter web), with emulator streaming (scrcpy) as a later backend phase? *(Recommended: yes.)* Otherwise the "RN/Flutter native" premise isn't deliverable via WebView.
2. **Electron embedding.** Electron discourages `<webview>`. Use `<webview>` (needs `webviewTag: true`, simplest) or `WebContentsView` (more robust, needs main-process layout sync)? *(Recommended: `<webview>` for v1 with hardened settings below.)*
3. **Security shortcuts (webview).** `disablewebsecurity` makes the preview behave differently from production (CORS). Make it **off by default, opt-in per project**? `allowpopups` removed? *(Recommended: yes to both.)*
4. **Owner/Guest mode.** In a single-user app with no auth, this is a UI toggle, not access control. Keep as "Presentation Mode" (hides destructive/devtools actions for client demos)? *(Recommended: rename and keep.)*
5. **Design Direction signature element** (see section below) needs your pick.
6. **iPhone 17/18 specs.** The 17-series values below are best-known; the 18 series needs verification against what actually shipped in 2026 before adding.

---

## Overview

Windows desktop application (Electron host, React renderer) that previews a project across multiple simulated device frames at once (iPhone 11 → latest, Samsung S24 series, Pixel, iPad, custom). Peter Paul Lazan (FearCleevan) uses it to review client work on every target device in one window instead of juggling Android Studio, Xcode and DevTools emulation tabs.

### Framework Feasibility (read first)

| Project type | What can be previewed in a WebView | Notes |
|---|---|---|
| Expo (RN) | Expo web (`expo start --web`, Metro, default `:8081`) | Needs `react-native-web`. Native-only modules won't render. |
| Bare React Native | Only if react-native-web is configured | Otherwise needs emulator stream (backend, later). |
| Flutter | `flutter run -d web-server --web-port <p>` | Flutter web ≠ native rendering (fonts/plugins differ). |
| Dart (web) | `webdev serve` | Plain Dart CLI has no UI, so it's out of scope. |
| Web / Custom URL | Any URL | |

The Project Panel must tell the user plainly when a project has no web target ("This project can't render in a pane yet: no web target found").

### Stack (matches Brisk CRM conventions)
- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui + Radix UI
- Zustand (state, `persist` middleware for settings)
- React Hook Form + Zod
- Sonner (toasts)
- `@dnd-kit/core` + `@dnd-kit/sortable` (pane reorder, keyboard-accessible)
- `html-to-image`, `jszip` (Phase 9)
- Electron (host shell, see `MOBILE_PREVIEW_BACKEND.md`)
- *Removed:* Recharts (no charts are specified anywhere), React Router Data Router (single-window app; use plain component state + dialogs)

### Features
App shell + sidebar + toolbar · Device library · Multi-pane grid · Device frame renderer · Preview pane (WebView host) · Pane toolbar · Project connection panel · Compare & sync · Screenshot/export/recording · Settings/themes/shortcuts.

> ⚠️ **All phases use mock device data and mock project sessions only.** Backend wiring (Electron main process, ADB, CDP, dev-server spawn) happens in `MOBILE_PREVIEW_BACKEND.md` after ALL frontend phases are complete. **Stop and report after each phase. Do not proceed without explicit "Yes, Proceed."**

---

## Design Direction

> **Status: needs your decision.** This is an internal tool that inherits Brisk CRM / shadcn tokens, but the plan requires a deliberate direction.

- **Color:** inherit existing CSS custom properties from Brisk CRM `globals.css` (4–6 named tokens to be extracted in Phase 0), plus **bezel tokens**: `--bezel-dark #1a1a1a`, `--bezel-light #d4d4d8`, `--bezel-highlight rgba(255,255,255,0.08)`, `--safe-area-overlay rgba(255,0,0,0.15)`.
- **Type:** UI face from Brisk CRM, **mono utility face** for dimensions/IDs (`390 × 844 @3x`). No display face needed for a tool.
- **Layout concept:** dense dark canvas; devices are the visual subject, chrome stays recessive.
- **Signature (proposal, pick one):** (a) a **dot-grid canvas with device-true scale ruler**; (b) **live "viewport readout" chips** pinned to each frame corner. Everything else stays disciplined.
- **Avoids:** cream-bg/serif/terracotta, near-black + single neon accent, broadsheet hairline columns. Note that "near-black canvas" is functional here, so the accent must not be a single neon.
- **Quality floor (all phases):** responsive down to a **min window of 960×600**, visible keyboard focus, `prefers-reduced-motion` respected (no pane animations when set).

---

## Pre-Phase: Shared Utilities, Types and Stores

Create before Phase 1: `device-registry.ts`, `preview-utils.ts`, `previewStore.ts`, `projectStore.ts`, `settingsStore.ts` (skeletons), `mocks/*`.

### `shared/device-registry.ts` (moved from `src/lib/`; imported as `@shared/device-registry`)

Single source of truth. **Never hardcode device dimensions elsewhere.** Do **not** use `as unknown as DevicePreset`; every entry is a complete object.

```typescript
export type DeviceBrand = 'Apple' | 'Samsung' | 'Google' | 'Xiaomi' | 'OnePlus' | 'Custom'
export type DeviceCategory = 'phone' | 'tablet' | 'foldable' | 'desktop'

export type NotchType =
  | 'none' | 'notch' | 'dynamic_island'
  | 'punch_hole_center' | 'punch_hole_left' | 'teardrop'

export interface SafeAreaInsets { top: number; bottom: number; left: number; right: number }

export type FrameSvgId =
  | 'iphone-notch' | 'iphone-dynamic-island' | 'iphone-classic'
  | 'samsung-punchhole' | 'pixel-punchhole' | 'ipad-bezel'
  | 'pixel-foldable' | 'custom-bezel'

export interface DevicePreset {
  id: string                     // stable slug e.g. "iphone-15-pro-max"
  brand: DeviceBrand
  name: string
  category: DeviceCategory
  releaseYear: number
  screenWidth: number            // CSS px, PORTRAIT logical width
  screenHeight: number           // CSS px, PORTRAIT logical height
  devicePixelRatio: number
  physicalWidth: number
  physicalHeight: number
  diagonalInches: number
  ppi: number
  notchType: NotchType
  cornerRadius: number           // CSS px
  safeArea: SafeAreaInsets       // PORTRAIT insets; use rotateInsets() for landscape
  hasHomeIndicator: boolean
  hasPhysicalBezel: boolean
  frameSvgId: FrameSvgId
  userAgent?: string
  defaultOrientation: 'portrait' | 'landscape'
  tags: string[]
}
```

**Reference entries (corrected):**

```typescript
{ id: 'iphone-11', brand: 'Apple', name: 'iPhone 11', category: 'phone', releaseYear: 2019,
  screenWidth: 414, screenHeight: 896, devicePixelRatio: 2, physicalWidth: 828, physicalHeight: 1792,
  diagonalInches: 6.1, ppi: 326, notchType: 'notch', cornerRadius: 41,
  safeArea: { top: 48, bottom: 34, left: 0, right: 0 }, hasHomeIndicator: true, hasPhysicalBezel: true,
  frameSvgId: 'iphone-notch', defaultOrientation: 'portrait', tags: ['notch'] },

{ id: 'galaxy-s24', brand: 'Samsung', name: 'Galaxy S24', category: 'phone', releaseYear: 2024,
  screenWidth: 360, screenHeight: 780, devicePixelRatio: 3, physicalWidth: 1080, physicalHeight: 2340,
  diagonalInches: 6.2, ppi: 416, notchType: 'punch_hole_center', cornerRadius: 32,
  safeArea: { top: 32, bottom: 24, left: 0, right: 0 }, hasHomeIndicator: true, hasPhysicalBezel: true,
  frameSvgId: 'samsung-punchhole', defaultOrientation: 'portrait', tags: ['android', 'flagship'] },

// CORRECTED: DPR 3.75 (1440/384), height 832 (3120/3.75)
{ id: 'galaxy-s24-ultra', brand: 'Samsung', name: 'Galaxy S24 Ultra', category: 'phone', releaseYear: 2024,
  screenWidth: 384, screenHeight: 832, devicePixelRatio: 3.75, physicalWidth: 1440, physicalHeight: 3120,
  diagonalInches: 6.8, ppi: 505, notchType: 'punch_hole_center', cornerRadius: 26,
  safeArea: { top: 36, bottom: 28, left: 0, right: 0 }, hasHomeIndicator: true, hasPhysicalBezel: true,
  frameSvgId: 'samsung-punchhole', defaultOrientation: 'portrait', tags: ['android', 'flagship', 's-pen'] },
```

**Required Device IDs** (screen CSS px portrait @ DPR). Sizes below are best-known values; verify safe areas and the 2025+ rows against Apple/Google specs before committing:

| ID | Logical | DPR | Notch | Frame |
|---|---|---|---|---|
| iphone-11, iphone-11-pro-max | 414×896 | 2 / 3 | notch | iphone-notch |
| iphone-12-mini, iphone-13-mini | 375×812 | 3 | notch | iphone-notch |
| iphone-12, 12-pro, 13, 13-pro, 14 | 390×844 | 3 | notch | iphone-notch |
| iphone-12-pro-max, 13-pro-max, 14-plus | 428×926 | 3 | notch | iphone-notch |
| iphone-14-pro, 15, 15-pro, 16 | 393×852 | 3 | dynamic_island | iphone-dynamic-island |
| iphone-14-pro-max, 15-plus, 15-pro-max, 16-plus | 430×932 | 3 | dynamic_island | iphone-dynamic-island |
| iphone-16-pro, 17, 17-pro | 402×874 | 3 | dynamic_island | iphone-dynamic-island |
| iphone-16-pro-max, 17-pro-max | 440×956 | 3 | dynamic_island | iphone-dynamic-island |
| iphone-se-3 | 375×667 | 2 | none | iphone-classic |
| galaxy-s24, galaxy-s24-ultra, galaxy-s24-plus | see above | 3 / 3.75 | punch_hole_center | samsung-punchhole |
| pixel-8 | 412×915 | 2.625 | punch_hole_center | pixel-punchhole |
| pixel-9 | 412×923 | 2.625 | punch_hole_center | pixel-punchhole |
| pixel-fold | outer + inner (verify) | n/a | punch_hole_center | pixel-foldable |
| ipad-pro-11 | 834×1194 | 2 | none | ipad-bezel |
| ipad-pro-13 | 1024×1366 | 2 | none | ipad-bezel |
| ipad-air-11 | 820×1180 | 2 | none | ipad-bezel |

iPhone 18 series: **do not add until specs are verified.**

> **Registry invariants (unit-tested in Phase 0):** unique `id`; `frameSvgId` ∈ `FrameSvgId`; `|physicalWidth − screenWidth × DPR| ≤ 1`; same for height; `safeArea.top + safeArea.bottom < screenHeight`; every ID used in `src/mocks/` resolves.

### `src/lib/preview-utils.ts`

```typescript
import type { DevicePreset, SafeAreaInsets, Orientation } from '@shared/device-types'
import { viewportFor, rotateInsets } from '@shared/viewport'   // canonical (also used by Electron main for CDP)
export { viewportFor, rotateInsets }
export type { Orientation }

export const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))
export const presetById = (id: string, list: DevicePreset[]) => list.find((d) => d.id === id)

// viewportFor() and rotateInsets() live in shared/viewport.ts (portrait→landscape swaps width/height; rotateInsets maps top→right, right→bottom, bottom→left, left→top).

/**
 * Auto-fit scale (excludes user zoom). Accounts for orientation + bezel thickness.
 * Final render scale = fitScale * pane.zoomMultiplier.
 * Capped at 1 so the app never renders blurry upscaled; pass allowUpscale for presentations.
 */
export const fitScale = (
  device: DevicePreset, orientation: Orientation,
  paneW: number, paneH: number,
  opts: { padding?: number; bezel?: number; allowUpscale?: boolean } = {},
): number => {
  const { padding = 24, bezel = device.hasPhysicalBezel ? 14 : 0, allowUpscale = false } = opts
  const vp = viewportFor(device, orientation)
  const s = Math.min(
    (paneW - padding * 2) / (vp.width + bezel * 2),
    (paneH - padding * 2) / (vp.height + bezel * 2),
  )
  return Math.max(0.05, allowUpscale ? s : Math.min(s, 1))
}

export const safeAreaBoxShadow = (sa: SafeAreaInsets, o: Orientation = 'portrait') => {
  const r = rotateInsets(sa, o)
  return [
    `inset 0 ${r.top}px 0 0 var(--safe-area-overlay)`,
    `inset 0 -${r.bottom}px 0 0 var(--safe-area-overlay)`,
    `inset ${r.left}px 0 0 0 var(--safe-area-overlay)`,
    `inset -${r.right}px 0 0 0 var(--safe-area-overlay)`,
  ].join(', ')
}

export const formatDimensions = (d: DevicePreset) => `${d.screenWidth} × ${d.screenHeight} @${d.devicePixelRatio}x`
export const groupDevicesByBrand = (list: DevicePreset[]) =>
  list.reduce<Record<string, DevicePreset[]>>((acc, d) => { (acc[d.brand] ??= []).push(d); return acc }, {})
```

> Because CSS `transform: scale()` does not change layout size, each scaled frame must sit inside a wrapper sized to `(frame size × scale)`, otherwise grid cells overflow.

### Stores (skeletons created here)

```typescript
// src/store/previewStore.ts
export interface Pane {
  id: string
  deviceId: string
  orientation: 'portrait' | 'landscape'
  zoomMultiplier: number   // 0.25–2.0
  url: string
  showBezel: boolean
  showSafeArea: boolean
  pinned: boolean
  syncGroup: 1 | 2 | 3 | null   // renamed from A/B/C to avoid collision with Compare A/B
}

export interface PreviewState {
  panes: Pane[]
  gridMode: '1x1' | '2x1' | '2x2' | '3x2' | 'masonry'
  activePaneId: string | null
  frameMode: 'on' | 'off' | 'auto'   // auto = bezel hidden when effective scale < 0.35
  addPane: (deviceId: string) => void
  removePane: (id: string) => void
  duplicatePane: (id: string) => void
  swapPanes: (a: string, b: string) => void
  reorderPanes: (from: number, to: number) => void
  updatePane: (id: string, patch: Partial<Pane>) => void
  setActivePane: (id: string | null) => void
  setGridMode: (m: PreviewState['gridMode']) => void
  reloadAll: () => void              // increments reloadToken; pinned panes skipped
  reloadToken: number
}
```

- `projectStore`: `session`, `setSession`, `devServerStatus`.
- `settingsStore` (persisted): `theme`, `bezelStyle`, `shortcuts`, `customDevices`, `pinnedDeviceIds`, `recentDeviceIds` (max 5), `appMode`.
- Grid rule: if panes exceed the mode's cell count, the grid **scrolls vertically** and shows an "N of M visible" chip. It never silently hides panes.

### Mocks (`src/mocks/`)

```typescript
// mockProject.ts
export const mockProjectSession = {
  id: 'sess-1', framework: 'react-native' as const, name: 'brisk-mobile',
  rootPath: 'C:\\dev\\brisk-mobile', devServerUrl: 'http://localhost:8081',
  status: 'connected' as const, detectedAt: '2026-06-17T10:00:00Z',
}

// mockPanes.ts: typed so it can't drift from Pane
import type { Pane } from '@/store/previewStore'
export const mockPanes: Pane[] = [
  { id: 'p1', deviceId: 'iphone-15-pro-max', orientation: 'portrait',  zoomMultiplier: 1,   url: 'http://localhost:8081', showBezel: true, showSafeArea: false, pinned: false, syncGroup: null },
  { id: 'p2', deviceId: 'galaxy-s24-ultra',  orientation: 'portrait',  zoomMultiplier: 0.9, url: 'http://localhost:8081', showBezel: true, showSafeArea: false, pinned: false, syncGroup: null },
  { id: 'p3', deviceId: 'iphone-12',         orientation: 'landscape', zoomMultiplier: 0.8, url: 'http://localhost:8081', showBezel: true, showSafeArea: false, pinned: false, syncGroup: null },
  { id: 'p4', deviceId: 'ipad-pro-11',       orientation: 'portrait',  zoomMultiplier: 0.6, url: 'http://localhost:8081', showBezel: true, showSafeArea: false, pinned: false, syncGroup: null },
]
```

---

## Global UI Standards (All Phases)

**Design system:** shadcn/ui primitives only; CSS custom properties from `src/styles/globals.css` (created in Phase 0); full light/dark on every surface (bezel colors are **frame variants**, independent of the previewed app); Sonner for all notifications; React Hook Form + Zod for every settings form; device data **only** from `device-registry.ts`, helpers **only** from `preview-utils.ts`.

**Accessibility (every phase):**
- Every pane, chip, toolbar button, modal input has an `aria-label`.
- Grid uses **roving tabindex**: arrow keys move between panes, Enter focuses the pane's content, **Tab leaves the grid** (no Tab-cycling).
- Drag reorder has a keyboard alternative (`@dnd-kit` KeyboardSensor, or "Move left/right" in the pane menu).
- Modals trap focus and close on ESC.
- Status is never color-only (dot **plus** text label). Contrast ≥ 4.5:1 in both themes.
- Screen-reader text per pane: "Preview pane 2: iPhone 15 Pro Max, portrait, 100% zoom".
- `prefers-reduced-motion` disables shimmer/transitions.

**UI states (every component with data):**

| Surface | Loading | Empty | Error |
|---|---|---|---|
| Grid | n/a | "No preview panes yet. Add a device to see your app on every screen." [+ Add Device] | n/a |
| Pane | Shimmer + "Loading localhost:8081…" | "Connect a project to preview it here." | "Can't reach http://localhost:8081. Is your dev server running?" [Retry] [Open DevTools] |
| Device library | Skeleton cards | "No devices match 'pixle'. Clear filters or check spelling." | "Couldn't load device list. Reload the app." |
| Project panel | "Detecting framework…" | "No project connected. Choose a folder to begin." | "No web target found for this project. See Framework Feasibility." |
| Recent files | n/a | "No file changes yet." | n/a |

**Role model → "Presentation Mode" (pending Q4).** Single-user app, no RLS. A `useAppMode()` hook (`'owner' | 'presentation'`, persisted) gates UI only.

| Feature | Owner | Presentation |
|---|---|---|
| Manage projects / spawn dev servers | ✅ | none |
| Edit/create device presets | ✅ | none |
| Open DevTools | ✅ | none |
| Remove panes (destructive) | ✅ | none |
| Screenshot & record | ✅ | ✅ |
| Switch panes / zoom / rotate | ✅ | ✅ |

**Frontend simulation rules**

| Feature | Frontend behavior |
|---|---|
| Project connection | Static mock session in Zustand |
| Dev server spawn | "Connect" button, no real spawn |
| Hot reload | Manual "Reload All" |
| Emulator bridge | Status pill "Emulator: mocked" |
| Screenshot | `html-to-image` on the frame div; **captures bezel + placeholder only** (WebView content not rasterizable) |

---

## Phases Overview

| Phase | Feature | Complexity |
|---|---|---|
| 0 | Scaffold + registry + stores + mocks | Low |
| 1 | App Shell + Sidebar + Toolbar | Low |
| 2 | Device Library Browser | Low |
| 3 | Multi-Pane Preview Grid | High |
| 4 | Device Frame Renderer | High |
| 5 | Preview Pane (WebView host) | High |
| 6 | Pane Toolbar & Controls | Medium |
| 7 | Project Connection Panel | Medium |
| 8 | Compare & Sync | Medium |
| 9 | Screenshot / Export / Recording | Medium |
| 10 | Settings, Themes, Shortcuts | Low |
| 11 | **Integration Audit** | Low |

**Per-phase gate:** `npx tsc --noEmit` **and** `npm run build` must both pass with zero errors before reporting complete. End each Phase Report with **"Commit this phase? (y/n)"**.

---

## Phase 0: Scaffold & Pre-Phase

**Goal:** Runnable empty app plus all shared utilities.

- `npm create vite@latest` (react-ts), Tailwind, shadcn/ui init, `@/` alias, strict TS.
- Install: `zustand sonner react-hook-form zod @hookform/resolvers @dnd-kit/core @dnd-kit/sortable html-to-image jszip`.
- Extract tokens from Brisk CRM into `globals.css`, add bezel tokens.
- Create registry, utils, stores, mocks, plus Vitest invariant test for the registry.

```text
CREATE: shared/{device-types,device-registry,device-schema,viewport,session-schema,ipc-types}.ts   (canonical; @shared/* alias)
CREATE: src/lib/preview-utils.ts (re-exports viewportFor/rotateInsets), src/lib/bridge.ts
CREATE: src/store/previewStore.ts, projectStore.ts, settingsStore.ts
CREATE: src/mocks/mockProject.ts, mockPanes.ts
CREATE: src/styles/globals.css
CREATE: src/lib/__tests__/device-registry.test.ts
```

## Phase 1: App Shell + Sidebar + Toolbar

**Goal:** Window chrome: left sidebar, top toolbar, canvas placeholder.

```text
┌───────────────────────────────────────────────────────────────┐
│ Toolbar: [☰]  LazDev Preview   ● Connected · RN  [⚙]          │
├──────────┬────────────────────────────────────────────────────┤
│ Sidebar  │                                                    │
│ Brand:   │            Main Canvas (Phase 3 target)            │
│ Apple    │                                                    │
│ Samsung  │                                                    │
│ Google   │                                                    │
│ Custom   │                                                    │
│ ───────  │                                                    │
│ Recent   │                                                    │
│ Pinned   │                                                    │
└──────────┴────────────────────────────────────────────────────┘
```

**Sidebar:** brand filter chips (multi-select: Apple/Samsung/Google/Custom, *not* "Pixel"/"iPad", which are models, not brands); search by name; category toggle (Phones / Tablets / Foldables / All); Recent (last 5); Pinned (starred). Recent/Pinned persist via `settingsStore`.

**Toolbar:** project status pill (framework + dot **and text**), **+ Add Pane** (opens Phase 2), **⟳ Reload All** (store `reloadAll`), **🖼 Frame On/Off/Auto** (store `frameMode`), **⌗ Grid Layout** (store `gridMode`), **📷 Snapshot All** (disabled until Phase 9), **⚙ Settings** (opens `SettingsDialog`, stub until Phase 10).

```text
CREATE: src/App.tsx, src/layouts/{AppShell,Sidebar,Toolbar,MainCanvas}.tsx
MODIFY: src/main.tsx (mount AppShell)
MODIFY: src/styles/globals.css (bezel tokens, if not done)
```

## Phase 2: Device Library Browser

**Goal:** Drawer/modal to add a device as a pane or swap a pane's device.

Left: filters (shared with sidebar via `useDeviceFilter`). Right: card grid.

```text
┌───────────────────────┐
│  [silhouette thumb]   │  ← simple CSS shape in Phase 2; real frame in Phase 4
│  iPhone 15 Pro Max    │
│  430 × 932 @3x        │
│  6.7" · 460 ppi       │
│  Dynamic Island       │
│  [Add]  [Swap into ▾] │
└───────────────────────┘
```

Controls: sort (Release year ↓ | Name A–Z | Screen size ↑); multi-select → "Add N panes"; search over name/brand/tags/releaseYear. **"Only show devices that fit current grid" is removed** (undefined; a pane can always scale down).

Swap: popover lists current panes, selection updates `pane.deviceId`, toast "Pane 2 → iPhone 15 Pro (Dynamic Island)". Adding updates `recentDeviceIds`.

```text
CREATE: src/components/devices/{DeviceLibrary,DeviceCard,DeviceFilters,DevicePickerPopover}.tsx
CREATE: src/hooks/useDeviceFilter.ts
```

## Phase 3: Multi-Pane Preview Grid

**Goal:** Add, remove, reorder panes in selectable grid layouts. *(Original "resize panes" is dropped: panes are sized by grid cell, and per-pane size is controlled via `zoomMultiplier` in Phase 6.)*

| Mode | Layout |
|---|---|
| 1×1 | single, fills canvas |
| 2×1 | two side by side |
| 2×2 | four quadrants |
| 3×2 | two rows of three |
| masonry | auto-flow |

- `PaneContainer` computes `fitScale(device, orientation, cellW, cellH) × zoomMultiplier` (cell size from `ResizeObserver`).
- Drag handle (thin top strip) via `@dnd-kit`; drop swaps/reorders. Keyboard reorder supported.
- Overflow rule per Pre-Phase. Roving-tabindex arrow navigation.
- Removing a pane: toast with **Undo** (5 s), no confirm dialog.

```text
CREATE: src/components/preview/{PreviewGrid,PaneContainer,PaneDragHandle,GridModeSelector}.tsx
CREATE: src/hooks/useGridLayout.ts
MODIFY: src/store/previewStore.ts (implement remaining actions)
```

## Phase 4: Device Frame Renderer (SVG/CSS)

**Goal:** Pixel-accurate bezels, pure SVG + CSS, light and dark variants for every preset. Also replaces Phase 2's silhouette thumbnails.

```text
┌─────────────────────────────────────────┐
│            outer bezel                  │  ← cornerRadius
│  ┌───────────────────────────────────┐  │
│  │     screen (WebView host)         │  │
│  │  ┌─────┐  island / notch          │  │
│  │     [gesture bar]                 │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

```typescript
export interface FrameRendererProps {
  device: DevicePreset
  orientation: 'portrait' | 'landscape'
  theme: 'light' | 'dark'
  showSafeArea: boolean
  showBezel: boolean
  children: React.ReactNode   // WebView
}
```

**Frame variants (corrected mapping)**

| frameSvgId | Devices | Features |
|---|---|---|
| iphone-notch | iPhone 11, 12, 13 (all), **14 / 14 Plus** | Wide notch, home indicator |
| iphone-dynamic-island | iPhone 14 Pro/Pro Max, 15–17 (all), 18 once verified | Pill island |
| iphone-classic | iPhone SE, 8 | Square corners, home button |
| samsung-punchhole | Galaxy S24 series | Center punch-hole, thin bezel |
| pixel-punchhole | Pixel 8+ | **Center** punch-hole |
| ipad-bezel | iPad Pro / Air | Uniform bezel, no notch |
| pixel-foldable | Pixel Fold | Outer/inner screen toggle |
| custom-bezel | Custom | Plain rounded rect |

**Rendering rules**
- Bezel `#1a1a1a` (dark) / `#d4d4d8` (light) via tokens; 1px inner highlight gradient.
- Screen background black until WebView paints.
- Safe-area overlay: dashed red, `pointer-events:none`, uses `rotateInsets`.
- **Orientation:** swap `viewportFor()` width/height, render the **landscape variant** (island/notch on the side, home indicator on the long bottom edge). **No CSS rotate of the screen content.** Animate between orientations with a crossfade, skipped under reduced motion.
- Scaled frames use the sized-wrapper pattern noted in `preview-utils`.

```text
CREATE: src/components/frames/FrameRenderer.tsx, SafeAreaOverlay.tsx, Notch.tsx, HomeIndicator.tsx
CREATE: src/components/frames/variants/{IphoneNotch,IphoneDynamicIsland,IphoneClassic,SamsungPunchHole,PixelPunchHole,IpadBezel,PixelFoldable,CustomBezel}.tsx
MODIFY: src/components/devices/DeviceCard.tsx (use real mini frame)
```

## Phase 5: Preview Pane (WebView Host)

**Goal:** Live surface rendered inside the Phase 4 frame.

| Mode | When | Tag |
|---|---|---|
| electron | Inside Electron | `<webview>` |
| iframe | `npm run dev` in a browser | `<iframe sandbox="allow-scripts allow-same-origin">` |
| placeholder | No project connected | Static "Connect a project" card |

> **iframe-mode limits (show a one-line notice in the UI):** cannot set user-agent, emulate DPR, or emulate touch. It is a layout-only approximation.

Layers (bottom → top): black background → WebView (URL = `pane.url || session.devServerUrl`, laid out at `viewportFor()` size, then scaled) → safe-area overlay → loading shimmer → error overlay → **console drawer** (bottom, shared; was referenced but never defined).

**Electron webview attributes (hardened; pending Q2/Q3)**

```text
<webview
  src={url}
  partition={`pane-${pane.id}`}   // non-persistent (no "persist:" prefix) so nothing accumulates on disk
  useragent={device.userAgent}
  // disablewebsecurity: OFF by default, per-project opt-in
  // allowpopups: REMOVED (contradicts the "block popups" behavior)
/>
```

| Event | Behavior |
|---|---|
| did-start-loading | Show shimmer |
| did-stop-loading | Hide shimmer |
| did-fail-load | Error overlay |
| console-message | Append to console drawer |
| new-window | Block, toast "Popup blocked in pane" |
| dom-ready | Apply device emulation (backend B8, using CDP `Emulation.setDeviceMetricsOverride`) |

Frontend dev mode uses the placeholder/iframe; webview behavior is stubbed.

```text
CREATE: src/components/preview/{PreviewPane,PreviewHostWebview,PreviewHostIframe,PreviewPlaceholder,PreviewErrorOverlay,ConsoleDrawer}.tsx
CREATE: src/hooks/{usePreviewHostMode,useWebviewEvents}.ts
```

## Phase 6: Pane Toolbar & Controls

Floating per-pane toolbar, top-right inside the frame, auto-hides after 2 s idle unless pane is active **or contains keyboard focus**.

| Icon | Action |
|---|---|
| ↻ | Reload this pane |
| ⤢ | Rotate (portrait ↔ landscape) |
| 🔍 − / + | Zoom 0.25 → 2.0, 0.05 steps |
| 1:1 | Reset `zoomMultiplier = 1` |
| 🖼 | Per-pane bezel override |
| ▢ | Toggle safe-area overlay |
| 📌 | Pin (excluded from Reload All and sync) |
| ⋯ | More menu |

**⋯ menu:** Open DevTools (owner only; stub in frontend), Copy device info, Duplicate pane, Snapshot pane (Phase 9), Move left/right (keyboard reorder), Remove pane.

**Keyboard shortcuts (pane-scoped):** `R` reload, `[` / `]` rotate, `+` / `−` zoom, `Delete` remove. These fire **only when the pane chrome (not the previewed content or any input) has focus**, so typing inside the app never triggers them.

```text
CREATE: src/components/preview/{PaneToolbar,PaneMoreMenu,ZoomControl}.tsx
CREATE: src/hooks/useKeyboardShortcuts.ts
```

## Phase 7: Project Connection Panel

Right-side drawer showing project, framework, dev server, actions.

```text
┌───────────────────────────────────┐
│ Project: brisk-mobile         [x] │
│ Framework: React Native (Expo)    │
│ Root: C:\dev\brisk-mobile         │
│ Status: ● Connected               │
├───────────────────────────────────┤
│ Dev Server: http://localhost:8081 │
│ [Open in Browser] [Copy] [Probe]  │
├───────────────────────────────────┤
│ Framework Actions                 │
│ • RN/Expo: Reload, Toggle Inspect │
│ • Flutter: Hot Reload / Restart   │
├───────────────────────────────────┤
│ Detected Devices                  │
│ • AVD: Pixel_8_API_34   [Start]   │
│ • iOS Simulator: unavailable on   │
│   Windows (needs macOS)           │
├───────────────────────────────────┤
│ Recent Files (from watcher)       │
│ • src/screens/Home.tsx  (edited)  │
└───────────────────────────────────┘
```

**Detection rules (order matters: Expo must be checked before RN, since Expo projects also depend on `react-native`):**

| Order | File present | Framework |
|---|---|---|
| 1 | `pubspec.yaml` with `flutter` SDK dependency | Flutter |
| 2 | `pubspec.yaml` without | Dart (web) |
| 3 | `package.json` with `expo` | Expo (RN) |
| 4 | `package.json` with `react-native` | React Native |
| 5 | none | Unknown → manual override |

Manual override dropdown: Auto / React Native / Expo / Flutter / Dart (web) / Web / Custom URL. Also surface the **web-target check** from Framework Feasibility.

```text
CREATE: src/components/project/{ProjectPanel,FrameworkBadge,DevServerActions,DeviceBridgeList,RecentFilesList}.tsx
CREATE: src/hooks/useProjectSession.ts
```

## Phase 8: Compare & Sync

**Compare mode** (⇄ button): pick two panes as A and B, show them overlaid with a drag slider. Implementation is **two live panes with a `clip-path` reveal**, not a pixel diff. When A and B have different viewports, align to a shared height and show a "different viewport sizes" badge. Exit returns to the grid.

**Sync mode** (global toggle): each pane gets a sync icon and group selector **1 / 2 / 3** (renamed from A/B/C). Panes in a group mirror input. The frontend calls `bridge.panes.syncSet({ paneId, group, clickSync })` (mocked until B10; no direct `ipcRenderer`).

| Event | Rule |
|---|---|
| scroll | Y only, **mirrored as a ratio** of scrollable height, not px |
| navigate | URL change |
| input | Text fields |
| click | **Opt-in per group, off by default.** Coordinates mapped as relative (%), with 50 ms debounce. |
| form submit | **Never replayed** |

"Never sync payments/destructive actions" cannot be detected generically, so the guarantee is *only the whitelist above replays*, plus click-sync is opt-in with a one-time warning.

```text
CREATE: src/components/compare/{CompareOverlay,DiffSlider}.tsx
CREATE: src/components/sync/{SyncToolbar,SyncGroupSelector}.tsx
CREATE: src/hooks/useSyncBus.ts
```

## Phase 9: Screenshot / Export / Recording

| Action | Output |
|---|---|
| Snapshot pane | PNG |
| Snapshot all | ZIP of PNGs (`jszip`) |
| Snapshot grid | Single composite PNG |
| Record pane | WebM (MP4 via backend ffmpeg later) |
| Export session | `.lazpreview` JSON |

**Naming:** `preview-{projectName}-{deviceId}-{yyyy-MM-dd-HHmmss}.png`. **Sanitize** `projectName` for Windows (`<>:"/\|?*` and trailing dots/spaces).

**Frontend mock:** `html-to-image.toPng()` on the outer frame div: bezel + placeholder only (see Changelog #3). Option "Include safe-area overlay" (default off).

**Recording controls:** start/stop; **resolution = logical viewport × chosen scale (1×/2×)**, not physical px; frame rate **15 / 24 / 30**; max duration slider 5–120 s.

**Session file:** validated with a Zod schema; `version: 1` with a migration hook.

```json
{
  "version": 1,
  "projectName": "brisk-mobile",
  "createdAt": "2026-06-17T10:00:00Z",
  "gridMode": "2x2",
  "panes": [
    { "deviceId": "iphone-15-pro-max", "orientation": "portrait", "zoomMultiplier": 1, "url": "http://localhost:8081" }
  ]
}
```

Import rule: unknown `deviceId` → skip pane + toast "Skipped 1 pane: unknown device 'xyz'".

```text
CREATE: src/components/export/{SnapshotMenu,RecordToolbar,ExportSessionDialog}.tsx
CREATE: src/lib/snapshot.ts, src/lib/sessionFile.ts
```

## Phase 10: Settings, Themes, Shortcuts

Single `SettingsDialog` (no page).

| Tab | Contents |
|---|---|
| Appearance | Theme, bezel style, canvas dot size, animation speed (respects reduced-motion) |
| Performance | Max-panes warning threshold, "Clear cache" action + clear-on-exit toggle (Electron has no cache-size cap), hardware-acceleration toggle (**requires app restart**; backend) |
| Shortcuts | Editable key map with conflict detection |
| Devices | Custom device CRUD |
| Advanced | Dev server port overrides, ADB/emulator paths, emulate safe area, allow external hosts, log level (CDP port removed: backend uses the debugger API) |
| About | Version, changelog, "Report issue" |

**Default shortcuts (revised to avoid Chromium/Electron conflicts)**

| Shortcut | Action | Change |
|---|---|---|
| Ctrl+N | Add pane | same |
| Ctrl+Alt+R | Reload all | was Ctrl+Shift+R (hard reload) |
| Ctrl+Shift+S | Snapshot active pane | same |
| Ctrl+Shift+A | Snapshot all | same |
| Ctrl+Alt+C | Toggle compare | was Ctrl+Shift+C (inspect element) |
| Ctrl+Alt+Y | Toggle sync | consistent with above |
| Ctrl+, | Open settings | same |
| Ctrl+Alt+1…5 | Grid 1×1 / 2×1 / 2×2 / 3×2 / masonry | was Ctrl+0/1/2 (3×2 and masonry unreachable) |
| Arrow keys | Move between panes | replaces Tab-cycling |
| Delete | Remove active pane (with Undo toast) | focus-scoped |

Backend must also strip Electron's default menu accelerators that collide.

**Custom Device Editor**: RHF + Zod. Validation: `screenWidth/Height` 100–4000, `devicePixelRatio` 1–4, `diagonalInches` 3–17, `frameSvgId` ∈ `FrameSvgId`. **`physicalWidth/Height` and `ppi` are auto-derived and read-only** (physical = screen × DPR; ppi = √(w²+h²) ÷ diagonal), preventing inconsistent data. IDs generated as `custom-<slug>`; brand fixed `Custom`; persisted in `settingsStore`.

```text
CREATE: src/components/settings/{SettingsDialog,AppearanceTab,PerformanceTab,ShortcutsTab,DevicesTab,AdvancedTab,CustomDeviceEditor}.tsx
MODIFY: src/store/settingsStore.ts
```

## Phase 11: Integration Audit

Grep the whole codebase for remaining mock-data imports and confirm every consumer is wired to the same live source as everything else. **Do not skip this even if it feels redundant.**

- `grep -r "@/mocks" src/`: every hit must be either a test, a dev-only seed behind a flag, or a TODO tied to a backend phase.
- No inline device dimensions outside `device-registry.ts`.
- Every `ipcRenderer`/`B*` stub references an existing item in `MOBILE_PREVIEW_BACKEND.md`.
- Registry invariant test, keyboard-only walkthrough, reduced-motion check, min-window (960×600) check.

---

## Backend Contract (added after backend review)

1. **Shared code:** the device registry, `DeviceSchema` (zod), `viewportFor`/`rotateInsets`, and the session-file schema live in **`shared/`** and are imported via `@shared/*` (Vite + tsconfig alias). `src/lib/device-registry.ts` is **not** created; `src/lib/preview-utils.ts` re-exports `viewportFor`/`rotateInsets` from `@shared/viewport`. The Phase 0 registry invariant test uses the shared `DeviceSchema`. Custom device validation in Phase 10 reuses it too.
2. **Bridge adapter:** create `src/lib/bridge.ts` in Phase 0 (`window.laz ?? createMockBridge()`, the mock being today's simulations). Components call `bridge.*` only, **never `ipcRenderer`/`window.laz`**. The audit (Phase 11) greps for violations.
3. **Settings storage:** `settingsStore` uses a pluggable `persist` storage: `localStorage` in browser dev mode, a `bridge.settings` adapter in Electron (one source of truth per mode).
4. **Insecure mode badge:** a pane whose project has web security disabled shows a visible "Insecure mode" badge (data from `bridge`, mocked as false).
5. **Phase map:** P3/P5/P6 → B4 · P5 emulation, landscape → B8 · P7 → B5/B6/B7/B10 · P8 sync → B10 · P9 → B9 · P10 → B3/B11.
6. **Phase 9 snapshot (real mode):** `bridge.shots.pane(id)` returns guest PNG bytes. Swap the webview for an `<img>` inside the frame div, run `html-to-image`, restore, then `bridge.shots.save(bytes, name)`. Renderer never chooses file paths.

---

## Execution Protocol
1. Both plan files exist (`MOBILE_PREVIEW_BACKEND.md` follows this one). **No source code yet.**
2. Wait for explicit "Yes, proceed".
3. One phase at a time, in order: **0 → 11**.
4. After each phase: Phase Report (What was built / Files changed / Decisions / Assumptions / Known gaps and security shortcuts / How to verify), then **"Commit this phase? (y/n)"**, then stop.
5. If blocked: **BLOCKED: [reason]**, two options, wait for decision.
6. Testing note (Windows): no local iOS Simulator; iOS appearance is verified only through frames, not real rendering.
