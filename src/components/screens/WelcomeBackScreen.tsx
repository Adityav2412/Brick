'use client'

import { ArrowRight, Leaf, Zap } from 'lucide-react'
import { useStore } from '@/lib/store'
import { isLongGap } from '@/lib/algorithm'

export default function WelcomeBackScreen() {
  const { state, dispatch } = useStore()
  const { user } = state

  if (!user) return null

  const daysSince = user.lastStudyDate
    ? Math.floor(
        (Date.now() - new Date(user.lastStudyDate).getTime()) / (1000 * 60 * 60 * 24)
      )
    : null

  const hasLongGap = isLongGap(user.lastStudyDate)

  const continueNormal = () => {
    dispatch({ type: 'NAVIGATE', screen: 'home' })
  }

  const activateRecovery = () => {
    // Recovery mode is now automatic: the engine already eased today's
    // capacity on hydration. We just take the student to the home screen.
    dispatch({ type: 'NAVIGATE', screen: 'home' })
  }

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 py-12">
      {/* Illustration */}
      <div className="flex-1 flex items-center justify-center">
        <div className="relative w-52 h-52 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-primary/8" />
          <div className="absolute inset-6 rounded-full bg-primary/12" />
          <div className="w-24 h-24 bg-primary rounded-3xl flex items-center justify-center shadow-xl shadow-primary/25">
            <Leaf size={42} className="text-primary-foreground" strokeWidth={1.5} />
          </div>
          {/* Floating elements */}
          <div className="absolute top-4 right-8 w-10 h-10 bg-card rounded-xl shadow-sm flex items-center justify-center border border-border">
            <span className="text-lg">👋</span>
          </div>
          <div className="absolute bottom-8 left-4 w-10 h-10 bg-card rounded-xl shadow-sm flex items-center justify-center border border-border">
            <Zap size={16} className="text-[#C47A1A]" />
          </div>
        </div>
      </div>

      {/* Text */}
      <div className="pb-10">
        <h1 className="font-heading font-bold text-3xl text-foreground leading-tight mb-3 text-balance">
          Welcome back,{'\n'}
          {user.name.split(' ')[0]}!
        </h1>

        {hasLongGap && daysSince !== null ? (
          <p className="text-muted-foreground text-base leading-relaxed mb-2">
            It&apos;s been {daysSince} day{daysSince !== 1 ? 's' : ''} since your last session.
            No worries — every comeback counts.
          </p>
        ) : (
          <p className="text-muted-foreground text-base leading-relaxed mb-2">
            Ready to get back into it? Your plan is ready.
          </p>
        )}

        <p className="text-muted-foreground text-sm leading-relaxed mb-8">
          {hasLongGap
            ? 'Would you like to ease back in with Recovery Mode, or jump straight in?'
            : 'Let\'s pick up right where you left off.'}
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={continueNormal}
            className="w-full h-14 bg-primary text-primary-foreground rounded-2xl font-heading font-semibold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg shadow-primary/20"
          >
            Jump Straight In
            <ArrowRight size={18} />
          </button>

          {hasLongGap && (
            <button
              onClick={activateRecovery}
              className="w-full h-14 bg-[#FFF3E0] text-[#C47A1A] rounded-2xl font-heading font-semibold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-transform border border-[#F4C880]/60"
            >
              <Leaf size={18} />
              Start with Recovery Mode
            </button>
          )}
        </div>

        {hasLongGap && (
          <p className="text-center text-xs text-muted-foreground mt-4 leading-relaxed">
            Recovery Mode reduces your daily load by 50% so you can build back up gently.
          </p>
        )}
      </div>
    </div>
  )
}
