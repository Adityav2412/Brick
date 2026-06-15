'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { parseSubjectText, SUBJECT_COLORS, SUBJECT_ICONS } from '@/lib/algorithm'
import type { Subject, SubjectColor, SubjectIcon } from '@/lib/types'

function makeId() {
  return Math.random().toString(36).slice(2)
}

// ─── Step 1: Personal Info ────────────────────────────────────────────────────

function StepPersonal() {
  const { state, dispatch } = useStore()
  const { draft } = state

  const durations = [15, 20, 25, 30, 45, 60, 90]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <label className="block text-sm font-medium text-foreground mb-2" htmlFor="name">
          What should we call you?
        </label>
        <input
          id="name"
          type="text"
          placeholder="Your name"
          value={draft.name}
          onChange={(e) =>
            dispatch({ type: 'UPDATE_DRAFT', draft: { name: e.target.value } })
          }
          className="w-full h-13 px-4 rounded-2xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-base"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-3">
          How long can you comfortably study per session?
        </label>
        <div className="grid grid-cols-4 gap-2">
          {durations.map((d) => (
            <button
              key={d}
              onClick={() =>
                dispatch({ type: 'UPDATE_DRAFT', draft: { comfortableMinutes: d } })
              }
              className={cn(
                'h-12 rounded-2xl text-sm font-semibold transition-all border',
                draft.comfortableMinutes === d
                  ? 'bg-primary text-primary-foreground border-primary shadow-md'
                  : 'bg-card text-foreground border-border hover:border-primary/40'
              )}
            >
              {d}m
            </button>
          ))}
          <button
            onClick={() =>
              dispatch({ type: 'UPDATE_DRAFT', draft: { comfortableMinutes: 120 } })
            }
            className={cn(
              'h-12 rounded-2xl text-sm font-semibold transition-all border',
              draft.comfortableMinutes === 120
                ? 'bg-primary text-primary-foreground border-primary shadow-md'
                : 'bg-card text-foreground border-border hover:border-primary/40'
            )}
          >
            2h
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Don&apos;t worry — we&apos;ll start lower and build up gently.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-3">
          On your best days, how long would you realistically like to study?
        </label>
        <div className="grid grid-cols-5 gap-2">
          {[30, 45, 60, 90, 120].map((d) => (
            <button
              key={d}
              onClick={() => dispatch({ type: 'UPDATE_DRAFT', draft: { maxRhythm: d } })}
              className={cn(
                'h-12 rounded-2xl text-sm font-semibold transition-all border',
                draft.maxRhythm === d
                  ? 'bg-primary text-primary-foreground border-primary shadow-md'
                  : 'bg-card text-foreground border-border hover:border-primary/40',
              )}
            >
              {d >= 60 ? `${d / 60}h${d % 60 ? ` ${d % 60}m` : ''}` : `${d}m`}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Brick adapts to your pace, but it will never recommend more than 2 hours in a single session.
        </p>
      </div>
    </div>
  )
}

// ─── Step 2: Exam Info ────────────────────────────────────────────────────────

function StepExam() {
  const { state, dispatch } = useStore()
  const { draft } = state

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="block text-sm font-medium text-foreground mb-2" htmlFor="exam">
          What are you preparing for?
        </label>
        <input
          id="exam"
          type="text"
          placeholder="e.g. NEET 2025, Final Exams, UPSC"
          value={draft.examName}
          onChange={(e) =>
            dispatch({ type: 'UPDATE_DRAFT', draft: { examName: e.target.value } })
          }
          className="w-full h-13 px-4 rounded-2xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-base"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2" htmlFor="date">
          When is the exam?
        </label>
        <input
          id="date"
          type="date"
          value={draft.examDate}
          min={new Date().toISOString().split('T')[0]}
          onChange={(e) =>
            dispatch({ type: 'UPDATE_DRAFT', draft: { examDate: e.target.value } })
          }
          className="w-full h-13 px-4 rounded-2xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-base"
        />
      </div>

      <div className="bg-muted rounded-2xl p-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          This helps us pace your study sessions and show you a countdown. You can always change it later.
        </p>
      </div>
    </div>
  )
}

// ─── Step 3: Import Lectures ──────────────────────────────────────────────────

function StepImport({
  subjects,
  setSubjects,
}: {
  subjects: Subject[]
  setSubjects: (s: Subject[]) => void
}) {
  const [tab, setTab] = useState<'paste' | 'manual'>('manual')
  const [pasteText, setPasteText] = useState('')
  const [parseError, setParseError] = useState('')

  const addSubject = () => {
    const colorIdx = subjects.length % SUBJECT_COLORS.length
    const iconIdx = subjects.length % SUBJECT_ICONS.length
    setSubjects([
      ...subjects,
      {
        id: makeId(),
        name: 'New Subject',
        color: SUBJECT_COLORS[colorIdx],
        icon: SUBJECT_ICONS[iconIdx],
        lectures: [],
      },
    ])
  }

  const updateSubject = (id: string, updates: Partial<Subject>) => {
    setSubjects(subjects.map((s) => (s.id === id ? { ...s, ...updates } : s)))
  }

  const removeSubject = (id: string) => {
    setSubjects(subjects.filter((s) => s.id !== id))
  }

  const addLecture = (subjectId: string) => {
    setSubjects(
      subjects.map((s) =>
        s.id === subjectId
          ? {
              ...s,
              lectures: [
                ...s.lectures,
                { id: makeId(), name: `Lecture ${s.lectures.length + 1}`, durationMinutes: 45, status: 'pending', watchedMinutes: 0 },
              ],
            }
          : s
      )
    )
  }

  const updateLecture = (
    subjectId: string,
    lectureId: string,
    updates: { name?: string; durationMinutes?: number }
  ) => {
    setSubjects(
      subjects.map((s) =>
        s.id === subjectId
          ? {
              ...s,
              lectures: s.lectures.map((l) =>
                l.id === lectureId ? { ...l, ...updates } : l
              ),
            }
          : s
      )
    )
  }

  const removeLecture = (subjectId: string, lectureId: string) => {
    setSubjects(
      subjects.map((s) =>
        s.id === subjectId
          ? { ...s, lectures: s.lectures.filter((l) => l.id !== lectureId) }
          : s
      )
    )
  }

  const parsePaste = () => {
    try {
      const parsed = parseSubjectText(pasteText)
      if (parsed.length === 0) {
        setParseError('No valid subjects found. Check the format below.')
        return
      }
      const newSubjects: Subject[] = parsed.map((s, i) => ({
        id: makeId(),
        name: s.name,
        color: SUBJECT_COLORS[i % SUBJECT_COLORS.length],
        icon: SUBJECT_ICONS[i % SUBJECT_ICONS.length],
        lectures: s.lectures.map((l) => ({
          id: makeId(),
          name: l.name,
          durationMinutes: l.durationMinutes,
          status: 'pending' as const,
          watchedMinutes: 0,
        })),
      }))
      setSubjects([...subjects, ...newSubjects])
      setPasteText('')
      setParseError('')
      setTab('manual')
    } catch {
      setParseError('Could not parse the text. Please check the format.')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs */}
      <div className="flex bg-muted rounded-xl p-1">
        {(['manual', 'paste'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 py-2 text-sm font-medium rounded-lg transition-all',
              tab === t
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground'
            )}
          >
            {t === 'manual' ? 'Manual Entry' : 'Paste Text'}
          </button>
        ))}
      </div>

      {tab === 'paste' ? (
        <div className="flex flex-col gap-3">
          <textarea
            value={pasteText}
            onChange={(e) => {
              setPasteText(e.target.value)
              setParseError('')
            }}
            placeholder={`Physics\nLecture 1 – 45 min\nLecture 2 – 38 min\n\nChemistry\nLecture 1 – 52 min`}
            rows={8}
            className="w-full px-4 py-3 rounded-2xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none font-mono"
          />
          {parseError && <p className="text-xs text-destructive">{parseError}</p>}
          <p className="text-xs text-muted-foreground">
            Format: Subject on one line, then lectures as &quot;Name – duration min&quot;
          </p>
          <button
            onClick={parsePaste}
            disabled={!pasteText.trim()}
            className="w-full h-12 bg-primary text-primary-foreground rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <Upload size={16} />
            Import Subjects
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto">
          {subjects.map((subject) => (
            <div key={subject.id} className="bg-card rounded-2xl border border-border overflow-hidden">
              {/* Subject header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60">
                <input
                  type="text"
                  value={subject.name}
                  onChange={(e) => updateSubject(subject.id, { name: e.target.value })}
                  className="flex-1 text-sm font-semibold text-foreground bg-transparent focus:outline-none"
                  placeholder="Subject name"
                />
                <button
                  onClick={() => removeSubject(subject.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  aria-label="Remove subject"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              {/* Lectures */}
              <div className="px-3 py-2 flex flex-col gap-2">
                {subject.lectures.map((lecture, li) => (
                  <div key={lecture.id} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4 text-right shrink-0">
                      {li + 1}
                    </span>
                    <input
                      type="text"
                      value={lecture.name}
                      onChange={(e) =>
                        updateLecture(subject.id, lecture.id, { name: e.target.value })
                      }
                      className="flex-1 text-sm text-foreground bg-muted rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/30"
                      placeholder="Lecture name"
                    />
                    <input
                      type="number"
                      value={lecture.durationMinutes}
                      min={5}
                      max={300}
                      onChange={(e) =>
                        updateLecture(subject.id, lecture.id, {
                          durationMinutes: parseInt(e.target.value) || 30,
                        })
                      }
                      className="w-14 text-sm text-foreground bg-muted rounded-lg px-2 py-1.5 text-center focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                    <span className="text-xs text-muted-foreground shrink-0">m</span>
                    <button
                      onClick={() => removeLecture(subject.id, lecture.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                      aria-label="Remove lecture"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addLecture(subject.id)}
                  className="flex items-center gap-1.5 text-xs text-primary font-medium py-1.5 px-2"
                >
                  <Plus size={13} />
                  Add Lecture
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={addSubject}
            className="w-full h-11 border-2 border-dashed border-border rounded-2xl flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
          >
            <Plus size={16} />
            Add Subject
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main Onboarding ──────────────────────────────────────────────────────────

const STEPS = ['About You', 'Your Exam', 'Your Subjects']

export default function OnboardingScreen() {
  const { state, dispatch } = useStore()
  const step = state.onboardingStep
  const [subjects, setSubjects] = useState<Subject[]>([])

  const canProceed = () => {
    if (step === 0) return state.draft.comfortableMinutes > 0
    if (step === 1) return true // exam info optional
    if (step === 2) {
      const total = subjects.reduce((acc, s) => acc + s.lectures.length, 0)
      return subjects.length > 0 && total > 0
    }
    return true
  }

  const next = () => {
    if (step < STEPS.length - 1) {
      dispatch({ type: 'SET_ONBOARDING_STEP', step: step + 1 })
    } else {
      dispatch({ type: 'COMPLETE_ONBOARDING', subjects })
    }
  }

  const back = () => {
    if (step === 0) {
      dispatch({ type: 'NAVIGATE', screen: 'welcome' })
    } else {
      dispatch({ type: 'SET_ONBOARDING_STEP', step: step - 1 })
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center px-5 pt-12 pb-6 gap-3">
        <button
          onClick={back}
          className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center shadow-sm"
          aria-label="Go back"
        >
          <ChevronLeft size={18} className="text-foreground" />
        </button>

        <div className="flex-1">
          {/* Progress bar */}
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1 flex-1 rounded-full transition-all duration-300',
                  i <= step ? 'bg-primary' : 'bg-border'
                )}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Step {step + 1} of {STEPS.length}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 overflow-y-auto pb-32">
        <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-primary/80 mb-1">
          {step === 0 && 'Chapter One'}
          {step === 1 && 'Chapter Two'}
          {step === 2 && 'Chapter Three'}
        </p>
        <h2 className="font-heading text-3xl text-foreground mb-1 text-balance leading-tight">
          {step === 0 && 'Tell us about yourself'}
          {step === 1 && 'What are you building toward?'}
          {step === 2 && 'Bring in your subjects'}
        </h2>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed italic">
          {step === 0 && 'A few quiet questions — so today\'s rhythm fits you.'}
          {step === 1 && 'Optional. A horizon line, gently kept in view.'}
          {step === 2 && 'Drop in your lectures. Brick handles the rest.'}
        </p>

        {step === 0 && <StepPersonal />}
        {step === 1 && <StepExam />}
        {step === 2 && <StepImport subjects={subjects} setSubjects={setSubjects} />}
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-5 pb-8 pt-4 bg-gradient-to-t from-background via-background to-transparent">
        <button
          onClick={next}
          disabled={!canProceed()}
          className="w-full h-14 bg-primary text-primary-foreground rounded-2xl font-heading font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition-transform shadow-lg shadow-primary/20"
        >
          {step === STEPS.length - 1 ? 'Begin your build' : 'Continue'}
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}
