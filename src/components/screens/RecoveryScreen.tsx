'use client'

import { useState } from 'react'
import { Home as HomeIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store'

const OPTIONS = [
  { value: 10, label: '10 min', description: 'Very gently' },
  { value: 15, label: '15 min', description: 'Easing back in' },
  { value: 20, label: '20 min', description: 'A steady start' },
  { value: 30, label: '30 min', description: 'Comfortable' },
]

export default function RecoveryScreen() {
  const { state, dispatch } = useStore()
  const { user } = state
  const [picked, setPicked] = useState<number>(15)

  if (!user) return null

  return (
    <div className="min-h-screen bg-background flex flex-col px-5 pt-16 pb-12">
      <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center mb-6">
        <HomeIcon size={22} className="text-primary-foreground" strokeWidth={1.8} />
      </div>

      <h1 className="font-heading font-bold text-3xl text-foreground tracking-tight leading-tight">
        Welcome back, {user.name.split(' ')[0]}.
      </h1>
      <p className="text-base text-muted-foreground mt-2 leading-relaxed">
        It's been a while. There's no rush — we'll rebuild gently. No streaks lost. No catching up.
      </p>

      <div className="mt-8">
        <p className="text-sm font-semibold text-foreground mb-3">
          How comfortable does studying feel today?
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => setPicked(o.value)}
              className={cn(
                'rounded-2xl border px-4 py-4 text-left transition-all',
                picked === o.value
                  ? 'border-primary/40 bg-primary/8'
                  : 'border-border bg-card hover:border-primary/30',
              )}
            >
              <p className="text-base font-semibold text-foreground">{o.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{o.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1" />

      <button
        onClick={() => dispatch({ type: 'EXIT_RECOVERY', comfortableMinutes: picked })}
        className="w-full h-14 bg-primary text-primary-foreground rounded-2xl font-semibold text-base shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform mt-8"
      >
        Place today's first brick
      </button>
      <p className="text-center text-xs text-muted-foreground mt-3">
        Your home is still here. Always.
      </p>
    </div>
  )
}
