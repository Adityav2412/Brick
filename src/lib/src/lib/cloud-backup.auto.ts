import { cloudBackupSave } from './cloud-backup.functions'

const CLOUD_CODE_KEY = 'brick_cloud_code_v1'
const STORAGE_KEY = 'brick_v1'

let timeout: ReturnType<typeof setTimeout> | null = null

export function scheduleCloudBackup() {
  const code = localStorage.getItem(CLOUD_CODE_KEY)

  if (!code) return

  if (timeout) {
    clearTimeout(timeout)
  }

  timeout = setTimeout(async () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return

      const data = JSON.parse(raw)

      await cloudBackupSave({
        data: {
          code,
          data,
        },
      })

      console.log('[Brick] Auto backup completed')
    } catch (error) {
      console.error('[Brick] Auto backup failed:', error)
    }
  }, 60000)
}
