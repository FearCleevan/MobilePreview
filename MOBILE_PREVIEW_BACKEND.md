# LazDev Device Preview: Backend (Electron Main Process) Implementation (Reviewed & Corrected)

> **Pairs with:** `MOBILE_PREVIEW_FRONTEND.md` (renderer). Read its "Backend Contract" section too. Both files must agree on: shared code location, the `window.laz` bridge, IPC channel names, partition naming and phase cross-references. This file is the authority for IPC; the frontend file is the authority for UI.
> **Rule:** Backend phases begin **only after all frontend phases (0–11) are complete and committed.** One phase at a time. Stop and report after each. Await explicit "Yes, proceed."

---

## Review Changelog

### Blocking / correctness
| # | Original | Correction |
|---|---|---|
| 1 | **CDP via `chrome-remote-interface` + `--remote-debugging-port` per `<webview>`.** That flag is process-wide in Electron; it can't be set per webview. | Use `webContents.debugger.attach('1.3')` + `sendCommand('Emulation.*')`. Removes `chrome-remote-interface`, `cdpPort`, and per-pane ports. |
| 2 | **Safe-area "emulation" by injecting `body{padding}`**: double-pads apps already using `env(safe-area-inset-*)` and apps never read `--safe-top`. | Use CDP `Emulation.setSafeAreaInsetsOverride` (experimental; verify on the pinned Electron, otherwise feature-flag off). |
| 3 | **CDP code is portrait-only** (hard-coded `portraitPrimary`) and ignores orientation. | Uses shared `viewportFor()` + `rotateInsets()`, `landscapePrimary/90` when landscape; re-applied on orientation change and every `dom-ready`. |
| 4 | **Main process "creates" `<webview>`s.** `<webview>` lives in the renderer DOM. | Renderer mounts the tag and calls `pane:attach { paneId, webContentsId }`; main registers it. Lifecycle rewritten. |
| 5 | **`BrowserView`** is deprecated. | Alternative is `WebContentsView`. Default stays `<webview>` (matches frontend), switchable later. |
| 6 | **`new-window` event** no longer exists on webContents. | Use `setWindowOpenHandler`. |
| 7 | **Windows process kill:** `proc.kill('SIGTERM')` doesn't kill the child tree (`npx` → node → Metro/flutter), leaving orphan servers holding ports. | `taskkill /pid <pid> /T /F`, with a grace period. |
| 8 | **`shell: true` + interpolated commands** (injection risk), and `before-quit` doesn't await async `stopAll`. | `execa` uses cross-spawn (handles `.cmd`) so `shell:false`. `before-quit` is `preventDefault` → await cleanup → `app.quit()`. |
| 9 | **Spawn table inconsistent with frontend feasibility.** `react-native start` serves only a Metro bundle, and `dart run --enable-vm-service` serves nothing. | RN requires a web target (RN-web) → else `NO_WEB_TARGET`. Dart → `webdev serve`. Detector returns `hasWebTarget`. |
| 10 | **Flutter regex `/^flutter:/m`** matches the asset config key, not the SDK dependency. | Match `dependencies: flutter: sdk: flutter`. |
| 11 | **ADB bridge:** `listAvds(adbPath)` actually runs the *emulator* binary; `waitForSerial()` undefined; `-grpc` listed but unused; `> out.png` redirect isn't valid in execa. | Separate `emulatorPath` / `adbPath`, implemented serial discovery via `adb emu avd name`, buffer-based `exec-out screencap -p`. |
| 12 | **B7 promises "native Android preview inside a pane"** but nothing renders an emulator in a pane. | v1 scope = list/start/stop/screenshot/reverse. In-pane streaming (scrcpy → WebCodecs) is **Post-v1**. |
| 13 | **`captureService.ts` uses `webContents` without importing it.** | Fixed. Capture returns PNG bytes to the renderer for compositing onto the bezel (frontend Phase 9 contract). |
| 14 | **Recording via `getDisplayMedia` injected into the app page** isn't auto-granted; fragile with page CSP. | Recommended: renderer-side `getDisplayMedia` (via main's `setDisplayMediaRequestHandler`) cropped to the pane rect on a canvas → `MediaRecorder` → WebM. **Spike first** (see Blocking Q4). |
| 15 | **Sync bus has no input-capture mechanism** and sits inside the file-watcher phase. | Defined: CDP `Runtime.addBinding` + injected agent; relay by main; replay via `Runtime.evaluate` / `Input.dispatchMouseEvent`. Kept in B10 to preserve numbering. |
| 16 | **chokidar:** v4 dropped glob support, so the `**/node_modules/**` ignores silently stop working. | Pin `chokidar@^3` *or* use an ignore function. |
| 17 | **ESM-only packages** (`electron-store ≥9`, `execa ≥6`, `get-port ≥6`) in a CJS-bundled main. | Decide ESM vs externalize/bundle in B1 (see Gotchas). |
| 18 | **Duplicate sources of truth:** custom devices / pinned / recent in zustand `persist` (renderer localStorage) *and* electron-store. | Electron mode: settingsStore storage adapter → `laz.settings`. localStorage **only** in browser dev mode. |
| 19 | **Shared code:** backend said `shared/device-registry.ts`; frontend said `src/lib/`. Zod schema was truncated (`// ...`). | `shared/` is canonical; frontend aliased to `@shared/*`. Complete Zod schema is shared and used by both. |
| 20 | **`sandbox: false`** on the window. | `sandbox: true`, plus `will-attach-webview` hardening, sender validation, Zod-validated payloads. |
| 21 | **Settings drift:** `webviewCacheMb` (Electron has no per-session cache cap), `cdpPort` (now unneeded), `devServerPorts` (only RN/Flutter), `Partial` shallow-merge wiping nested keys, `bezelStyle: 'off'` duplicating frontend `frameMode`. | Replaced; see AppSettings. |
| 22 | **Unverifiable/incorrect cost claims** ("Expo EAS Simulator", $99/mo, ~$100/yr EV cert). | Removed. See Cost section. |
| 23 | **Unneeded deps:** `resend` (an email API key shipped inside a desktop app is a leak), `better-sqlite3` (native rebuild pain on Windows). | Removed. No telemetry in v1. `electron-store` is enough. |
| 24 | **Electron "30+"**: v30 is out of support. | Pin the latest stable at scaffold time and record it. |
| 25 | Renderer crash "auto-recreate" can't be done by main for a webview. | Main emits `crashed`; renderer remounts once (key bump); main tracks attempts. |
| 26 | Webview keyboard focus swallows renderer shortcuts (Ctrl+N etc.). | `before-input-event` on guest contents forwards allow-listed accelerators. |

### Security shortcuts → **Blocking Questions** (answer before B1)
1. **Workspace Trust.** Starting a dev server runs the project's own scripts (`npm run dev`, etc.). Add a first-open "Trust this folder?" confirmation (persisted per project)? *(Recommended: yes.)*
2. **Remote content in panes.** Allow arbitrary `http(s)` URLs (staging sites) or restrict to localhost/LAN by default with a per-project "allow external hosts"? *(Recommended: restrict by default.)*
3. **`disablewebsecurity`.** Off by default, per-project opt-in, shown with a visible badge on the pane? *(Recommended: yes.)*
4. **Recording approach.** Approve a 1-day spike comparing (a) renderer canvas-crop recording, (b) `capturePage` loop + ffmpeg? *(Recommended: spike first, ship (a) if sound.)*
5. **ESM.** Make the Electron main ESM (`"type": "module"`) or bundle ESM-only deps? *(Recommended: bundle with electron-vite and keep deps listed as `noExternal`.)*
6. **Distribution.** Personal use only (no code signing; SmartScreen warnings acceptable) or client-shareable (signing needed)? Affects auto-update later; no code written either way in this plan.

---

## Overview

Electron main-process backend for LazDev Device Preview. It owns everything the renderer cannot or should not do: tracking panes' webContents, applying CDP device emulation, spawning/killing dev servers, detecting frameworks, driving ADB, watching files, capturing screenshots/recordings, syncing input and persisting settings.

**Purpose:** replace the frontend's mock layer with a real runtime, **without changing any frontend component** except through the `bridge` adapter and the settings storage adapter.

### Stack (corrected)
- Electron: **latest stable at scaffold time (pin + record; do not assume "30+")**, TypeScript 5, Node 20+ for tooling
- `electron-vite` (main + preload + renderer build)
- `electron-store` (JSON persistence; use its built-in `migrations` option)
- `zod` (IPC + settings validation; shared with renderer)
- `execa` (processes; cross-spawn semantics, no shell)
- `get-port` (free-port discovery)
- `chokidar@^3` (file watching)
- `electron-log` (file logs, 7-day retention, was undefined in the original)
- *Removed:* `chrome-remote-interface`, `better-sqlite3`, `resend`
- *Optional later:* `ffmpeg-static` (WebM → MP4), `scrcpy` (Post-v1 native streaming)

### Frontend ↔ Backend Integration Map

| Frontend phase / feature | Backend phase | IPC / API | Renderer file touched at integration |
|---|---|---|---|
| Pre-Phase: device registry, session schema | B2 (shared code) | none, `@shared/*` import | `src/lib/*` re-exports |
| P1 toolbar: Reload All, Frame, Grid, persisted layout | B3, B4 | `pane:reload`, `settings:*` | `previewStore.reloadAll`, settings adapter |
| P2 / P10 Devices: custom device CRUD | B2, B3 | `device:*` | `settingsStore` (adapter) |
| P3 panes: add/remove/duplicate | B4 | `pane:attach`, `pane:destroy` | `PreviewHostWebview` |
| P5 host events, console drawer | B4 | `pane:event` | `useWebviewEvents`, `ConsoleDrawer` |
| P5 dom-ready emulation, orientation change | B8 | (main-side on `dom-ready`) + `pane:emulate` | `PaneContainer` (orientation) |
| P6 pane toolbar: reload, devtools, shortcuts | B4 | `pane:reload`, `pane:open-devtools`, `pane:event {shortcut}` | `PaneToolbar`, `useKeyboardShortcuts` |
| P7 project panel: detect/connect/actions/devices/recent files | B5, B6, B7, B10 | `project:*`, `emu:*`, `files:*` | `useProjectSession`, panel components |
| P8 sync mode | B10 | `pane:sync-*` | `useSyncBus` |
| P8 compare mode | none (renderer-only) | | |
| P9 snapshot / record / export | B9 | `shot:*`, `rec:*` | `snapshot.ts`, `RecordToolbar` |
| P10 settings tabs | B3, B11 | `settings:*`, `secret:*` | `settings/*` tabs |
| P11 Integration Audit | B12 | | repo-wide |

### Shared code (single source of truth; do NOT duplicate)

```text
shared/
├── device-types.ts      # DevicePreset, FrameSvgId, NotchType, SafeAreaInsets, Orientation
├── device-registry.ts   # DEVICE_PRESETS (canonical list; see frontend Required Device IDs)
├── device-schema.ts     # DeviceSchema (zod): complete, strict, incl. invariants
├── viewport.ts          # viewportFor(), rotateInsets() (pure; used by main AND renderer)
├── session-schema.ts    # SessionFile zod (.lazpreview AND stored sessions)
└── ipc-types.ts         # Result<T>, ErrorCode, PaneConfig, PaneEvent, LazBridge, window.laz typing
```

Renderer imports via `@shared/*` alias (Vite + tsconfig). `src/lib/preview-utils.ts` re-exports `viewportFor`/`rotateInsets` from shared.

### Config namespaces (reconciled with the store keys actually used)

| Key (electron-store) | Contents |
|---|---|
| `app` | `AppSettings` (below) |
| `devices.custom` | `DevicePreset[]` (ids prefixed `custom-`) |
| `projects` | `ProjectRecord[]` (≤50) |
| `sessions` | `SessionRecord[]` (≤100; same schema as `.lazpreview`) |
| *(runtime, in-memory)* `panes` | `paneId → { webContentsId, partition, crashes }` |
| *(runtime)* `servers` | `projectId → { proc, pid, url, port }` |
| *(runtime)* `emulators` | `avdName → { proc, serial }` |
| *(separate file `lazdev-vault`)* secrets | encrypted via `safeStorage` (B11) |

> The original's `settings.*` / `secrets.resend` naming is dropped; there is no `resend`.

### Type notes
| Field | Type | Where |
|---|---|---|
| `paneId` | string (uuid) | preload ↔ renderer ↔ main |
| `webContentsId` | number | from `webview.getWebContentsId()` |
| `projectId` | string (uuid, assigned at first detect) | not derived from the name |
| `deviceId` | string slug | must exist in registry or `custom-*` |
| `pid` | number | Node |
| `adbSerial` | string | e.g. `emulator-5554` |

---

## Phases Overview

| Phase | Name | Connects to frontend |
|---|---|---|
| B1 | Electron Scaffold + IPC Contract + Bridge | all (adapter) |
| B2 | Device Registry Service (shared) | Pre-Phase, P2, P10 |
| B3 | Persistence Layer | P1, P10 |
| B4 | Pane (WebView) Manager | P3, P5, P6 |
| B5 | Project Detection | P7 |
| B6 | Dev Server Manager | P7 |
| B7 | Emulator Bridge (ADB) | P7 |
| B8 | CDP Device Emulation (debugger API) | P5, P4 (landscape) |
| B9 | Screenshot / Recording | P9 |
| B10 | File Watcher + Sync Bus | P7 (recent files), P8 |
| B11 | Settings + Secret Storage | P10 |
| B12 | **Integration Audit** | P11 |

**Per-phase gate:** `npx tsc --noEmit` (renderer + electron configs) **and** `npm run build`, then a manual Windows run-through. End each Phase Report with **"Commit this phase? (y/n)"**.

---

## B1: Scaffold + IPC Contract + Bridge

### Layout

```text
lazdev-preview/
├── electron/
│   ├── main.ts
│   ├── preload.ts
│   ├── ipc/
│   │   ├── channels.ts
│   │   ├── register.ts          # handle(channel, schema, fn) wrapper: validation + sender check + Result
│   │   └── handlers/{panes,projects,devices,emulators,screenshots,files,settings}.ts
│   ├── services/{registryService,persistence,paneManager,projectDetector,devServerManager,
│   │             adbBridge,cdpEmulation,captureService,recorder,fileWatcher,syncBus,
│   │             secretStore,logBus}.ts
│   ├── migrations/index.ts
│   └── util/{logger,ports,processTree}.ts
├── shared/                      # see above
├── src/                         # renderer (see frontend file)
│   └── lib/bridge.ts            # NEW: window.laz ?? mockBridge
├── electron.vite.config.ts      # configure main entry, preload input, renderer root '.', alias @shared
└── package.json
```

> `electron-vite` defaults to `src/main|preload|renderer`. This layout needs explicit entries in `electron.vite.config.ts`. Packaging tool (builder vs forge) is decided at release; out of scope here.

### IPC Result envelope (every `invoke` returns this; never throw across IPC)

```typescript
// shared/ipc-types.ts
export type ErrorCode =
  | 'INVALID_INPUT' | 'NOT_FOUND' | 'NOT_TRUSTED' | 'UNSUPPORTED_PLATFORM'
  | 'NO_WEB_TARGET' | 'SPAWN_FAILED' | 'TIMEOUT' | 'CANCELLED' | 'INTERNAL'
export type Result<T> = { ok: true; data: T } | { ok: false; error: { code: ErrorCode; message: string } }
```

### Channels (single source of truth)

```typescript
// electron/ipc/channels.ts
export const CH = {
  // panes
  PANE_ATTACH: 'pane:attach',            // renderer → main {paneId, deviceId, orientation, webContentsId}
  PANE_DETACH: 'pane:detach',
  PANE_RELOAD: 'pane:reload',
  PANE_NAVIGATE: 'pane:navigate',
  PANE_EMULATE: 'pane:emulate',          // re-apply device (orientation/device change)
  PANE_OPEN_DEVTOOLS: 'pane:open-devtools',
  PANE_EVENT: 'pane:event',              // main → renderer
  PANE_SYNC_SET: 'pane:sync-set',        // {paneId, group|null, clickSync}
  PANE_SYNC_INPUT: 'pane:sync-input',    // main-internal + renderer-visible echo (diagnostics)
  // projects
  PROJECT_PICK: 'project:pick-folder',   // main shows dialog; renderer never sends arbitrary paths
  PROJECT_DETECT: 'project:detect',
  PROJECT_TRUST: 'project:trust',
  PROJECT_CONNECT: 'project:connect',
  PROJECT_DISCONNECT: 'project:disconnect',
  PROJECT_ACTION: 'project:action',      // 'reload' | 'hot-reload' | 'hot-restart'
  PROJECT_LOG: 'project:log',            // main → renderer
  // devices
  DEVICE_LIST: 'device:list',
  DEVICE_CUSTOM_UPSERT: 'device:custom-upsert',
  DEVICE_CUSTOM_DELETE: 'device:custom-delete',
  // emulators
  EMU_LIST_AVDS: 'emu:list-avds',
  EMU_START: 'emu:start',
  EMU_STOP: 'emu:stop',
  EMU_STATUS: 'emu:status',
  EMU_SCREENSHOT: 'emu:screenshot',
  // capture
  SHOT_PANE: 'shot:pane',                // → PNG bytes (renderer composites onto bezel)
  SHOT_SAVE: 'shot:save',                // renderer sends bytes + suggestedName; main shows dialog
  REC_START: 'rec:start',
  REC_CHUNK: 'rec:chunk',
  REC_STOP: 'rec:stop',
  // files
  FILES_WATCH: 'files:watch',
  FILES_UNWATCH: 'files:unwatch',
  FILES_CHANGED: 'files:changed',        // main → renderer (batched)
  // settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_CHANGED: 'settings:changed',  // main → renderer (was missing)
  SETTINGS_EXPORT: 'settings:export',
  SETTINGS_IMPORT: 'settings:import',
  CACHE_CLEAR: 'cache:clear',
  SECRET_SET: 'secret:set',
  SECRET_HAS: 'secret:has',
} as const
```

### Handler wrapper (validation + sender check)

```typescript
// electron/ipc/register.ts
export function handle<I, O>(channel: string, schema: z.ZodType<I>, fn: (i: I, e: IpcMainInvokeEvent) => Promise<O>) {
  ipcMain.handle(channel, async (e, raw): Promise<Result<O>> => {
    if (!isTrustedSender(e)) return fail('NOT_TRUSTED', 'untrusted sender')   // e.senderFrame.url must be the app origin
    const p = schema.safeParse(raw)
    if (!p.success) return fail('INVALID_INPUT', p.error.message)
    try { return ok(await fn(p.data, e)) } catch (err) { return fail('INTERNAL', String(err)) }
  })
}
```

### BrowserWindow + app hardening (`main.ts`)

```text
webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, webviewTag: true, preload }
app.requestSingleInstanceLock()
mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
mainWindow.webContents.on('will-navigate', block unless same app origin)
session.defaultSession: CSP header for renderer (allow frame/webview src to http(s) only)
webContents.on('will-attach-webview', (e, webPreferences, params) => {
  delete webPreferences.preload; webPreferences.nodeIntegration = false;
  webPreferences.contextIsolation = true; webPreferences.sandbox = true;
  if (!isAllowedUrl(params.src)) e.preventDefault()           // http(s) only; localhost/LAN unless allowExternalHosts
  params.allowpopups = undefined                               // never allow
})
Menu.setApplicationMenu(null)   // default accelerators (Ctrl+R, Ctrl+Shift+I…) collide with frontend shortcuts; keep F12 for the app window in dev only
app.on('before-quit', async (e) => { e.preventDefault(); await stopAllServers(); await closeAllWatchers(); app.exit() })  // guard against re-entry
```

> `hardwareAcceleration` is read **synchronously from the store before `app.whenReady()`** and, if false, `app.disableHardwareAcceleration()` is called there. Changing it requires a restart (frontend Performance tab says so).

### Preload (contextBridge; returns unsubscribe functions, never exposes `ipcRenderer` or the event object)

```typescript
// electron/preload.ts
const on = <T>(ch: string, cb: (p: T) => void) => {
  const h = (_: unknown, p: T) => cb(p)
  ipcRenderer.on(ch, h)
  return () => ipcRenderer.removeListener(ch, h)
}
contextBridge.exposeInMainWorld('laz', {
  panes: {
    attach: (cfg: PaneAttach) => ipcRenderer.invoke(CH.PANE_ATTACH, cfg),
    detach: (id: string) => ipcRenderer.invoke(CH.PANE_DETACH, id),
    reload: (id: string) => ipcRenderer.invoke(CH.PANE_RELOAD, id),
    navigate: (id: string, url: string) => ipcRenderer.invoke(CH.PANE_NAVIGATE, { id, url }),
    emulate: (id: string, deviceId: string, orientation: Orientation) => ipcRenderer.invoke(CH.PANE_EMULATE, { id, deviceId, orientation }),
    devtools: (id: string) => ipcRenderer.invoke(CH.PANE_OPEN_DEVTOOLS, id),
    syncSet: (cfg: SyncSet) => ipcRenderer.invoke(CH.PANE_SYNC_SET, cfg),
    onEvent: (cb: (e: PaneEvent) => void) => on(CH.PANE_EVENT, cb),
  },
  projects: { /* pick, detect, trust, connect, disconnect, action, onLog */ },
  devices:  { /* list, upsertCustom, deleteCustom */ },
  emulators:{ /* listAvds, start, stop, status, screenshot */ },
  shots:    { /* pane, save, recStart, recChunk, recStop */ },
  files:    { /* watch, unwatch, onChanged */ },
  settings: { /* get, set, export, import, clearCache, onChanged */ },
})
```

`shared/ipc-types.ts` exports `interface LazBridge` and `declare global { interface Window { laz?: LazBridge } }`. All members return `Promise<Result<T>>`.

### Renderer bridge adapter (the only integration seam)

```text
src/lib/bridge.ts
  export const isElectron = typeof window !== 'undefined' && !!window.laz
  export const bridge: LazBridge = window.laz ?? createMockBridge()   // mocks = the frontend's existing simulations
```
Components call `bridge.*`, **never** `window.laz` or `ipcRenderer` directly. `usePreviewHostMode()` returns `'electron'` iff `isElectron`.

### Files
```text
CREATE: electron/main.ts, electron/preload.ts, electron/ipc/channels.ts, electron/ipc/register.ts
CREATE: electron/util/{logger,ports,processTree}.ts
CREATE: shared/ipc-types.ts, src/lib/bridge.ts
CREATE: electron.vite.config.ts, tsconfig.electron.json
MODIFY: package.json (main field, scripts, deps)
```

---

## B2: Device Registry Service

**Goal:** One validated registry, shared by main and renderer; custom devices merged.

```typescript
// shared/device-schema.ts: complete (no "// ..."), strict
export const DeviceSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  brand: z.enum(['Apple','Samsung','Google','Xiaomi','OnePlus','Custom']),
  name: z.string().min(1),
  category: z.enum(['phone','tablet','foldable','desktop']),
  releaseYear: z.number().int().min(2007).max(2100),
  screenWidth: z.number().int().min(100).max(4000),
  screenHeight: z.number().int().min(100).max(4000),
  devicePixelRatio: z.number().min(1).max(4),
  physicalWidth: z.number().int().positive(),
  physicalHeight: z.number().int().positive(),
  diagonalInches: z.number().min(3).max(17),
  ppi: z.number().positive(),
  notchType: z.enum(['none','notch','dynamic_island','punch_hole_center','punch_hole_left','teardrop']),
  cornerRadius: z.number().min(0),
  safeArea: z.object({ top: z.number().min(0), bottom: z.number().min(0), left: z.number().min(0), right: z.number().min(0) }),
  hasHomeIndicator: z.boolean(),
  hasPhysicalBezel: z.boolean(),
  frameSvgId: z.enum(['iphone-notch','iphone-dynamic-island','iphone-classic','samsung-punchhole','pixel-punchhole','ipad-bezel','pixel-foldable','custom-bezel']),
  userAgent: z.string().optional(),
  defaultOrientation: z.enum(['portrait','landscape']),
  tags: z.array(z.string()),
}).strict().superRefine((d, ctx) => {
  if (Math.abs(d.physicalWidth  - d.screenWidth  * d.devicePixelRatio) > 1) ctx.addIssue({ code: 'custom', message: 'physicalWidth ≠ screenWidth × DPR' })
  if (Math.abs(d.physicalHeight - d.screenHeight * d.devicePixelRatio) > 1) ctx.addIssue({ code: 'custom', message: 'physicalHeight ≠ screenHeight × DPR' })
})
```

- `registryService.loadRegistry()` returns `{ presets, errors[] }` using a **type-guard filter** (not `filter(Boolean)`), logging via `logger`, not `console.error`. Invalid canonical presets fail the **frontend unit test**, so they never ship.
- Custom devices: ids **must** start `custom-`; duplicate or canonical-colliding id → `Result` error `INVALID_INPUT` (the renderer shows the toast, not main).
- `device:list` returns canonical + custom merged and flagged `isCustom`.

```text
CREATE: shared/{device-types,device-registry,device-schema,viewport}.ts
CREATE: electron/services/registryService.ts, electron/ipc/handlers/devices.ts
MODIFY (frontend): src/lib/device-registry.ts → deleted; imports use @shared/*
```

---

## B3: Persistence Layer

```typescript
// electron/services/persistence.ts
export interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  bezelStyle: 'realistic' | 'minimal'            // 'off' removed: that is frontend frameMode
  hardwareAcceleration: boolean
  shortcuts: Record<string, string>
  ui: { pinnedDeviceIds: string[]; recentDeviceIds: string[]; appMode: 'owner' | 'presentation'; frameMode: 'on'|'off'|'auto' }
  performance: { maxPanesWarning: number; clearCacheOnExit: boolean; autoReloadOnChange: boolean /* default false */ }
  advanced: {
    adbPath?: string; emulatorPath?: string        // resolved from ANDROID_HOME / ANDROID_SDK_ROOT if unset
    portOverrides: Partial<Record<'react-native'|'expo'|'flutter'|'dart'|'web', number>>
    emulateSafeArea: boolean
    allowExternalHosts: boolean                    // pending Blocking Q2
    logLevel: 'debug' | 'info' | 'warn' | 'error'
  }
}

export interface ProjectRecord {
  id: string; name: string; rootPath: string
  framework: Framework; hasWebTarget: boolean
  trusted: boolean                                 // Workspace Trust (Blocking Q1)
  allowInsecureWebSecurity: boolean                // per-project opt-in (Blocking Q3)
  devServerUrl?: string; lastOpenedAt: string
}
export type SessionRecord = SessionFile & { id: string; projectId: string }   // shared/session-schema.ts, same as .lazpreview
```

- Store: `new Store<StoreShape>({ name: 'lazdev-preview', defaults, migrations })`, using **electron-store's built-in `migrations`** instead of a hand-rolled `_schemaVersion` runner (deleted).
- `settings.set(patch)` **deep-merges** (the original shallow merge wiped nested `performance`/`advanced`). Validate with a Zod `AppSettingsSchema` (partial) before writing.
- Retention: last 100 sessions, 50 projects; logs 7 days (via `electron-log` rotation).
- Corrupt file: back up to `lazdev-preview.corrupt-<ts>.json`, restore defaults, emit a `settings:changed` with a warning flag. (Antivirus/file-lock on Windows can cause transient read failures: retry once before treating as corrupt.)
- `persistence.ts` also exposes `getHardwareAccelerationSync()` for pre-ready startup.

```text
CREATE: electron/services/persistence.ts, electron/migrations/index.ts, shared/session-schema.ts
CREATE: electron/ipc/handlers/settings.ts
```

**Renderer wiring (this phase):** `settingsStore` gets a zustand `persist` **storage adapter** that, in Electron mode, reads/writes via `bridge.settings` (and `bridge.devices` for custom devices); in browser dev mode it uses `localStorage`. One source of truth per mode.

---

## B4: Pane (WebView) Manager

### Lifecycle (corrected)

```text
renderer mounts <webview partition="pane-{paneId}" src=…>
  → on 'dom-ready' calls bridge.panes.attach({ paneId, deviceId, orientation, webContentsId: webview.getWebContentsId() })
main: registers PaneRuntime, wires listeners, applies emulation (B8)
reload / navigate / devtools / emulate → by paneId
renderer unmounts → bridge.panes.detach(paneId) → main removes listeners, detaches debugger, optional partition cache clear
```

**Partition:** non-persistent `pane-{paneId}` by default (nothing accumulates on disk). Optional per-project **persistent** partition `persist:project-{projectId}` (keeps logins across restarts) behind a setting. Matches frontend Phase 5.

```typescript
interface PaneRuntime { id: string; wcId: number; deviceId: string; orientation: Orientation; crashes: number }
const panes = new Map<string, PaneRuntime>()
```

### Event forwarding → `PANE_EVENT` (union in `shared/ipc-types.ts`)

| Source | Event payload |
|---|---|
| `did-start-loading` | `{ paneId, type:'load-start' }` |
| `did-stop-loading` | `{ paneId, type:'load-stop' }` |
| `did-fail-load` (main frame, not aborted) | `{ type:'load-fail', code, desc, url }` |
| `console-message` | `{ type:'console', level, message, line, source }` (**signature differs across Electron versions; verify on the pinned one**; truncate message to 4 KB) |
| `setWindowOpenHandler` | deny + `{ type:'popup-blocked', url }` |
| `dom-ready` | `{ type:'dom-ready' }` (then B8 emulation is applied) |
| `render-process-gone` | `{ type:'crashed', reason }`; main increments `crashes`; renderer remounts once (key bump), second crash → error overlay |
| `before-input-event` (guest) | `{ type:'shortcut', accelerator }` for allow-listed accelerators only. Needed because focus inside the webview swallows renderer shortcuts (Ctrl+N, Ctrl+Alt+R, …); the list comes from `settings.shortcuts` |

### Navigation policy
`pane:navigate` and `will-navigate`/`will-attach-webview` allow **http(s) only**; localhost/127.0.0.1/LAN by default; other hosts only if `allowExternalHosts` (Blocking Q2). `file:`, `javascript:`, `data:` blocked. `disablewebsecurity` is set only when the project has `allowInsecureWebSecurity`; the pane shows an "Insecure mode" badge (frontend task in the Integration Audit).

### Console volume
Console events are rate-limited (batch every 100 ms, cap 1,000 entries/pane in the renderer's drawer).

```text
CREATE: electron/services/paneManager.ts, electron/ipc/handlers/panes.ts
```

**Renderer wiring:** `PreviewHostWebview` calls `attach`/`detach`; `useWebviewEvents` subscribes via `bridge.panes.onEvent`; `PaneToolbar` reload/devtools call the bridge; `previewStore.reloadAll` iterates non-pinned panes.

---

## B5: Project Detection

Folder selection is **main-owned**: `project:pick-folder` shows `dialog.showOpenDialog` and returns a path that main remembers as "user-picked". `project:detect` accepts only previously picked/known roots.

```typescript
export interface DetectionResult {
  framework: 'react-native'|'expo'|'flutter'|'dart'|'web'|'unknown'
  rootPath: string
  packageManager?: 'npm'|'yarn'|'pnpm'|'bun'
  devScript?: string
  suggestedPort?: number
  hasWebTarget: boolean
  webTargetNote?: string          // e.g. "Add react-native-web to preview in a pane"
  name?: string
  scripts?: Record<string, string>  // NOT the whole package.json
}
```

Rules (same order as frontend Phase 7: Expo before RN):

| Order | Check | Result |
|---|---|---|
| 1 | `pubspec.yaml` matching `/^\s+flutter:\s*\r?\n\s+sdk:\s*flutter/m` (CRLF-safe, Windows) | `flutter`; `hasWebTarget = exists(web/index.html)` |
| 2 | `pubspec.yaml` otherwise | `dart`; `hasWebTarget = exists(web/)` |
| 3 | `package.json` with `expo` | `expo`; `hasWebTarget = deps has react-native-web` (Expo web needs it) |
| 4 | `package.json` with `react-native` | `react-native`; `hasWebTarget = deps has react-native-web` |
| 5 | other `package.json` | `web`; `hasWebTarget = true` |
| 6 | none | `unknown` |

- Wrap `JSON.parse` in try/catch (corrupt `package.json` → `unknown` + message).
- Monorepos (`apps/*`, `packages/*`): v1 returns `unknown` with a hint "pick the app folder".
- Cache by `package.json`/`pubspec.yaml` **mtime**, not "forever unless force" (stale after dependency changes).
- `suggestedPort` is a *preference*; actual port comes from `get-port` in B6 (Flutter's `0` was meaningless).

```text
CREATE: electron/services/projectDetector.ts, electron/ipc/handlers/projects.ts
```

**Renderer wiring:** `useProjectSession` → `bridge.projects.pick/detect`; ProjectPanel shows `webTargetNote` when `hasWebTarget` is false (frontend Framework Feasibility).

---

## B6: Dev Server Manager

**Trust gate:** `project:connect` fails with `NOT_TRUSTED` unless `project.trusted` (set via `project:trust` after the renderer's confirmation dialog). *(Blocking Q1.)*

### Commands (no shell, ports from `get-port`)

| Framework | Command | Notes |
|---|---|---|
| Expo | `npx expo start --web --port <p>` | Suppress auto-opening the system browser (verify the flag/env for the project's SDK). Requires `hasWebTarget`. |
| React Native | `npx react-native start --port <p>` | Only a bundler, so **require `hasWebTarget`** (RN-web config), else `NO_WEB_TARGET`. |
| Flutter | `flutter run -d web-server --web-port <p> --web-hostname localhost` | Keep **stdin open**: `r` = hot reload, `R` = hot restart (`project:action`). |
| Dart (web) | `dart pub global run webdev serve web:<p>` | Needs `webdev` activated; else `SPAWN_FAILED` with the activation hint. |
| Web | `<pm> run <devScript>` | Port flag is tool-specific, so **parse the URL from stdout** and fall back to port polling. |

```typescript
// electron/services/devServerManager.ts  (execa ≥ v6 is ESM-only; see Gotchas)
const proc = execa(cmd.bin, cmd.args, { cwd: root, env: { ...process.env, FORCE_COLOR: '0', BROWSER: 'none' }, stdin: 'pipe', cleanup: true })
```
- Strip ANSI from log lines; push to a **ring buffer (5,000 lines)**, batched to the renderer every 100 ms on `project:log`.
- URL detection: regex `/https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\]):(\d+)/` on stdout/stderr, else poll.
- Health poll: `http://127.0.0.1:<port>` **and** `[::1]` (Node ≥18 resolves `localhost` to IPv6 first; Vite may bind either), every 500 ms. **Timeouts per framework:** web 30 s, Expo 60 s, RN 60 s, Flutter 180 s (first web compile is slow). Timeout → status `unreachable` with Retry.
- **Stop = process tree kill:** `taskkill /pid <pid> /T /F` after a 3 s grace; verify the port is released.
- Exit handler marks the project `stopped` and notifies the renderer. Unexpected exit → surfaced as an error, never auto-restart.

```text
CREATE: electron/services/devServerManager.ts, electron/services/logBus.ts, electron/util/processTree.ts
MODIFY: electron/ipc/handlers/projects.ts
```

**Renderer wiring:** ProjectPanel "Connect" → `projects.connect`; DevServerActions → `projects.action`; panes whose `url` is empty fall back to the connected `devServerUrl`.

---

## B7: Emulator Bridge (ADB), v1 scope

**v1 does:** list AVDs, start/stop, device status, `adb reverse`, screenshot (to PNG bytes). **v1 does not** stream the emulator into a pane (Post-v1: scrcpy → WebCodecs/WebRTC, needs a new host mode `emulator-stream` in frontend Phase 5).

| Action | Command |
|---|---|
| List AVDs | `<emulatorPath> -list-avds` |
| Start AVD | `<emulatorPath> -avd <name>` (add `-no-snapshot-load` only via option; it slows boot) |
| List devices | `<adbPath> devices -l` |
| Resolve serial for AVD | for each `emulator-*` in `adb devices`: `adb -s <serial> emu avd name` → match |
| Boot complete | poll `adb -s <serial> shell getprop sys.boot_completed` == `1` (timeout 180 s) |
| Reverse (RN native) | `adb -s <serial> reverse tcp:8081 tcp:8081` |
| Screenshot | `execa(adb, ['-s', s, 'exec-out', 'screencap', '-p'], { encoding: 'buffer' })` (no shell redirect) |
| Stop | `adb -s <serial> emu kill` |

- Paths: `advanced.emulatorPath/adbPath` → else `%ANDROID_HOME%` / `%ANDROID_SDK_ROOT%` (`emulator\emulator.exe`, `platform-tools\adb.exe`) → else `UNSUPPORTED_PLATFORM`-style error "Android SDK not found" with a settings link.
- **iOS:** simulators need macOS. All iOS-simulator calls return `{ ok:false, code:'UNSUPPORTED_PLATFORM' }` (IPC has no HTTP 501). The frontend already shows "unavailable on Windows". Cloud-simulator vendors are a future decision and **no vendor, price or endpoint is assumed here**.
- Never start an emulator without a user action; cap concurrently running AVDs (default 2) to protect RAM.

```text
CREATE: electron/services/adbBridge.ts, electron/ipc/handlers/emulators.ts
```

---

## B8: CDP Device Emulation (debugger API)

```typescript
// electron/services/cdpEmulation.ts
import type { WebContents } from 'electron'
import { viewportFor, rotateInsets } from '../../shared/viewport'

export async function applyDevice(wc: WebContents, d: DevicePreset, o: Orientation, opts: { emulateSafeArea: boolean }) {
  if (!wc.debugger.isAttached()) wc.debugger.attach('1.3')
  const vp = viewportFor(d, o)
  const send = (m: string, p?: object) => wc.debugger.sendCommand(m, p)

  await send('Emulation.setDeviceMetricsOverride', {
    width: vp.width, height: vp.height, deviceScaleFactor: d.devicePixelRatio, mobile: true,
    screenOrientation: o === 'portrait' ? { type: 'portraitPrimary', angle: 0 } : { type: 'landscapePrimary', angle: 90 },
  })
  if (d.userAgent) await send('Emulation.setUserAgentOverride', { userAgent: d.userAgent })
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
  await send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' })
  if (opts.emulateSafeArea) {
    try { await send('Emulation.setSafeAreaInsetsOverride', { insets: rotateInsets(d.safeArea, o) }) }
    catch { /* experimental command: feature-detect; log once, continue */ }
  }
}
export function detach(wc: WebContents) { try { wc.debugger.detach() } catch {} }
```

- Called on `dom-ready` (every navigation), on `pane:emulate` (device/orientation change), and when `emulateSafeArea` toggles.
- **Layout contract with the frontend:** the renderer lays the webview out at `viewportFor(device, orientation)` and scales it with CSS transform; CDP sets the *same* logical size, so what the app sees equals the frame's screen.
- **Memory:** each pane renders at `DPR ×` resolution internally; 6 panes at DPR 3–3.75 is heavy. The frontend's `maxPanesWarning` addresses this. A future "cap emulated DPR to 2" option is noted, not built.
- DevTools and the debugger can coexist on the same contents; if attach fails because DevTools has taken it, retry once after DevTools closes.
- Detach on pane detach/destroy.

```text
CREATE: electron/services/cdpEmulation.ts
MODIFY: electron/services/paneManager.ts (dom-ready → applyDevice)
```

---

## B9: Screenshot / Recording

**Pane snapshot:** `capturePage()` returns the *guest content only*. The renderer composes the bezel (frontend Phase 9 contract):

```text
renderer: bytes = await bridge.shots.pane(paneId)
          → temporarily swap the <webview> inside the frame div for <img src=blob:…>
          → html-to-image.toPng(frameDiv)   // now includes bezel + real content
          → restore webview → bridge.shots.save(pngBytes, suggestedName)
```

```typescript
import { app, dialog, webContents, BrowserWindow } from 'electron'     // webContents was missing in the original
export async function capturePane(wcId: number): Promise<Buffer> {
  const wc = webContents.fromId(wcId); if (!wc || wc.isDestroyed()) throw new Error('pane not found')
  return (await wc.capturePage()).toPNG()
}
export async function saveBytes(win: BrowserWindow, bytes: Uint8Array, name: string, ext: 'png'|'zip'|'webm'|'lazpreview') { /* showSaveDialog(win, …) → write */ }
```
- **Save path is chosen by the user in a main-owned dialog**; the renderer sends bytes + a *suggested name* only (sanitized for Windows: strip `<>:"/\|?*`, trailing dots/spaces).
- Offscreen/occluded panes can return blank images, so scroll them into view or show a warning (verify on the pinned Electron). With CDP DPR overrides the captured pixel size may differ from logical size; verify and document.
- Snapshot-all = renderer loops panes → zip with `jszip` → one save dialog.

**Recording (pending Blocking Q4 spike):**
- **Option A (recommended):** `session.setDisplayMediaRequestHandler` in main grants the app's own window; the renderer calls `getDisplayMedia`, draws the pane's `getBoundingClientRect()` region to a canvas at the chosen scale, `canvas.captureStream(fps)` → `MediaRecorder` (WebM) → chunks via `rec:chunk` → temp file in main → Save on stop. Captures the bezel exactly as shown. Limitation: the pane must stay fully visible.
- **Option B:** `capturePage` loop (≤15 fps) → frames → ffmpeg encode. Works for occluded panes but slow/heavy.
- Not implemented: injecting a recorder into the previewed page (CSP-fragile, runs in untrusted context).
- Frame-rate options match frontend: **15 / 24 / 30**. MP4 transcoding is optional via `ffmpeg-static`, deferred.

```text
CREATE: electron/services/captureService.ts, electron/services/recorder.ts, electron/ipc/handlers/screenshots.ts
```

---

## B10: File Watcher + Sync Bus

### File watcher
```typescript
const w = chokidar.watch(root, {
  ignored: (p) => IGNORED_SEGMENTS.some(s => p.includes(s)),   // node_modules, .git, build, dist, .dart_tool, ios/Pods, android/.gradle, .expo
  ignoreInitial: true, awaitWriteFinish: { stabilityThreshold: 200 },
})
```
(Works on both chokidar v3 and v4; do **not** rely on `**` globs.)
- Events are **batched every 100 ms** and sent on `CH.FILES_CHANGED` (not a string literal, as in the original) as `{ projectId, changes: [{ path, kind }] }` and the renderer keeps the latest 50 for "Recent Files".
- `autoReloadOnChange` defaults **false**: dev servers already HMR; double reloads cause flicker. When on, only non-pinned panes of that project reload, with a 300 ms debounce. Flutter/Dart: never (their hot reload is `project:action`).
- Watch errors (EPERM/EMFILE on Windows, antivirus locks) are logged and surfaced once, not retried in a loop.

### Sync bus (powers frontend Phase 8 Sync mode)
No input capture existed in the original. Design:

1. On `dom-ready`, for panes in a sync group, main sends CDP `Runtime.addBinding { name: '__lazSync' }` and `Page.addScriptToEvaluateOnNewDocument` with a tiny agent that reports `scroll` (as **ratio**), `navigate`, and `click` (as **relative x/y**) by calling `__lazSync(JSON)`. (No preload in the untrusted page.)
2. Main listens for `Runtime.bindingCalled` on `debugger`'s `message` event, then relays to other panes of the same group.
3. Replay: scroll → `Runtime.evaluate` `scrollTo(0, ratio × (scrollHeight − innerHeight))`; navigate → `loadURL` (http(s) policy applies); click → `Input.dispatchMouseEvent` at relative coords × target viewport, **only when the group has `clickSync` enabled** (frontend default: off, with a one-time warning).
4. Echo suppression: ignore binding calls from a pane for 150 ms after replaying into it. 50 ms debounce for clicks.
5. **Never replayed:** form submits, key events. Text `input` sync is best-effort by stable selector (`id` → `name` → `data-testid`), skipped if absent. Pinned panes neither send nor receive.

```text
CREATE: electron/services/fileWatcher.ts, electron/services/syncBus.ts, electron/ipc/handlers/files.ts
MODIFY: electron/services/paneManager.ts (sync agent injection)
```

**Renderer wiring:** `useSyncBus` → `bridge.panes.syncSet({ paneId, group, clickSync })` (frontend groups are **1/2/3**); RecentFilesList → `bridge.files.onChanged`.

---

## B11: Settings + Secret Storage

- Settings surface exposed via `laz.settings.get/set/export/import/clearCache/onChanged`. `set` validates with Zod, deep-merges, writes, then broadcasts `settings:changed`.
- **Export** never includes secrets, and strips absolute paths (`adbPath`, project roots) unless the user opts in. **Import** validates against `AppSettingsSchema`, then merges; unknown keys dropped.
- `cache:clear` → `session.fromPartition(...).clearCache()/clearStorageData()` for panes (replaces the invalid `webviewCacheMb`); `clearCacheOnExit` setting honored in `before-quit`.
- **Secrets:** `safeStorage` (Windows DPAPI: protects against other users, *not* other processes of the same user). `isEncryptionAvailable()` is only meaningful **after `app.whenReady()`**. **v1 has no secret consumers** (the cloud-iOS token and `resend` key were removed), so this ships as dormant infrastructure behind the `secret:*` channels and is **not exposed in any UI** until a feature needs it.

```text
CREATE: electron/services/secretStore.ts, electron/services/settingsBroadcast.ts
MODIFY: electron/ipc/handlers/settings.ts
```

---

## B12: Integration Audit

**Final phase. Do not skip even if it feels redundant.**

- Grep the whole codebase for remaining mock-data imports (`@/mocks`, `createMockBridge`) and confirm every consumer is wired to the same live source as everything else. The only allowed survivors are: tests, and `createMockBridge` used **solely** when `window.laz` is absent (browser dev mode).
- Grep for direct `window.laz` / `ipcRenderer` use outside `src/lib/bridge.ts` → must be zero.
- Every `bridge.*` method maps to a channel in `channels.ts`, and every channel has a handler with a Zod schema.
- Each frontend phase in the Integration Map: run the corresponding verification (Windows, packaged-like run `npm run build` + `electron .`).
- Security checklist: sandbox true, `will-attach-webview` active, no `allowpopups`, `disablewebsecurity` only with per-project opt-in, navigation policy enforced, workspace-trust gate enforced, no secrets in logs.
- Process hygiene: start/stop servers 10×, confirm no orphan `node`/`flutter`/`dart` processes and no held ports; quit app during an active server and recording.
- Frontend amendments from the integration list below are present.

---

## IPC Reference (shapes; all return `Result<T>`)

| Channel | Request | `data` on success |
|---|---|---|
| `pane:attach` | `{ paneId, deviceId, orientation, webContentsId }` | `{ attached: true }` |
| `pane:detach` / `pane:reload` / `pane:open-devtools` | `paneId` | `void` |
| `pane:navigate` | `{ id, url }` | `void` |
| `pane:emulate` | `{ id, deviceId, orientation }` | `void` |
| `pane:sync-set` | `{ paneId, group: 1\|2\|3\|null, clickSync }` | `void` |
| `project:pick-folder` | none | `{ rootPath } \| null` |
| `project:detect` | `{ rootPath, force? }` | `DetectionResult & { projectId }` |
| `project:trust` | `{ projectId }` | `void` |
| `project:connect` | `{ projectId }` | `{ url, port, status }` |
| `project:action` | `{ projectId, action }` | `void` |
| `device:list` | none | `Array<DevicePreset & { isCustom }>` |
| `device:custom-upsert` / `-delete` | `DevicePreset` / `id` | `void` |
| `emu:*` | per B7 | AVD list / `{ serial }` / status / PNG bytes |
| `shot:pane` | `paneId` | `Uint8Array` (PNG) |
| `shot:save` | `{ bytes, suggestedName, ext }` | `{ filePath } \| null` |
| `rec:start` / `rec:chunk` / `rec:stop` | `{ paneId, fps }` / bytes / none | `void` / `void` / `{ filePath }` |
| `files:watch` / `files:unwatch` | `{ projectId }` | `void` |
| `settings:get` / `set` / `export` / `import` | none / patch / none / json | `AppSettings` / `AppSettings` / `filePath` / `AppSettings` |
| `cache:clear` | none | `void` |

Main → renderer events: `pane:event`, `project:log`, `files:changed`, `settings:changed`.

---

## Frontend Amendments Required by This Plan (already applied to `MOBILE_PREVIEW_FRONTEND.md`)

1. Canonical registry/viewport/schema in `shared/` (`@shared/*`).
2. `src/lib/bridge.ts` + `bridge.*` everywhere; **no direct `ipcRenderer`** (Phase 8 stub text fixed).
3. Webview partition `pane-${pane.id}` (non-persistent), not `pane-${deviceId}`.
4. Phase 10: remove **CDP port** and **WebView cache size**. Add "Clear cache", "Emulate safe area", "Allow external hosts".
5. `settingsStore` uses the Electron storage adapter (B3).
6. Panes need an "Insecure mode" badge when `allowInsecureWebSecurity`.
7. "Backend" references now point to this file.

---

## Known Gotchas (Windows / Electron)

- **ESM-only deps:** `electron-store`, `execa`, `get-port` need electron-vite to bundle them (or an ESM main). A `require()` of them fails at runtime; `tsc --noEmit` won't catch it, only a real run will.
- **`localhost` → `::1`:** Node ≥18 may resolve IPv6 first. Dev servers bound only to `127.0.0.1` (or only `::1`) fail health checks if you probe one family only.
- **Process tree on Windows:** `SIGTERM` isn't real. Always `taskkill /T /F`; verify ports freed.
- **`.cmd` shims:** `npx`/`npm`/`flutter` are `.cmd`/`.bat`; execa (cross-spawn) handles them with `shell:false`.
- **Intermittent failures:** if file watching or `electron-store` writes fail inconsistently, suspect **antivirus/Defender file locking** and path length before assuming a code bug.
- **`safeStorage` before ready** reports unavailable.
- **`webview` preload paths** must be absolute `file://` URLs. (Unused here: no webview preload is used on purpose.)
- **Experimental CDP commands** (`setSafeAreaInsetsOverride`) can vanish across Chromium versions; always feature-detect.
- **`console-message` listener signature** changed across Electron majors; re-verify after upgrading Electron.
- **Native modules** (none in v1 after removing `better-sqlite3`). Reintroducing one means `electron-rebuild` on Windows with build tools.
- **Supabase RETURNING/RLS gotcha:** not applicable, because this project uses no Supabase.

## Security Shortcuts (explicit; each is a blocking question above, not a "known gap")
No code signing / auto-update (Q6) · dev-server script execution (Q1) · external hosts in panes (Q2) · `disablewebsecurity` (Q3). Nothing in this plan stores credentials or PII; no auth exists (single-user local app). The "protected surface" is the IPC allowlist (sender check + Zod on every channel).

## Cost

| Item | Cost |
|---|---|
| Electron, Node toolchain, ADB, Android SDK/AVDs, Chromium debugger API | Free |
| Windows code signing (optional, only for distribution) | Paid; varies by provider, **not estimated here** |
| Cloud iOS simulator | Not in v1; vendor undecided |

All core functionality (multi-pane, frames, web-target preview, screenshots) runs locally with no required paid service.

---

## Execution Protocol
1. Both plan files exist. **No source code yet.**
2. Wait for explicit "Yes, proceed", and answer the Blocking Questions first.
3. Frontend phases 0–11 first, then B1 → B12, one phase at a time.
4. After each phase: Phase Report (What was built / Files changed / Decisions / Assumptions / Known gaps and security shortcuts / How to verify), then **"Commit this phase? (y/n)"**, then stop.
5. If blocked: **BLOCKED: [reason]**, two options, wait for decision.
6. Testing note (Windows): no iOS Simulator. iOS look is verified via frames only; Android via a local AVD or physical device.
