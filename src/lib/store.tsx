'use client'

import React, { createContext, useContext, useReducer, useEffect, useState } from 'react'
import type {
  Screen,
  User,
  Subject,
  StudySessionRecord,
  TodayScheduleItem,
  ActiveSession,
  SubjectColor,
  SubjectIcon,
  SessionFeedback,
  EnergyLevel,
} from './types'
import {
  buildTodaySchedule,
  applyFeedbackToCapacity,
  isLongGap,
  daysAway,
  adjustCapacityForEnergy,
  applyMissedDayRecovery,
  computeEffortScore,
  computeEnergyHonesty,
  getSyllabusProgress,
  getHouseState,
  getMentorMessage,
  SUBJECT_COLORS,
  SUBJECT_ICONS,
} from './algorithm'
import { startReminderScheduler, stopReminderScheduler } from './reminders'

// ─── State ────────────────────────────────────────────────────────────────────

export interface AppState {
  screen: Screen
  previousScreen: Screen | null
  user: User | null
  subjects: Subject[]
  sessions: StudySessionRecord[]
  todaySchedule: TodayScheduleItem[]
  activeSession: ActiveSession | null
  /** Session just completed, awaiting feedback */
  pendingFeedback: { sessionId: string } | null
  onboardingStep: number
  draft: {
    name: string
    examName: string
    examDate: string
    comfortableMinutes: number
    maxRhythm: number
  }
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export type Action =
  | { type: 'NAVIGATE'; screen: Screen }
  | { type: 'GO_BACK' }
  | { type: 'SET_ONBOARDING_STEP'; step: number }
  | { type: 'UPDATE_DRAFT'; draft: Partial<AppState['draft']> }
  | { type: 'COMPLETE_ONBOARDING'; subjects: Subject[] }
  | { type: 'ADD_SUBJECTS'; subjects: Subject[] }
  | { type: 'UPDATE_SUBJECT'; subject: Subject }
  | { type: 'DELETE_SUBJECT'; subjectId: string }
  | { type: 'ARCHIVE_SUBJECT'; subjectId: string }
  | { type: 'UNARCHIVE_SUBJECT'; subjectId: string }
  | { type: 'START_SESSION'; subjectId: string; lectureId: string; targetMinutes: number }
  | { type: 'PAUSE_SESSION' }
  | { type: 'RESUME_SESSION' }
  | { type: 'END_SESSION'; actualSeconds: number; completed: boolean }
  | { type: 'SKIP_SESSION' }
  | { type: 'SUBMIT_FEEDBACK'; sessionId: string; feedback: SessionFeedback }
  | { type: 'SET_ENERGY'; energy: EnergyLevel }
  | { type: 'EXIT_RECOVERY'; comfortableMinutes: number }
  | { type: 'UPDATE_USER'; updates: Partial<User> }
  | { type: 'UPDATE_AVATAR'; avatarUrl: string | null }
  | { type: 'RESET_APP' }
  | { type: 'HYDRATE'; state: Partial<AppState> }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayString(): string {
  return new Date().toISOString().split('T')[0]
}

function makeId(): string {
  return Math.random().toString(36).slice(2)
}

/** Computes today's effective rhythm by applying the daily energy modifier. */
function effectiveCapacity(user: User): number {
  const isToday = user.energyDate === todayString()
  const energy = isToday ? user.todayEnergy ?? null : null
  const honesty = computeEnergyHonesty(user.energyHistory)
  return adjustCapacityForEnergy(user.currentCapacity, energy, honesty)
}

function subjectHasProgress(sub: Subject): boolean {
  return sub.lectures.some((l) => l.status === 'completed' || l.watchedMinutes > 0)
}

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState: AppState = {
  screen: 'welcome',
  previousScreen: null,
  user: null,
  subjects: [],
  sessions: [],
  todaySchedule: [],
  activeSession: null,
  pendingFeedback: null,
  onboardingStep: 0,
  draft: {
    name: '',
    examName: '',
    examDate: '',
    comfortableMinutes: 20,
    maxRhythm: 120,
  },
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'NAVIGATE':
      return { ...state, previousScreen: state.screen, screen: action.screen }

    case 'GO_BACK':
      return {
        ...state,
        screen: state.previousScreen ?? 'home',
        previousScreen: null,
      }

    case 'SET_ONBOARDING_STEP':
      return { ...state, onboardingStep: action.step }

    case 'UPDATE_DRAFT':
      return { ...state, draft: { ...state.draft, ...action.draft } }

    case 'COMPLETE_ONBOARDING': {
      const { draft } = state
      const user: User = {
        name: draft.name || 'Student',
        examName: draft.examName,
        examDate: draft.examDate,
        comfortableMinutes: draft.comfortableMinutes,
        currentCapacity: draft.comfortableMinutes,
        maxRhythm: Math.max(draft.maxRhythm, draft.comfortableMinutes),
        lastStudyDate: null,
        onboardingComplete: true,
        totalSessions: 0,
        totalMinutes: 0,
        joinDate: todayString(),
        avatarUrl: null,
        recentFeedback: [],
        confidenceScore: 0,
        todayEnergy: null,
        energyDate: null,
        recoveryMode: false,
        houseEffortScore: 0,
        houseProgressFloor: 0,
        houseFloorTotalMinutes: 0,
        energyHistory: [],
      }
      const schedule = buildTodaySchedule(action.subjects, effectiveCapacity(user), state.sessions)
      return {
        ...state,
        user,
        subjects: action.subjects,
        todaySchedule: schedule,
        screen: 'home',
        previousScreen: null,
      }
    }

    case 'ADD_SUBJECTS': {
      const merged = [...state.subjects]
      for (const sub of action.subjects) {
        const idx = merged.findIndex((s) => s.id === sub.id)
        if (idx >= 0) merged[idx] = sub
        else merged.push(sub)
      }
      const schedule = state.user
        ? buildTodaySchedule(merged, effectiveCapacity(state.user), state.sessions)
        : state.todaySchedule
      return { ...state, subjects: merged, todaySchedule: schedule }
    }

    case 'UPDATE_SUBJECT': {
      const subjects = state.subjects.map((s) =>
        s.id === action.subject.id ? action.subject : s
      )
      const schedule = state.user
        ? buildTodaySchedule(subjects, effectiveCapacity(state.user), state.sessions)
        : state.todaySchedule
      return { ...state, subjects, todaySchedule: schedule }
    }

    case 'DELETE_SUBJECT': {
      // Subjects with progress cannot be permanently deleted — they are archived
      // to preserve history, completed minutes, and house progress integrity.
      const target = state.subjects.find((s) => s.id === action.subjectId)
      const hasProgress = target ? subjectHasProgress(target) : false
      const subjects = hasProgress
        ? state.subjects.map((s) =>
            s.id === action.subjectId ? { ...s, archived: true } : s,
          )
        : state.subjects.filter((s) => s.id !== action.subjectId)
      const schedule = state.user
        ? buildTodaySchedule(subjects, effectiveCapacity(state.user), state.sessions)
        : state.todaySchedule
      return { ...state, subjects, todaySchedule: schedule }
    }

    case 'ARCHIVE_SUBJECT': {
      const subjects = state.subjects.map((s) =>
        s.id === action.subjectId ? { ...s, archived: true } : s,
      )
      const schedule = state.user
        ? buildTodaySchedule(subjects, effectiveCapacity(state.user), state.sessions)
        : state.todaySchedule
      return { ...state, subjects, todaySchedule: schedule }
    }

    case 'UNARCHIVE_SUBJECT': {
      const subjects = state.subjects.map((s) =>
        s.id === action.subjectId ? { ...s, archived: false } : s,
      )
      const schedule = state.user
        ? buildTodaySchedule(subjects, effectiveCapacity(state.user), state.sessions)
        : state.todaySchedule
      return { ...state, subjects, todaySchedule: schedule }
    }

    case 'START_SESSION':
      return {
        ...state,
        activeSession: {
          subjectId: action.subjectId,
          lectureId: action.lectureId,
          targetMinutes: action.targetMinutes,
          startTime: Date.now(),
          pausedAt: null,
          totalPausedMs: 0,
        },
        previousScreen: state.screen,
        screen: 'session',
      }

    case 'PAUSE_SESSION':
      if (!state.activeSession || state.activeSession.pausedAt !== null) return state
      return {
        ...state,
        activeSession: { ...state.activeSession, pausedAt: Date.now() },
      }

    case 'RESUME_SESSION': {
      if (!state.activeSession || state.activeSession.pausedAt === null) return state
      const paused = Date.now() - state.activeSession.pausedAt
      return {
        ...state,
        activeSession: {
          ...state.activeSession,
          pausedAt: null,
          totalPausedMs: state.activeSession.totalPausedMs + paused,
        },
      }
    }

    case 'END_SESSION': {
      if (!state.activeSession || !state.user) {
        return { ...state, activeSession: null, screen: 'home' }
      }
      const { subjectId, lectureId, targetMinutes } = state.activeSession
      const actualMinutes = Math.round(action.actualSeconds / 60)
      const targetSeconds = Math.max(1, targetMinutes * 60)
      const completionPct = action.actualSeconds / targetSeconds

      // Session-completion logic — Brick never rewards a few seconds of study.
      //   < 50%  → discarded entirely (no record, no progress, no brick)
      //   50-89% → partial: save history + watched time, no brick, no feedback
      //   ≥ 90%  → full credit: brick + feedback prompt + capacity eligible
      const tier: 'discard' | 'partial' | 'complete' =
        completionPct < 0.5 ? 'discard' : completionPct < 0.9 ? 'partial' : 'complete'

      if (tier === 'discard') {
        return { ...state, activeSession: null, screen: 'home' }
      }

      const sub = state.subjects.find((s) => s.id === subjectId)
      const lec = sub?.lectures.find((l) => l.id === lectureId)
      const today = todayString()
      const isBrick = tier === 'complete'

      const updatedSubjects = state.subjects.map((s) => {
        if (s.id !== subjectId) return s
        return {
          ...s,
          lectures: s.lectures.map((l) => {
            if (l.id !== lectureId) return l
            const newWatched = l.watchedMinutes + actualMinutes
            // Only mark a lecture "completed" once it has actually been fully
            // watched. A partial session NEVER retires a lecture; the lecture
            // simply tracks Watched / Remaining for the next session.
            const isDone = newWatched >= l.durationMinutes
            return {
              ...l,
              watchedMinutes: Math.min(newWatched, l.durationMinutes),
              status: isDone ? ('completed' as const) : ('pending' as const),
              completedDate: isDone ? today : l.completedDate,
            }
          }),
        }
      })

      // House effort: each brick = 1 visible brick, but longer sessions add a
      // tiny internal bonus (up to +0.5 per session) so the house grows in a
      // way that quietly reflects effort.
      const effortBonus = isBrick ? 1 + Math.min(0.5, actualMinutes / 60) : 0

      // Update house progress floor — visible house never decreases.
      const newSyll = getSyllabusProgress(updatedSubjects)
      const newFraction = newSyll.totalMinutes > 0 ? newSyll.completedMinutes / newSyll.totalMinutes : 0
      const prevFloor = state.user.houseProgressFloor ?? 0
      const nextFloor = Math.max(prevFloor, newFraction)
      const nextFloorTotal = nextFloor > prevFloor
        ? newSyll.totalMinutes
        : state.user.houseFloorTotalMinutes ?? newSyll.totalMinutes

      // Energy honesty tracking — record today's completion against today's energy report.
      const todayEnergyEntry =
        state.user.todayEnergy && state.user.energyDate === today
          ? [{ date: today, energy: state.user.todayEnergy, completionPct: Math.min(1, completionPct) }]
          : []
      const prevHistory = state.user.energyHistory ?? []
      const nextEnergyHistory = [...prevHistory, ...todayEnergyEntry].slice(-30)

      // Detect a house-stage advancement so the mentor can celebrate it once.
      const prevHouse = getHouseState(
        state.user.totalSessions,
        state.user.houseEffortScore,
        getSyllabusProgress(state.subjects),
        { fraction: prevFloor, totalMinutes: state.user.houseFloorTotalMinutes ?? newSyll.totalMinutes },
      )
      const projectedSessions = state.user.totalSessions + (isBrick ? 1 : 0)
      const nextHouse = getHouseState(
        projectedSessions,
        (state.user.houseEffortScore ?? 0) + effortBonus,
        newSyll,
        { fraction: nextFloor, totalMinutes: nextFloorTotal },
      )
      const stageAdvanced =
        !nextHouse.stage.isExpansion && nextHouse.level > prevHouse.level
      const stageMessage = stageAdvanced
        ? // STAGE_LINES live inside algorithm.ts via getMentorMessage; we
          // mirror the same key here so the mentor surfaces it on next mount.
          getMentorMessage({
            totalSessions: projectedSessions,
            recentFeedback: state.user.recentFeedback ?? [],
            daysSinceLastStudy: 0,
            houseStageKey: nextHouse.stage.key,
            houseStageJustChanged: true,
          })
        : null

      const updatedUser: User = {
        ...state.user,
        lastStudyDate: today,
        totalSessions: projectedSessions,
        totalMinutes: state.user.totalMinutes + actualMinutes,
        houseEffortScore: (state.user.houseEffortScore ?? 0) + effortBonus,
        houseProgressFloor: nextFloor,
        houseFloorTotalMinutes: nextFloorTotal,
        energyHistory: nextEnergyHistory,
        lastMentorNote: stageMessage ?? state.user.lastMentorNote ?? null,
      }

      const sessionId = makeId()
      const newRecord: StudySessionRecord = {
        id: sessionId,
        date: today,
        subjectId,
        lectureId,
        subjectName: sub?.name ?? '',
        lectureName: lec?.name ?? '',
        plannedMinutes: targetMinutes,
        actualMinutes,
        completed: isBrick,
        feedback: null,
      }

      const schedule = buildTodaySchedule(
        updatedSubjects,
        effectiveCapacity(updatedUser),
        state.sessions,
      )

      return {
        ...state,
        activeSession: null,
        user: updatedUser,
        subjects: updatedSubjects,
        sessions: [...state.sessions, newRecord],
        todaySchedule: schedule,
        pendingFeedback: isBrick ? { sessionId } : null,
        screen: 'home',
      }
    }

    case 'SKIP_SESSION':
      return { ...state, activeSession: null, screen: 'home' }

    case 'SUBMIT_FEEDBACK': {
      if (!state.user) return { ...state, pendingFeedback: null }

      // 10%/week growth cap relative to the rhythm from ~7 days ago
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const history = state.user.capacityHistory ?? []
      const past = [...history]
        .filter((h) => new Date(h.date).getTime() <= sevenDaysAgo.getTime())
        .pop()
      const capacity7DaysAgo = past?.capacity ?? state.user.comfortableMinutes

      const result = applyFeedbackToCapacity(
        state.user.currentCapacity,
        state.user.comfortableMinutes,
        state.user.recentFeedback,
        action.feedback,
        capacity7DaysAgo,
        state.user.maxRhythm,
        state.user.confidenceScore ?? 0,
      )

      const today = todayString()
      const newHistory = [
        ...history.filter((h) => h.date !== today),
        { date: today, capacity: result.newCapacity },
      ].slice(-30)

      const updatedUser: User = {
        ...state.user,
        currentCapacity: result.newCapacity,
        recentFeedback: result.updatedFeedback,
        confidenceScore: result.confidenceScore,
        capacityHistory: newHistory,
        progressionPaused: result.progressionPaused,
        lastMentorNote: result.note,
      }
      const updatedSessions = state.sessions.map((s) =>
        s.id === action.sessionId ? { ...s, feedback: action.feedback } : s
      )
      const schedule = buildTodaySchedule(
        state.subjects,
        effectiveCapacity(updatedUser),
        updatedSessions,
      )
      return {
        ...state,
        user: updatedUser,
        sessions: updatedSessions,
        todaySchedule: schedule,
        pendingFeedback: null,
      }
    }

    case 'SET_ENERGY': {
      if (!state.user) return state
      const updatedUser: User = {
        ...state.user,
        todayEnergy: action.energy,
        energyDate: todayString(),
      }
      const schedule = buildTodaySchedule(
        state.subjects,
        effectiveCapacity(updatedUser),
        state.sessions,
      )
      return { ...state, user: updatedUser, todaySchedule: schedule }
    }

    case 'EXIT_RECOVERY': {
      if (!state.user) return state
      const newComfortable = Math.max(5, action.comfortableMinutes)
      const updatedUser: User = {
        ...state.user,
        comfortableMinutes: newComfortable,
        currentCapacity: newComfortable,
        recoveryMode: false,
        progressionPaused: false,
        recentFeedback: [],
        confidenceScore: 0,
        lastMentorNote: "A fresh foundation. We rebuild gently.",
      }
      const schedule = buildTodaySchedule(
        state.subjects,
        effectiveCapacity(updatedUser),
        state.sessions,
      )
      return { ...state, user: updatedUser, todaySchedule: schedule, screen: 'home' }
    }

    case 'UPDATE_USER':
      if (!state.user) return state
      return { ...state, user: { ...state.user, ...action.updates } }

    case 'UPDATE_AVATAR':
      if (!state.user) return state
      return { ...state, user: { ...state.user, avatarUrl: action.avatarUrl } }

    case 'RESET_APP':
      return { ...initialState }

    case 'HYDRATE':
      return { ...state, ...action.state }

    default:
      return state
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const StoreContext = createContext<{
  state: AppState
  dispatch: React.Dispatch<Action>
} | null>(null)

const STORAGE_KEY = 'brick_v1'
const LEGACY_STORAGE_KEY = 'studycoach_v2'

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const stored =
        localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as AppState
        if (parsed.user?.onboardingComplete) {
          // Backfill missing fields for users from older versions
          if (!parsed.user.recentFeedback) parsed.user.recentFeedback = []
          if (parsed.user.confidenceScore === undefined) parsed.user.confidenceScore = 0
          if (parsed.user.avatarUrl === undefined) parsed.user.avatarUrl = null
          if (!parsed.user.capacityHistory) parsed.user.capacityHistory = []
          if (parsed.user.progressionPaused === undefined) parsed.user.progressionPaused = false
          if (parsed.user.lastMentorNote === undefined) parsed.user.lastMentorNote = null
          if (parsed.user.maxRhythm === undefined) parsed.user.maxRhythm = 120
          if (parsed.user.todayEnergy === undefined) parsed.user.todayEnergy = null
          if (parsed.user.energyDate === undefined) parsed.user.energyDate = null
          if (parsed.user.recoveryMode === undefined) parsed.user.recoveryMode = false
          if (parsed.user.houseEffortScore === undefined) {
            parsed.user.houseEffortScore = computeEffortScore(parsed.sessions ?? [])
          }
          if (parsed.user.energyHistory === undefined) parsed.user.energyHistory = []
          if (parsed.user.houseProgressFloor === undefined) {
            // Initialise the floor at the current syllabus completion so historic
            // progress is preserved going forward.
            const syll = getSyllabusProgress(parsed.subjects ?? [])
            parsed.user.houseProgressFloor =
              syll.totalMinutes > 0 ? syll.completedMinutes / syll.totalMinutes : 0
            parsed.user.houseFloorTotalMinutes = syll.totalMinutes
          }

          // ─── One-time correction: 15 June 2026 manual credit ─────────────
          // Before the timer-background fix, the app auto-paused when the
          // phone locked, under-recording a session the student genuinely
          // completed in real life. This block credits that day exactly once.
          const JUNE_15 = '2026-06-15'
          const alreadyCreditedJune15 =
            parsed.user.june15CreditApplied === true ||
            (parsed.sessions ?? []).some(
              (s) => s.date === JUNE_15 && s.completed,
            )
          if (!alreadyCreditedJune15) {
            const activeSub = (parsed.subjects ?? []).find(
              (s) => !s.archived && s.lectures.some((l) => l.status !== 'completed'),
            )
            const targetLec = activeSub?.lectures.find(
              (l) => l.status !== 'completed',
            )
            if (activeSub && targetLec) {
              const creditMinutes = Math.max(
                5,
                Math.min(
                  parsed.user.currentCapacity,
                  targetLec.durationMinutes - targetLec.watchedMinutes,
                ),
              )
              // Mark lecture watched (do not over-complete other lectures).
              const newWatched = Math.min(
                targetLec.durationMinutes,
                targetLec.watchedMinutes + creditMinutes,
              )
              const lecDone = newWatched >= targetLec.durationMinutes
              parsed.subjects = (parsed.subjects ?? []).map((s) =>
                s.id !== activeSub.id
                  ? s
                  : {
                      ...s,
                      lectures: s.lectures.map((l) =>
                        l.id !== targetLec.id
                          ? l
                          : {
                              ...l,
                              watchedMinutes: newWatched,
                              status: lecDone ? 'completed' : 'pending',
                              completedDate: lecDone ? JUNE_15 : l.completedDate,
                            },
                      ),
                    },
              )
              // Synthetic session record (one brick).
              const correctionSession: StudySessionRecord = {
                id: 'correction-2026-06-15',
                date: JUNE_15,
                subjectId: activeSub.id,
                lectureId: targetLec.id,
                subjectName: activeSub.name,
                lectureName: targetLec.name,
                plannedMinutes: creditMinutes,
                actualMinutes: creditMinutes,
                completed: true,
                feedback: null,
              }
              parsed.sessions = [...(parsed.sessions ?? []), correctionSession]
              // Counters + house progression floor.
              const effortBonus = 1 + Math.min(0.5, creditMinutes / 60)
              const syll = getSyllabusProgress(parsed.subjects)
              const newFraction =
                syll.totalMinutes > 0
                  ? syll.completedMinutes / syll.totalMinutes
                  : 0
              const prevFloor = parsed.user.houseProgressFloor ?? 0
              const nextFloor = Math.max(prevFloor, newFraction)
              parsed.user = {
                ...parsed.user,
                totalSessions: (parsed.user.totalSessions ?? 0) + 1,
                totalMinutes: (parsed.user.totalMinutes ?? 0) + creditMinutes,
                houseEffortScore:
                  (parsed.user.houseEffortScore ?? 0) + effortBonus,
                houseProgressFloor: nextFloor,
                houseFloorTotalMinutes:
                  nextFloor > prevFloor
                    ? syll.totalMinutes
                    : parsed.user.houseFloorTotalMinutes ?? syll.totalMinutes,
                lastStudyDate:
                  !parsed.user.lastStudyDate ||
                  parsed.user.lastStudyDate < JUNE_15
                    ? JUNE_15
                    : parsed.user.lastStudyDate,
                june15CreditApplied: true,
              }
            } else {
              // No eligible lecture (e.g. syllabus already complete) — still
              // mark the flag so we don't keep retrying every refresh.
              parsed.user = { ...parsed.user, june15CreditApplied: true }
            }
          }


          // Missed-day recovery — Brick eases the workload, never punishes.
          // Idempotent per day: a second refresh on the same day must NOT
          // shrink the rhythm again. We stamp `lastRecoveryAppliedDate` and
          // skip if it already matches today.
          const today = todayString()
          const away = daysAway(parsed.user.lastStudyDate)
          let startScreen: Screen = 'home'
          const alreadyAppliedToday =
            parsed.user.lastRecoveryAppliedDate === today
          if (away >= 1 && !alreadyAppliedToday) {
            const rec = applyMissedDayRecovery(
              parsed.user.currentCapacity,
              parsed.user.comfortableMinutes,
              away,
            )
            parsed.user.currentCapacity = rec.newCapacity
            parsed.user.recoveryMode = rec.recoveryMode
            parsed.user.lastRecoveryAppliedDate = today
            if (rec.mentorNote) parsed.user.lastMentorNote = rec.mentorNote
            if (rec.needsRecoveryOnboarding) {
              startScreen = 'recovery'
            } else if (isLongGap(parsed.user.lastStudyDate)) {
              startScreen = 'welcome-back'
            }
          } else if (away >= 1 && alreadyAppliedToday && isLongGap(parsed.user.lastStudyDate)) {
            // Still surface the welcome-back screen on same-day refresh,
            // but don't re-apply the capacity reduction.
            startScreen = 'welcome-back'
          }


          // Clear stale energy from a previous day
          if (parsed.user.energyDate && parsed.user.energyDate !== todayString()) {
            parsed.user.todayEnergy = null
            parsed.user.energyDate = null
          }

          // Restore an in-flight session (paused) so a refresh / device sleep
          // never destroys live progress. We force pausedAt so the timer is
          // frozen at the last persisted moment — the user must press Resume.
          let restoredSession: ActiveSession | null = null
          let restoredScreen: Screen = startScreen
          if (parsed.activeSession) {
            const a = parsed.activeSession
            restoredSession = {
              ...a,
              pausedAt: a.pausedAt ?? Date.now(),
            }
            restoredScreen = 'session'
          }

          // If we just credited 15 June and today is 15 June, the day's
          // brick is already placed — show an empty schedule so the home
          // screen surfaces "All done for today" instead of re-prompting.
          const justCreditedToday =
            !alreadyCreditedJune15 &&
            parsed.user.june15CreditApplied === true &&
            todayString() === JUNE_15
          const schedule = justCreditedToday
            ? []
            : buildTodaySchedule(
                parsed.subjects ?? [],
                effectiveCapacity(parsed.user),
                parsed.sessions ?? [],
              )
          dispatch({
            type: 'HYDRATE',
            state: {
              ...parsed,
              todaySchedule: schedule,
              activeSession: restoredSession,
              pendingFeedback: null,
              screen: restoredScreen,
            },
          })
        } else {
          dispatch({ type: 'HYDRATE', state: { ...parsed, activeSession: null } })
        }

      }
    } catch (e) {
      console.error('[Brick] Hydration error:', e)
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    startReminderScheduler()
    return () => stopReminderScheduler()
  }, [])



  useEffect(() => {
    if (!hydrated) return
    try {
      // Persist the active session in a frozen (paused) snapshot so a refresh,
      // device sleep, or accidental tab close can resume exactly where the
      // student left off. The timer never auto-starts after restore.
      const frozenSession: ActiveSession | null = state.activeSession
        ? {
            ...state.activeSession,
            pausedAt: state.activeSession.pausedAt ?? Date.now(),
          }
        : null
      const toStore: AppState = { ...state, activeSession: frozenSession }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore))
    } catch (e) {
      console.error('[Brick] Persist error:', e)
    }
  }, [state, hydrated])


  if (!hydrated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}

// ─── Backup / Restore ────────────────────────────────────────────────────────
// Brick is local-first. These helpers let the student safely export and
// re-import their full study record so a cleared browser never wipes years
// of work.

export function exportBackup(): string {
  const raw = localStorage.getItem(STORAGE_KEY) ?? '{}'
  const payload = {
    app: 'brick',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: JSON.parse(raw),
  }
  return JSON.stringify(payload, null, 2)
}

export function importBackup(json: string): { ok: true } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(json)
    const data = parsed?.data ?? parsed
    if (!data || typeof data !== 'object') {
      return { ok: false, error: 'Backup file is not in a recognised format.' }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return { ok: true }
  } catch (e) {
    return { ok: false, error: 'Could not parse the backup file.' }
  }
}

export function getSubjectById(subjects: Subject[], id: string): Subject | undefined {
  return subjects.find((s) => s.id === id)
}

export function getLectureById(
  subjects: Subject[],
  subjectId: string,
  lectureId: string
) {
  return subjects.find((s) => s.id === subjectId)?.lectures.find((l) => l.id === lectureId)
}

export function makeSampleSubjects(): Subject[] {
  const colors: SubjectColor[] = ['lavender', 'sage', 'amber']
  const icons: SubjectIcon[] = ['calculator', 'book', 'globe']
  const data = [
    {
      name: 'Maths',
      lectures: [
        { name: 'Lecture 1', dur: 45 },
        { name: 'Lecture 2', dur: 52 },
        { name: 'Lecture 3', dur: 38 },
      ],
    },
    {
      name: 'Reasoning',
      lectures: [
        { name: 'Lecture 1', dur: 42 },
        { name: 'Lecture 2', dur: 35 },
      ],
    },
    {
      name: 'English',
      lectures: [
        { name: 'Lecture 1', dur: 35 },
        { name: 'Lecture 2', dur: 28 },
      ],
    },
  ]
  return data.map((s, i) => ({
    id: makeId(),
    name: s.name,
    color: colors[i % colors.length],
    icon: icons[i % icons.length],
    lectures: s.lectures.map((l) => ({
      id: makeId(),
      name: l.name,
      durationMinutes: l.dur,
      status: 'pending' as const,
      watchedMinutes: 0,
    })),
  }))
}
