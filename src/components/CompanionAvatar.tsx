'use client'

import { cn } from '@/lib/utils'

/**
 * Companion — Brick's calm, mature mentor figure.
 *
 * Rendered as a quiet SVG silhouette: a softly-lit figure inside a circular
 * frame. Intentionally not a cartoon mascot. Designed to feel trustworthy,
 * stable, and present without being decorative.
 */
export default function CompanionAvatar({
  size = 40,
  className,
}: {
  size?: number
  className?: string
}) {
  return (
    <div
      className={cn(
        'shrink-0 rounded-full bg-primary flex items-center justify-center overflow-hidden',
        className,
      )}
      style={{ width: size, height: size }}
      aria-label="Your Brick mentor"
    >
      <svg
        viewBox="0 0 40 40"
        width={size}
        height={size}
        aria-hidden="true"
      >
        {/* Soft inner glow */}
        <defs>
          <radialGradient id="brick-companion-glow" cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="40" height="40" fill="url(#brick-companion-glow)" />
        {/* Shoulders */}
        <path
          d="M6 36 C 9 27, 14 24, 20 24 C 26 24, 31 27, 34 36 Z"
          fill="currentColor"
          className="text-primary-foreground/85"
        />
        {/* Head */}
        <circle cx="20" cy="16" r="6.4" className="fill-primary-foreground/90" />
        {/* Subtle highlight */}
        <ellipse cx="17.5" cy="14" rx="1.8" ry="1.1" className="fill-primary-foreground/60" />
      </svg>
    </div>
  )
}
