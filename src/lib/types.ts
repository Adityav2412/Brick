export type Screen =
  | 'welcome'
  | 'onboarding'
  | 'home'
  | 'plan'
  | 'session'
  | 'progress'
  | 'settings'
  | 'recovery'
  | 'welcome-back'
  | 'import'

export type SessionFeedback = 'easy' | 'comfortable' | 'difficult' | 'couldnt-finish'

export type EnergyLevel = 'good' | 'okay' | 'low'

export type LectureDifficulty = 'easy' | 'moderate' | 'heavy'

export interface User {
  name: string
  examName: string
  examDate: string
  /** Starting capacity the user reported in onboarding */
  comfortableMinutes: number
  /** Current daily target set by the psychology engine */
  currentCapacity: number
  /** Hard ceiling — the rhythm engine will never grow past this */
  maxRhythm: number
  lastStudyDate: string | null
  onboardingComplete: boolean
  totalSessions: number
  totalMinutes: number
  joinDate: string
  /** Optional avatar image data URL or URL */
  avatarUrl: string | null
  /** Psychology engine: rolling feedback counts for capacity adjustment */
  recentFeedback: SessionFeedback[]
  /** Running confidence score from the confidence engine. Crosses thresholds → rhythm tunes gently. */
  confidenceScore?: number
  /** Snapshot of (date, capacity) values used to enforce the 10%/week growth cap */
  capacityHistory?: { date: string; capacity: number }[]
  /** When true the adaptive engine is cooling down after consecutive difficult sessions */
  progressionPaused?: boolean
  /** Short note from the mentor after the last feedback */
  lastMentorNote?: string | null
  /** Today's energy check-in (set once per day) */
  todayEnergy?: EnergyLevel | null
  /** ISO date of the last energy check-in */
  energyDate?: string | null
  /** True after a long absence — surfaces a gentle recovery onboarding */
  recoveryMode?: boolean
  /** Optional internal effort score used for weighted house growth (sessions are still the visible brick count) */
  houseEffortScore?: number
  /** Highest syllabus-completion fraction ever reached. House progress never visibly decreases below this. */
  houseProgressFloor?: number
  /** Total syllabus minutes captured at the moment the floor was last set. Used to detect house expansions. */
  houseFloorTotalMinutes?: number
  /** Recent energy check-ins paired with how the session(s) actually went — used to dampen abuse of "low" energy. */
  energyHistory?: { date: string; energy: EnergyLevel; completionPct: number }[]
  /** ISO date of the last day missed-day recovery was applied. Prevents re-applying on every refresh. */
  lastRecoveryAppliedDate?: string | null
  /** One-time correction marker: 15 June 2026 brick manually credited (auto-pause bug recovery). */
  june15CreditApplied?: boolean
}

export interface Lecture {
  id: string
  name: string
  durationMinutes: number
  status: 'pending' | 'completed'
  completedDate?: string
  watchedMinutes: number
  /** Optional. Used to weight scheduling — heavy lectures consume more rhythm. */
  difficulty?: LectureDifficulty
}

export type SubjectColor = 'lavender' | 'sage' | 'amber' | 'sky' | 'rose' | 'emerald'
export type SubjectIcon = 'atom' | 'flask' | 'calculator' | 'globe' | 'book' | 'microscope' | 'landmark' | 'code'

export interface Subject {
  id: string
  name: string
  color: SubjectColor
  icon: SubjectIcon
  lectures: Lecture[]
  /** Archived subjects are kept (with full history) but excluded from active rotation. */
  archived?: boolean
}

export interface StudySessionRecord {
  id: string
  date: string
  subjectId: string
  lectureId: string
  subjectName: string
  lectureName: string
  plannedMinutes: number
  actualMinutes: number
  completed: boolean
  feedback: SessionFeedback | null
}

export interface TodayScheduleItem {
  subjectId: string
  lectureId: string
  targetMinutes: number
  watchedFrom: number
  status: 'in-progress' | 'upcoming' | 'completed'
}

export interface ActiveSession {
  subjectId: string
  lectureId: string
  targetMinutes: number
  startTime: number
  pausedAt: number | null
  totalPausedMs: number
}
