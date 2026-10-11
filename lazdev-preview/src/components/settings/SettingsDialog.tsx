// src/components/settings/SettingsDialog.tsx
// Dialog stub for settings — full implementation in Phase 10.

import React from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Settings as SettingsIcon } from 'lucide-react'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onOpenChange }) => {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in-0" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg p-6 shadow-2xl z-50 focus:outline-none"
          aria-describedby="settings-dialog-description"
        >
          <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2 text-[var(--text-primary)] font-medium text-base">
              <SettingsIcon className="w-4 h-4 text-[var(--accent)]" />
              <Dialog.Title>Settings</Dialog.Title>
            </div>
            <Dialog.Close
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded hover:bg-[var(--bg-overlay)] transition-colors"
              aria-label="Close settings"
            >
              <X className="w-4 h-4" />
            </Dialog.Close>
          </div>

          <div id="settings-dialog-description" className="py-8 text-center text-sm text-[var(--text-secondary)]">
            <p>LazDev Settings & Preferences</p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">Full settings tabs will be enabled in Phase 10.</p>
          </div>

          <div className="flex justify-end pt-4 border-t border-[var(--border-subtle)]">
            <Dialog.Close
              className="px-4 py-1.5 text-xs font-medium rounded bg-[var(--bg-overlay)] text-[var(--text-primary)] hover:bg-[var(--border-default)] transition-colors"
            >
              Close
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

