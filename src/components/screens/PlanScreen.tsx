'use client'

import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { getHouseState, getSyllabusProgress, getHouseScale, formatMinutes } from '@/lib/algorithm'
import SubjectIcon from '@/components/SubjectIcon'

export default function PlanScreen() {
  const { state, dispatch } = useStore()
  const { subjects: allSubjects, todaySchedule, sessions, user } = state
  const subjects = allSubjects.filter((s) => !s.archived)

  if (!user) return null

  const syllabus = getSyllabusProgress(subjects)
  const house = getHouseState(user.totalSessions, user.houseEffortScore, syllabus, { fraction: user.houseProgressFloor ?? 0, totalMinutes: user.houseFloorTotalMinutes ?? syllabus.totalMinutes })
  const scale = getHouseScale(syllabus.totalMinutes)

  // Subject rotation overview — last touched per subject
  const lastTouchedMap = new Map<string, number>()
  for (const s of sessions) {
    const t = new Date(s.date).getTime()
    lastTouchedMap.set(s.subjectId, Math.max(lastTouchedMap.get(s.subjectId) ?? 0, t))
  }

  const rotation = subjects
    .map((s) => {
      const last = lastTouchedMap.get(s.id)
      const pending = s.lectures.filter((l) => l.status === 'pending').length
      const daysAgo =
        last != null ? Math.floor((Date.now() - last) / 86400000) : null
      return { subject: s, daysAgo, pending }
    })
    .filter((r) => r.pending > 0)
    .sort((a, b) => {
      // Subjects never touched first, then most days ago
      const aD = a.daysAgo ?? 9999
      const bD = b.daysAgo ?? 9999
      return bD - aD
    })

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Blueprint header */}
      <div className="relative px-5 pt-14 pb-4">
        <div className="absolute inset-x-0 top-0 h-full bg-blueprint opacity-40 pointer-events-none rounded-b-3xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-primary/80">— The Blueprint —</p>
            <h1 className="font-heading text-4xl text-foreground mt-1 leading-none">Your Plan</h1>
            <p className="text-muted-foreground text-sm mt-1 italic">Drafted by Brick. Built by you.</p>
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
      </div>

      <div className="px-5 mt-4 space-y-5">
        {/* House Progress — blueprint card */}
        <div className="bg-card rounded-3xl border border-border p-5 shadow-warm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-mono font-medium text-primary/80 uppercase tracking-[0.18em]">
              {scale.label} · Progress
            </p>
            <span className="text-xs text-primary font-semibold">
              {Math.round(house.fraction * 100)}%
            </span>
          </div>
          <h2 className="font-heading text-2xl text-foreground mt-1">
            {house.stage.label}
          </h2>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            {house.description}
          </p>

          <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-4">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700"
              style={{ width: `${house.fraction * 100}%` }}
            />
          </div>

          <p className="text-[11px] text-muted-foreground mt-3">
            {formatMinutes(syllabus.completedMinutes)} of {formatMinutes(syllabus.totalMinutes)} studied
            <span className="mx-1.5">·</span>
            {house.bricks} {house.bricks === 1 ? 'brick' : 'bricks'} placed
          </p>

          {house.nextStage ? (
            <p className="text-xs text-muted-foreground mt-2">
              Next upgrade:{' '}
              <span className="text-foreground font-semibold">{house.nextStage.label}</span>{' '}
              <span className="text-muted-foreground">
                · at {Math.round(house.nextStage.fractionRequired * 100)}% of syllabus
              </span>
            </p>
          ) : (
            <p className="text-xs text-primary mt-2 font-medium">
              Your home is complete. Keep showing up — the garden keeps growing.
            </p>
          )}
        </div>

        {/* Subject Rotation Overview */}
        {rotation.length > 0 && (
          <div>
            <h3 className="font-heading text-xl text-foreground mb-3 flex items-center gap-2">
              <span className="text-primary/60 text-xs font-mono">§</span> Subject Rotation
            </h3>
            <div className="flex flex-col gap-2.5">
              {rotation.map(({ subject, daysAgo, pending }) => (
                <div
                  key={subject.id}
                  className="bg-card rounded-2xl border border-border px-4 py-3 flex items-center gap-3"
                >
                  <SubjectIcon icon={subject.icon} color={subject.color} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {subject.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {daysAgo == null
                        ? 'Not started yet'
                        : daysAgo === 0
                          ? 'Studied today'
                          : daysAgo === 1
                            ? 'Last studied yesterday'
                            : `Last studied ${daysAgo} days ago`}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {pending} pending
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Recommended Lectures (today's auto-built schedule) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading text-xl text-foreground flex items-center gap-2">
              <span className="text-primary/60 text-xs font-mono">§</span> Today's Stack
            </h3>
            {todaySchedule.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {formatMinutes(
                  todaySchedule.reduce((acc, i) => acc + i.targetMinutes, 0),
                )}{' '}
                total
              </span>
            )}
          </div>

          {todaySchedule.length === 0 ? (
            <div className="bg-card rounded-3xl border border-border p-8 text-center">
              <p className="font-heading font-semibold text-foreground mb-1">
                Nothing pending
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Add subjects and lectures, and Brick will guide the rest.
              </p>
              <button
                onClick={() => dispatch({ type: 'NAVIGATE', screen: 'settings' })}
                className="text-sm font-semibold text-primary"
              >
                Manage Subjects
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {todaySchedule.map((item, idx) => {
                const sub = subjects.find((s) => s.id === item.subjectId)
                const lec = sub?.lectures.find((l) => l.id === item.lectureId)
                if (!sub || !lec) return null
                const isFirst = idx === 0
                return (
                  <button
                    key={`${item.subjectId}-${item.lectureId}`}
                    onClick={() =>
                      dispatch({
                        type: 'START_SESSION',
                        subjectId: item.subjectId,
                        lectureId: item.lectureId,
                        targetMinutes: item.targetMinutes,
                      })
                    }
                    className={cn(
                      'w-full bg-card rounded-3xl border p-4 text-left transition-all active:scale-[0.98]',
                      isFirst ? 'border-primary/30 shadow-md shadow-primary/5' : 'border-border',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <SubjectIcon icon={sub.icon} color={sub.color} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-foreground truncate">
                            {sub.name}
                          </p>
                          <span className="font-semibold text-sm text-foreground shrink-0">
                            {item.targetMinutes} min
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5 truncate">
                          {lec.name}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">
                            {isFirst ? "Today's brick" : 'Next up'}
                          </span>
                          <ChevronRight size={14} className="text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
