'use client'

import { BookOpen, TrendingUp, Sparkles, Layers, Check, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { formatMinutes, getHouseState, getSyllabusProgress, getHouseScale, HOUSE_STAGES } from '@/lib/algorithm'
import SubjectIcon from '@/components/SubjectIcon'
import { resolveStageFrame } from '@/components/HouseScene'

// ─── House of Knowledge Timeline ──────────────────────────────────────────────

function HouseTimeline({ level }: { level: number }) {
  return (
    <div className="flex flex-col gap-2.5">
      {HOUSE_STAGES.map((stage, i) => {
        const isCompleted = i < level
        const isCurrent = i === level
        const isLocked = i > level
        const frame = resolveStageFrame(stage, isCompleted || isCurrent ? 1 : 0)
        return (
          <div
            key={stage.key}
            className={cn(
              'flex items-center gap-3 p-2.5 rounded-2xl transition-all border',
              isCurrent
                ? 'bg-primary/8 border-primary/30'
                : isCompleted
                  ? 'bg-card border-border/60'
                  : 'bg-card/50 border-border/40',
            )}
          >
            {/* Mini illustration */}
            <div
              className={cn(
                'relative w-14 h-14 rounded-xl overflow-hidden bg-muted shrink-0 border',
                isCurrent ? 'border-primary/40' : 'border-border/60',
              )}
            >
              <img
                src={frame}
                alt=""
                width={1024}
                height={1024}
                loading="lazy"
                className={cn(
                  'absolute inset-0 w-full h-full object-cover',
                  isLocked && 'opacity-40 saturate-[0.5] blur-[0.5px]',
                )}
                draggable={false}
              />
              {isLocked && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/30">
                  <Lock size={14} className="text-foreground/60" strokeWidth={2.2} />
                </div>
              )}
              {isCompleted && (
                <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                  <Check size={10} className="text-primary-foreground" strokeWidth={3} />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  'text-sm font-bold leading-tight tracking-tight',
                  isLocked ? 'text-muted-foreground/60' : 'text-foreground',
                )}
              >
                {stage.label}
                {stage.isExpansion && (
                  <span className="ml-1.5 text-[9px] uppercase tracking-wider text-primary/70 font-bold">
                    · Expansion
                  </span>
                )}
              </p>
              <p
                className={cn(
                  'text-xs italic mt-0.5 leading-snug truncate',
                  isLocked ? 'text-muted-foreground/40' : 'text-muted-foreground',
                )}
              >
                {stage.description}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}


// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ProgressScreen() {
  const { state } = useStore()
  const { user, subjects } = state

  if (!user) return null

  const syllabus = getSyllabusProgress(subjects)
  const house = getHouseState(user.totalSessions, user.houseEffortScore, syllabus, { fraction: user.houseProgressFloor ?? 0, totalMinutes: user.houseFloorTotalMinutes ?? syllabus.totalMinutes })
  const scale = getHouseScale(syllabus.totalMinutes)

  // Subject-level progress
  const subjectProgress = subjects.map((s) => {
    const total = s.lectures.length
    const done = s.lectures.filter((l) => l.status === 'completed').length
    return { subject: s, total, done }
  })

  const totalLecturesDone = subjectProgress.reduce((acc, s) => acc + s.done, 0)
  const totalLectures = subjectProgress.reduce((acc, s) => acc + s.total, 0)
  const remainingLectures = Math.max(0, totalLectures - totalLecturesDone)

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="px-5 pt-14 pb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-primary/80">— The Journey —</p>
          <h1 className="font-heading text-4xl text-foreground leading-none mt-1">Your Story</h1>
          <p className="text-muted-foreground text-sm mt-1 italic">Every brick, remembered.</p>
        </div>
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="w-10 h-10 rounded-full object-cover border border-border shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-semibold text-sm">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      <div className="px-5 space-y-5">
        {/* Rhythm row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-3xl border border-border p-4 flex flex-col gap-2">
            <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
              <Sparkles size={18} className="text-muted-foreground" />
            </div>
            <div>
              <p className="font-heading text-3xl text-foreground">
                {formatMinutes(user.comfortableMinutes)}
              </p>
              <p className="text-xs text-muted-foreground font-medium">Started Rhythm</p>
            </div>
          </div>

          <div className="bg-primary rounded-3xl p-4 flex flex-col gap-2 shadow-warm">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <TrendingUp size={18} className="text-primary-foreground" />
            </div>
            <div>
              <p className="font-heading text-3xl text-primary-foreground">
                {formatMinutes(user.currentCapacity)}
              </p>
              <p className="text-xs text-primary-foreground/70 font-medium">
                Today's Rhythm
              </p>
            </div>
          </div>

          <div className="bg-card rounded-3xl border border-border p-4 flex flex-col gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#E8DECE] flex items-center justify-center">
              <BookOpen size={18} className="text-[#6B4A2A]" />
            </div>
            <div>
              <p className="font-heading text-3xl text-foreground">
                {totalLecturesDone}
              </p>
              <p className="text-xs text-muted-foreground font-medium">Lectures Completed</p>
            </div>
          </div>

          <div className="bg-card rounded-3xl border border-border p-4 flex flex-col gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#F0DCB4] flex items-center justify-center">
              <Layers size={18} className="text-[#8B5E2C]" />
            </div>
            <div>
              <p className="font-heading text-3xl text-foreground">
                {remainingLectures}
              </p>
              <p className="text-xs text-muted-foreground font-medium">Remaining Lectures</p>
            </div>
          </div>
        </div>

        {/* House of Knowledge timeline */}
        <div className="bg-card rounded-3xl border border-border p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-base text-foreground tracking-tight">
              Your {scale.label} of Knowledge
            </h3>
            <span className="text-xs text-primary font-semibold">
              {Math.round(house.fraction * 100)}%
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-1">
            {house.stage.label} — {house.description}
          </p>
          <p className="text-[11px] text-muted-foreground/70 mb-5">
            {formatMinutes(syllabus.completedMinutes)} of {formatMinutes(syllabus.totalMinutes)} studied
          </p>

          <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-5">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700"
              style={{ width: `${house.fraction * 100}%` }}
            />
          </div>

          <HouseTimeline level={house.level} />
        </div>

        {/* Subject breakdown — simple completion only */}
        {subjectProgress.length > 0 && (
          <div>
            <h3 className="font-semibold text-base text-foreground tracking-tight mb-3">
              By Subject
            </h3>
            <div className="flex flex-col gap-3">
              {subjectProgress.map(({ subject, total, done }) => {
                const pct = total > 0 ? Math.round((done / total) * 100) : 0
                return (
                  <div
                    key={subject.id}
                    className="bg-card rounded-3xl border border-border p-4"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <SubjectIcon icon={subject.icon} color={subject.color} size="sm" />
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <p className="text-sm font-semibold text-foreground">{subject.name}</p>
                          <p className="text-xs font-semibold text-primary">{pct}%</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {done}/{total} lectures complete
                        </p>
                      </div>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-success rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
