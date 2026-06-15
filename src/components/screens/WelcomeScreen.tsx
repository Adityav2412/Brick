'use client'

import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { useStore } from '@/lib/store'

// Calm builder illustrations — stones, foundation, finished home
function StonesIllustration() {
  return (
    <svg viewBox="0 0 220 200" className="w-56 h-56" aria-hidden="true">
      <defs>
        <radialGradient id="w-sky" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#F4E4C9" />
          <stop offset="100%" stopColor="#E5CFA4" />
        </radialGradient>
      </defs>
      <circle cx="110" cy="100" r="92" fill="url(#w-sky)" />
      {/* Stacked stones */}
      <ellipse cx="110" cy="160" rx="44" ry="6" fill="#A88563" opacity="0.4" />
      <ellipse cx="110" cy="148" rx="34" ry="9" fill="#8C6C49" />
      <ellipse cx="110" cy="132" rx="28" ry="8" fill="#A88560" />
      <ellipse cx="112" cy="118" rx="22" ry="7" fill="#C09671" />
      <ellipse cx="108" cy="106" rx="16" ry="6" fill="#D4AC85" />
      <ellipse cx="110" cy="96" rx="11" ry="5" fill="#E2BE99" />
    </svg>
  )
}

function FoundationIllustration() {
  return (
    <svg viewBox="0 0 220 200" className="w-56 h-56" aria-hidden="true">
      <circle cx="110" cy="100" r="92" fill="#F0DCB4" />
      {/* Ground */}
      <rect x="40" y="130" width="140" height="30" rx="3" fill="#B89868" />
      {/* Foundation bricks */}
      {[0,1,2,3,4,5].map(i => (
        <rect key={i} x={50 + i * 20} y="118" width="18" height="10" rx="1" fill="#A65E38" stroke="#7C4220" strokeWidth="0.5" />
      ))}
      {[0,1,2,3,4].map(i => (
        <rect key={i} x={60 + i * 20} y="106" width="18" height="10" rx="1" fill="#B07A4E" stroke="#7C4220" strokeWidth="0.5" />
      ))}
      {/* Sun */}
      <circle cx="160" cy="60" r="10" fill="#F2C879" />
    </svg>
  )
}

function HomeIllustration() {
  return (
    <svg viewBox="0 0 220 200" className="w-56 h-56" aria-hidden="true">
      <circle cx="110" cy="100" r="92" fill="#F0DCB4" />
      <rect x="40" y="150" width="140" height="20" fill="#B89868" />
      <rect x="70" y="100" width="80" height="50" fill="#A65E38" />
      <path d="M62 100 L110 60 L158 100 Z" fill="#4A3A2A" />
      <rect x="103" y="120" width="14" height="30" fill="#6B4226" />
      <rect x="78" y="110" width="14" height="14" fill="#FFD982" />
      <rect x="128" y="110" width="14" height="14" fill="#FFD982" />
      <circle cx="160" cy="60" r="10" fill="#F2C879" />
      <rect x="138" y="70" width="4" height="8" fill="#8B5E3C" />
    </svg>
  )
}

const slides = [
  {
    illustration: <StonesIllustration />,
    heading: 'Welcome to Brick.',
    body: 'We build the plan.\nYou place the bricks.',
  },
  {
    illustration: <FoundationIllustration />,
    heading: 'Slow, steady,\nbuilt to last.',
    body: 'No streaks. No guilt. Just consistent, honest progress — one quiet session at a time.',
  },
  {
    illustration: <HomeIllustration />,
    heading: 'Knowledge becomes\na home.',
    body: 'Every study session lays one more brick. Watch your home rise — stage by stage — as you learn.',
  },
]

export default function WelcomeScreen() {
  const { dispatch } = useStore()
  const [slide, setSlide] = useState(0)
  const isLast = slide === slides.length - 1
  const current = slides[slide]

  return (
    <div className="min-h-screen flex flex-col bg-background px-6 py-10">
      <div className="flex justify-between items-center">
        <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-primary/80">— Brick —</p>
        <button
          onClick={() => dispatch({ type: 'NAVIGATE', screen: 'onboarding' })}
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1 px-2"
        >
          Skip
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center py-6">
        {current.illustration}
      </div>

      <div className="pb-8">
        <h1 className="font-heading text-4xl text-foreground leading-[1.05] mb-3 whitespace-pre-line">
          {current.heading}
        </h1>
        <p className="text-muted-foreground text-base leading-relaxed mb-8 whitespace-pre-line italic">
          {current.body}
        </p>

        <div className="flex items-center gap-1.5 mb-8">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === slide ? 'w-8 bg-primary' : 'w-1.5 bg-border'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>

        <button
          onClick={() => {
            if (isLast) dispatch({ type: 'NAVIGATE', screen: 'onboarding' })
            else setSlide((s) => s + 1)
          }}
          className="w-full h-14 bg-primary text-primary-foreground rounded-2xl font-heading text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-hearth"
        >
          {isLast ? (<>Begin your build <ArrowRight size={18} /></>) : 'Next'}
        </button>
      </div>
    </div>
  )
}
