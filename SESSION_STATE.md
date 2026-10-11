# LazDev Device Preview — Project State & Memory

**Last Updated:** 2026-10-11 22:38  
**Repository:** [https://github.com/FearCleevan/MobilePreview.git](https://github.com/FearCleevan/MobilePreview.git)  
**Active Branch:** `main`  
**Execution Protocol:** Strict Phase-by-Phase (`phased-implementation-protocol`)

---

## 1. Project Overview & Architectural Decisions
- **Stack:** React 18 + TypeScript + Vite, Tailwind CSS v3 (not v4), Radix UI, Zustand, Sonner, `@dnd-kit`.
- **Target:** Desktop Mobile Device Previewer for Peter Paul Lazan (FearCleevan) to preview React Native (Expo), Flutter web, and web projects simultaneously across multi-device viewports.
- **Visual Signature Element:** (b) Live "viewport readout" chips pinned to frame corners (`width × height @DPRx`).
- **Core Seam:** `src/lib/bridge.ts` wraps `window.laz ?? createMockBridge()`, ensuring zero direct `ipcRenderer` calls in UI components.
- **Shared Code Architecture:** `shared/` directory (device registry, schemas, pure viewport math, IPC definitions) aliased via `@shared/*`.

---

## 2. Phase Execution Progress

| Phase | Name | Status | Git Commit |
|---|---|---|---|
| **Phase 0** | Scaffold & Pre-Phase | ✅ Complete & Verified | `d5d8461` |
| **Phase 1** | App Shell + Sidebar + Toolbar | ✅ Complete & Verified | `4627cc9` |
| **Phase 2** | Device Library Browser | ✅ Complete & Verified | `c0df1e7` |
| **Phase 3** | **Multi-Pane Preview Grid** | ⏳ **NEXT UP** | Pending user "Yes, Proceed" |
| **Phase 4** | Device Frame Renderer (SVG bezels) | ⏸ Queued | — |
| **Phase 5** | Preview Pane (WebView Host) | ⏸ Queued | — |
| **Phase 6** | Pane Toolbar & Controls | ⏸ Queued | — |
| **Phase 7** | Project Connection Panel | ⏸ Queued | — |
| **Phase 8** | Compare & Sync | ⏸ Queued | — |
| **Phase 9** | Screenshot / Export / Recording | ⏸ Queued | — |
| **Phase 10** | Settings, Themes, Shortcuts | ⏸ Queued | — |
| **Phase 11** | Integration Audit | ⏸ Queued | — |
| **Backend** | Phases B1 → B12 | ⏸ Begins after Phase 11 | — |

---

## 3. Resume Instructions for Next Session
When resuming:
1. Confirm workspace: `C:\Users\FearCleevan\Desktop\Projects\MobilePreview\lazdev-preview`
2. Run validation check:
   ```powershell
   npm run test
   npm run type-check
   npm run build
   ```
3. Await explicit **"Yes, Proceed"** to begin **Phase 3: Multi-Pane Preview Grid**:
   - `src/hooks/useGridLayout.ts` (cell dimensions & visible/overflow count)
   - `src/components/preview/PaneDragHandle.tsx` (`@dnd-kit` drag handles)
   - `src/components/preview/PaneContainer.tsx` (scale calculations, sized wrapper, undo toast)
   - `src/components/preview/PreviewGrid.tsx` (sortable grid context, roving-tabindex)
   - `src/components/preview/GridModeSelector.tsx` (toolbar layout switcher)
   - Replace placeholder stage in `MainCanvas.tsx`.
