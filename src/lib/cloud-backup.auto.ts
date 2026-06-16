/**
 * Auto Cloud Backup — debounced, fire-and-forget.
 *
 * Rules:
 * 1. localStorage remains the source of truth.
 * 2. Only runs when a cloud backup code exists in localStorage.
 * 3. Debounces to 60 seconds — multiple rapid changes produce one upload.
 * 4. Failures are swallowed silently (console.warn only); never affects UX.
 * 5. Payload is identical to the manual "Cloud Backup" button in Settings.
 */

import { cloudBackupSave } from './cloud-backup.functions'

const STORAGE_KEY = 'brick_v1'
const CLOUD_CODE_KEY = 'brick_cloud_code_v1'
const DEBOUNCE_MS = 60_000

let timerId: ReturnType<typeof setTimeout> | null = null

/**
 * Call this after every localStorage write. It resets the 60-second debounce
 * timer. When the timer fires, it reads the current localStorage snapshot and
 * uploads it via the same server function used by manual cloud backup.
 */
export function scheduleCloudBackup(): void {
  // Clear any pending timer — only the last call within the window matters.
  if (timerId !== null) {
    clearTimeout(timerId)
    timerId = null
  }

  // Quick exit: no cloud code → user hasn't opted in → nothing to do.
  const code = safeGetItem(CLOUD_CODE_KEY)
  if (!code || code.length < 8) return

  timerId = setTimeout(() => {
    timerId = null
    void performBackup()
  }, DEBOUNCE_MS)
}

// ─── Internal ──────────────────────────────────────────────────────────────

async function performBackup(): Promise<void> {
  try {
    const code = safeGetItem(CLOUD_CODE_KEY)
    if (!code || code.length < 8) return

    const raw = safeGetItem(STORAGE_KEY)
    if (!raw) return

    const data: unknown = JSON.parse(raw)
    await cloudBackupSave({ data: { code, data } })
  } catch (e) {
    // Auto-backup failures must never surface to the user.
    console.warn('[Brick] Auto cloud backup failed (silent):', e)
  }
}

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
