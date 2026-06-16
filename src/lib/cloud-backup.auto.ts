/**
 * Auto Cloud Backup — debounced, fire-and-forget.
 *
 * Rules:
 * 1. localStorage remains the source of truth.
 * 2. Only runs when a cloud backup code exists in localStorage.
 * 3. Debounces to 60 seconds — multiple rapid changes produce one upload.
 * 4. If multiple changes happen within the debounce window, only one upload occurs.
 * 5. Failures are swallowed silently (console.warn only); never affects UX.
 * 6. Payload is identical to the manual "Cloud Backup" button in Settings.
 *
 * Mobile-safe design:
 * - setTimeout may be suspended when the app is backgrounded (phone locks).
 * - We also hook into visibilitychange ('hidden') to flush a pending backup
 *   immediately before the OS suspends the tab.
 */

import { cloudBackupSave } from './cloud-backup.functions'

// Temporary diagnostic: proves this module is loaded in the production bundle.
// Remove once auto-backup is confirmed working.
console.log('[Brick] AUTO BACKUP MODULE LOADED')

const STORAGE_KEY = 'brick_v1'
const CLOUD_CODE_KEY = 'brick_cloud_code_v1'
const DEBOUNCE_MS = 60_000

let timerId: ReturnType<typeof setTimeout> | null = null
let dirty = false
let listenerAttached = false

/**
 * Call this after every localStorage write. It resets the 60-second debounce
 * timer. When the timer fires, it reads the current localStorage snapshot and
 * uploads it via the same server function used by manual cloud backup.
 */
export function scheduleCloudBackup(): void {
  // Quick exit: no cloud code → user hasn't opted in → nothing to do.
  const code = safeGetItem(CLOUD_CODE_KEY)
  if (!code || code.length < 8) {
    console.log('[Brick:AutoBackup] No cloud code found, skipping.')
    return
  }

  dirty = true
  console.log('[Brick:AutoBackup] scheduleCloudBackup() called. Dirty flag set.')

  // Clear any pending timer — only the last call within the window matters.
  if (timerId !== null) {
    clearTimeout(timerId)
    timerId = null
  }

  timerId = setTimeout(() => {
    timerId = null
    console.log('[Brick:AutoBackup] 60s timer fired. Triggering backup.')
    void flushBackup()
  }, DEBOUNCE_MS)

  // Attach the visibilitychange listener once — flushes backup when the
  // user backgrounds the app or locks the phone, before the OS suspends timers.
  if (!listenerAttached && typeof document !== 'undefined') {
    listenerAttached = true
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && dirty) {
        console.log('[Brick:AutoBackup] App hidden with dirty state. Flushing immediately.')
        // Cancel the pending timer — we're flushing now.
        if (timerId !== null) {
          clearTimeout(timerId)
          timerId = null
        }
        void flushBackup()
      }
    })
  }
}

// ─── Internal ──────────────────────────────────────────────────────────────

async function flushBackup(): Promise<void> {
  if (!dirty) return
  dirty = false

  try {
    const code = safeGetItem(CLOUD_CODE_KEY)
    if (!code || code.length < 8) {
      console.log('[Brick:AutoBackup] performBackup: no code at flush time.')
      return
    }

    const raw = safeGetItem(STORAGE_KEY)
    if (!raw) {
      console.log('[Brick:AutoBackup] performBackup: no localStorage data.')
      return
    }

    const data: unknown = JSON.parse(raw)
    console.log('[Brick:AutoBackup] Calling cloudBackupSave...')
    await cloudBackupSave({ data: { code, data } })
    console.log('[Brick:AutoBackup] cloudBackupSave succeeded.')
  } catch (e) {
    // Auto-backup failures must never surface to the user.
    console.warn('[Brick:AutoBackup] cloudBackupSave FAILED (silent):', e)
  }
}

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

