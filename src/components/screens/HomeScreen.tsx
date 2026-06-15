'use client'

import { Bell, Play, ChevronRight, Home as HomeIcon, BookOpen } from 'lucide-react'
import { useStore } from '@/lib/store'
import {
  getGreeting,
  getMentorMessage,
  getHouseState,
  getSyllabusProgress,
  getHouseScale,
  formatMinutes,
  daysAway,
  adjustCapacityForEnergy,
} from '@/lib/algorithm'
import SubjectIcon from '@/components/SubjectIcon'
import CompanionAvatar from '@/components/CompanionAvatar'
import HouseScene from '@/components/HouseScene'
import type { EnergyLevel } from '@/lib/types'

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { state, dispatch } = useStore()
  const { user, subjects, todaySchedule } = state

  if (!user) return null

  const greeting = getGreeting()
  const today = new Date().toISOString().split('T')[0]
  const energySetToday = user.energyDate === today
  const todayEnergy: EnergyLevel | null = energySetToday ? (user.todayEnergy ?? null) : null

  const mentorMessage =
    user.lastMentorNote ||
    getMentorMessage({
      totalSessions: user.totalSessions,
      recentFeedback: user.recentFeedback ?? [],
      daysSinceLastStudy: daysAway(user.lastStudyDate),
      recoveryMode: user.recoveryMode,
      progressionPaused: user.progressionPaused,
      energy: todayEnergy,
    })

  const effectiveRhythm = adjustCapacityForEnergy(user.currentCapacity, todayEnergy)
  const setEnergy = (e: EnergyLevel) => dispatch({ type: 'SET_ENERGY', energy: e })

  const todayFocus = todaySchedule[0]
  const focusSubject = subjects.find((s) => s.id === todayFocus?.subjectId)
  const focusLecture = focusSubject?.lectures.find((l) => l.id === todayFocus?.lectureId)
  const syllabus = getSyllabusProgress(subjects)
  const house = getHouseState(
    user.totalSessions,
    user.houseEffortScore,
    syllabus,
    {
      fraction: user.houseProgressFloor ?? 0,
      totalMinutes: user.houseFloorTotalMinutes ?? syllabus.totalMinutes,
    },
  )
  const scale = getHouseScale(syllabus.totalMinutes)

  const daysUntilExam = user.examDate
    ? Math.max(0, Math.ceil((new Date(user.examDate).getTime() - Date.now()) / 86400000))
    : null

  const startSession = () => {
    if (!todayFocus) return
    dispatch({
      type: 'START_SESSION',
      subjectId: todayFocus.subjectId,
      lectureId: todayFocus.lectureId,
      targetMinutes: todayFocus.targetMinutes,
    })
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-14 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-warm">
            <HomeIcon size={15} className="text-primary-foreground" strokeWidth={1.8} />
          </div>
          <div className="leading-tight">
            <span className="font-extrabold text-base text-foreground tracking-tight">Brick</span>
            <p className="text-[10px] text-muted-foreground -mt-0.5 font-medium">
              {greeting}, {user.name.split(' ')[0]}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => dispatch({ type: 'NAVIGATE', screen: 'settings' })}
            className="relative w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center"
            aria-label="Reminder settings"
          >
            <Bell size={16} className="text-foreground" strokeWidth={1.8} />
          </button>
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-9 h-9 rounded-full object-cover border border-border"
            />
          ) : (
            <div
              className="w-9 h-9 rounded-full bg-primary flex items-center justify-center"
              aria-label={user.name}
            >
              <span className="text-primary-foreground font-bold text-sm">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="px-5 space-y-5">
        {/* ─── HERO: The House ─────────────────────────────────────── */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary mb-1.5">
            Your {scale.label} of Knowledge
          </p>
          <h1 className="text-[34px] font-extrabold text-foreground leading-[1.05] tracking-[-0.03em] mb-4">
            {house.stage.label}
          </h1>

          <HouseScene
            stage={house.stage}
            nextStage={house.nextStage}
            stageFraction={house.stageFraction}
            showNextPeek={!!house.nextStage}
          />

          {/* Today's quiet line about the build */}
          <p className="text-sm text-foreground/70 italic mt-3 leading-relaxed text-balance">
            {house.stage.description}
          </p>
        </div>

        {/* ─── Mentor's journal note ────────────────────────────────── */}
        <div className="bg-card/70 border border-border/60 rounded-3xl p-5 backdrop-blur-sm">
          <div className="flex items-start gap-4">
            <CompanionAvatar size={40} className="shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/80 mb-1.5">
                A note from your mentor
              </p>
              <p
                key={mentorMessage}
                className="text-foreground text-[15px] leading-relaxed italic animate-mentor-fade"
              >
                &ldquo;{mentorMessage}&rdquo;
              </p>
            </div>
          </div>
        </div>

        {/* Daily Energy Check-In */}
        {!energySetToday && (
          <div className="bg-card rounded-3xl border border-border px-4 py-4">
            <p className="text-sm font-bold text-foreground tracking-tight">
              How are you feeling today?
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 mb-3">
              Brick will tune today's session to match.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'good' as const, emoji: '😊', label: 'Good' },
                { value: 'okay' as const, emoji: '🙂', label: 'Okay' },
                { value: 'low' as const, emoji: '😴', label: 'Low' },
              ].map((o) => (
                <button
                  key={o.value}
                  onClick={() => setEnergy(o.value)}
                  className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-background py-3 hover:border-primary/40 transition-colors"
                >
                  <span className="text-xl leading-none">{o.emoji}</span>
                  <span className="text-xs font-semibold text-foreground">{o.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Today's Assignment */}
        {todayFocus && focusSubject && focusLecture ? (
          <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-warm">
            <div className="px-5 pt-4 pb-1 flex items-center justify-between">
              <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">
                Today's brick
              </p>
              <span className="text-[10px] font-mono text-muted-foreground">
                {new Date().toLocaleDateString(undefined, {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
            </div>

            <div className="px-5 pt-3 pb-5 flex items-center gap-4">
              <SubjectIcon icon={focusSubject.icon} color={focusSubject.color} size="lg" />
              <div className="flex-1 min-w-0">
                <p className="text-xl font-extrabold text-foreground leading-tight truncate tracking-tight">
                  {focusSubject.name}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5 truncate">
                  {focusLecture.name}
                </p>
                <div className="flex items-center gap-2 mt-2.5">
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                    {todayFocus.targetMinutes} min
                  </span>
                  {todayFocus.watchedFrom > 0 && (
                    <span className="text-xs text-muted-foreground italic">
                      from {todayFocus.watchedFrom}m
                    </span>
                  )}
                </div>
              </div>
            </div>

            {todaySchedule.slice(1).length > 0 && (
              <div className="border-t border-border/60 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen size={13} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-medium">
                    {todaySchedule.slice(1).length} more subject
                    {todaySchedule.slice(1).length !== 1 ? 's' : ''} after this
                  </span>
                </div>
                <button
                  onClick={() => dispatch({ type: 'NAVIGATE', screen: 'plan' })}
                  className="text-xs text-primary font-bold flex items-center gap-0.5"
                >
                  See all <ChevronRight size={12} />
                </button>
              </div>
            )}
          </div>
        ) : syllabus.totalMinutes > 0 && syllabus.completedMinutes >= syllabus.totalMinutes ? (
          <div className="bg-primary text-primary-foreground rounded-3xl p-6 flex flex-col gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary-foreground/60">
                Journey Complete
              </p>
              <h2 className="font-extrabold text-2xl mt-1 leading-tight tracking-tight">
                Your home is built.
              </h2>
              <p className="text-sm text-primary-foreground/80 mt-1 italic">
                Every brick placed. Every lecture finished. Take a breath — you earned it.
              </p>
            </div>
            <button
              onClick={() => dispatch({ type: 'NAVIGATE', screen: 'settings' })}
              className="w-full h-11 rounded-2xl bg-white/15 hover:bg-white/20 transition-colors text-sm font-bold"
            >
              Add new subjects to expand your home
            </button>
          </div>
        ) : (
          <div className="bg-card rounded-3xl border border-border p-6 text-center">
            <p className="font-bold text-foreground mb-1 tracking-tight">All done for today</p>
            <p className="text-sm text-muted-foreground italic">
              Your next brick is placed tomorrow.
            </p>
          </div>
        )}

        {/* Rhythm + countdown row */}
        <div className="flex items-stretch gap-3">
          <div className="flex-1 px-4 py-3 bg-card rounded-2xl border border-border">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
              Today's rhythm
            </p>
            <p className="text-base font-extrabold text-foreground tracking-tight">
              {formatMinutes(effectiveRhythm)}
              {todayEnergy && todayEnergy !== 'good' && effectiveRhythm !== user.currentCapacity && (
                <span className="ml-1.5 text-[10px] text-muted-foreground font-medium">
                  ({todayEnergy === 'low' ? 'low' : 'okay'})
                </span>
              )}
            </p>
          </div>
          {daysUntilExam !== null && daysUntilExam <= 120 && (
            <div className="flex-1 px-4 py-3 bg-card rounded-2xl border border-border">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider truncate">
                {user.examName}
              </p>
              <p className="text-base font-extrabold text-primary tracking-tight">
                {daysUntilExam}d left
              </p>
            </div>
          )}
        </div>

        {/* Place today's brick button */}
        {todayFocus && (
          <button
            onClick={startSession}
            className="w-full h-14 bg-primary text-primary-foreground rounded-2xl font-bold text-base flex items-center justify-center gap-2.5 active:scale-[0.98] transition-transform shadow-hearth tracking-tight"
          >
            <Play size={18} fill="currentColor" className="ml-0.5" />
            Place today's brick
          </button>
        )}
      </div>
    </div>
  )
}
