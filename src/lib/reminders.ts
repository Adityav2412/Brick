'use client'

// Brick reminders — local, mentor-style notifications.
// No backend. Uses the browser Notifications API and a lightweight interval
// scheduler. Cap is 3 reminders per local day. Tone is calm and gentle.

const STORAGE_KEY = 'brick_reminders_v1'

export interface ReminderSettings {
  enabled: boolean
  /** Local 24-h time, "HH:MM" (e.g. "20:00") */
  time: string
}

interface ReminderState extends ReminderSettings {
  /** ISO date string of the last day we delivered any reminder */
  lastDeliveredDate: string | null
  /** Number of reminders delivered on lastDeliveredDate */
  deliveredToday: number
}

const DEFAULT: ReminderState = {
  enabled: false,
  time: '20:00',
  lastDeliveredDate: null,
  deliveredToday: 0,
}

const MENTOR_LINES = [
  "Today's brick is waiting.",
  "Let's focus on today's assignment.",
  "One session is enough.",
  'Your next brick is ready.',
  "A small step today keeps the rhythm.",
]

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function readState(): ReminderState {
  if (typeof localStorage === 'undefined') return DEFAULT
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT
    return { ...DEFAULT, ...(JSON.parse(raw) as ReminderState) }
  } catch {
    return DEFAULT
  }
}

function writeState(s: ReminderState) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
}

export function getReminderSettings(): ReminderSettings {
  const s = readState()
  return { enabled: s.enabled, time: s.time }
}

export function setReminderSettings(next: ReminderSettings) {
  const cur = readState()
  writeState({ ...cur, ...next })
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission
  }
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

function pickLine(seed: number): string {
  return MENTOR_LINES[seed % MENTOR_LINES.length]
}

function shouldDeliverNow(s: ReminderState, now: Date): boolean {
  if (!s.enabled) return false
  if (notificationPermission() !== 'granted') return false
  const [hh, mm] = s.time.split(':').map((n) => parseInt(n, 10))
  if (Number.isNaN(hh) || Number.isNaN(mm)) return false

  const today = todayStr()
  // Reset daily counter when date rolls over
  const deliveredToday = s.lastDeliveredDate === today ? s.deliveredToday : 0
  if (deliveredToday >= 3) return false

  // Compute target time for today
  const target = new Date(now)
  target.setHours(hh, mm, 0, 0)

  // Window: deliver if we're within 60 minutes after the target time and
  // haven't yet delivered today's primary reminder. Each repeat fires ~45 min
  // after the previous one, up to the 3-per-day cap.
  const diffMin = (now.getTime() - target.getTime()) / 60000
  if (diffMin < 0 || diffMin > 180) return false

  if (deliveredToday === 0) return diffMin >= 0
  // Repeat reminders: ensure at least 45 min since the last delivery
  // (we approximate by gating on deliveredToday * 45)
  return diffMin >= deliveredToday * 45
}

let intervalId: ReturnType<typeof setInterval> | null = null

/** Starts the in-tab reminder scheduler. Safe to call multiple times. */
export function startReminderScheduler() {
  if (typeof window === 'undefined') return
  if (intervalId !== null) return

  const tick = () => {
    const s = readState()
    const now = new Date()
    if (!shouldDeliverNow(s, now)) return

    try {
      const today = todayStr()
      const deliveredToday = s.lastDeliveredDate === today ? s.deliveredToday : 0
      const line = pickLine(now.getHours() + deliveredToday)
      new Notification('Brick', {
        body: line,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'brick-reminder',
        silent: false,
      })
      writeState({
        ...s,
        lastDeliveredDate: today,
        deliveredToday: deliveredToday + 1,
      })
    } catch (e) {
      // Notifications may throw if permission was revoked mid-session
      console.warn('[Brick] reminder failed', e)
    }
  }

  // Check every minute
  intervalId = setInterval(tick, 60_000)
  // And once immediately
  setTimeout(tick, 1500)
}

export function stopReminderScheduler() {
  if (intervalId !== null) {
    clearInterval(intervalId)
    intervalId = null
  }
}
