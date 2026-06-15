'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import type { SessionFeedback } from '@/lib/types'
import { cn } from '@/lib/utils'

const OPTIONS: {
  value: SessionFeedback
  emoji: string
  label: string
  description: string
}[] = [
  {
    value: 'easy',
    emoji: '😊',
    label: 'Easy',
    description: 'I could have done more',
  },
  {
    value: 'comfortable',
    emoji: '🙂',
    label: 'Comfortable',
    description: 'Just right',
  },
  {
    value: 'difficult',
    emoji: '😓',
    label: 'Difficult',
    description: 'I pushed through',
  },
  {
    value: 'couldnt-finish',
    emoji: '✕',
    label: "Couldn't finish",
    description: 'Session cut short',
  },
]

export default function FeedbackModal() {
  const { state, dispatch } = useStore()
  const { pendingFeedback } = state
  const [selected, setSelected] = useState<SessionFeedback | null>(null)

  if (!pendingFeedback) return null

  const submit = () => {
    if (!selected) return
    dispatch({
      type: 'SUBMIT_FEEDBACK',
      sessionId: pendingFeedback.sessionId,
      feedback: selected,
    })
    setSelected(null)
  }

  const skip = () => {
    // Dismiss without feedback — treat as comfortable
    dispatch({
      type: 'SUBMIT_FEEDBACK',
      sessionId: pendingFeedback.sessionId,
      feedback: 'comfortable',
    })
    setSelected(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-foreground/40 backdrop-blur-sm">
      <div className="w-full max-w-[430px] mx-auto bg-card rounded-t-3xl px-5 pt-6 pb-10 animate-in slide-in-from-bottom-4 duration-300">
        {/* Handle */}
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />

        {/* Brick-placement celebration */}
        <div className="flex flex-col items-center mb-5 relative">
          <div className="relative w-16 h-12 mb-3">
            {/* Tiny rising dust puffs */}
            <span className="absolute left-2 -bottom-1 w-1.5 h-1.5 rounded-full bg-primary/20 animate-dust" />
            <span className="absolute right-2 -bottom-1 w-1.5 h-1.5 rounded-full bg-primary/20 animate-dust" style={{ animationDelay: '300ms' }} />
            <div className="absolute inset-x-0 bottom-0 h-7 w-14 mx-auto rounded-[6px] bg-gradient-to-b from-[#C88058] to-[#A65E38] shadow-warm animate-brick-place flex items-center justify-center">
              <div className="w-px h-3 bg-[#7C4528]/40" />
            </div>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
            A brick was placed
          </p>
        </div>

        <h2 className="font-extrabold text-2xl text-foreground tracking-tight text-balance mb-1 text-center">
          How did that feel?
        </h2>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed text-center italic">
          Your answer helps Brick tune tomorrow's rhythm.
        </p>


        <div className="flex flex-col gap-2.5 mb-6">
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSelected(opt.value)}
              className={cn(
                'w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border text-left transition-all active:scale-[0.98]',
                selected === opt.value
                  ? 'bg-primary border-primary shadow-sm'
                  : 'bg-background border-border hover:border-primary/30'
              )}
            >
              <span className="text-2xl w-8 text-center leading-none select-none">
                {opt.emoji}
              </span>
              <div className="flex-1">
                <p
                  className={cn(
                    'font-semibold text-sm leading-tight',
                    selected === opt.value ? 'text-primary-foreground' : 'text-foreground'
                  )}
                >
                  {opt.label}
                </p>
                <p
                  className={cn(
                    'text-xs mt-0.5',
                    selected === opt.value
                      ? 'text-primary-foreground/70'
                      : 'text-muted-foreground'
                  )}
                >
                  {opt.description}
                </p>
              </div>
              {selected === opt.value && (
                <div className="w-5 h-5 rounded-full bg-primary-foreground/20 flex items-center justify-center shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary-foreground" />
                </div>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={submit}
          disabled={!selected}
          className="w-full h-13 bg-primary text-primary-foreground rounded-2xl font-semibold text-base disabled:opacity-40 active:scale-[0.98] transition-all"
        >
          Confirm
        </button>

        <button
          onClick={skip}
          className="w-full h-11 text-muted-foreground text-sm font-medium mt-2"
        >
          Skip
        </button>
      </div>
    </div>
  )
}
