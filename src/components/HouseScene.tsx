'use client'

import { Lock } from 'lucide-react'
import { HOUSE_STAGES } from '@/lib/algorithm'
import type { HouseStage } from '@/lib/algorithm'

// CDN illustration pointers
import stage01 from '@/assets/house/stage-01-foundation.jpg.asset.json'
import stage02 from '@/assets/house/stage-02-foundation-complete.jpg.asset.json'
import stage03 from '@/assets/house/stage-03-walls-rising.jpg.asset.json'
import stage04 from '@/assets/house/stage-04-walls-complete.jpg.asset.json'
import stage05 from '@/assets/house/stage-05-windows.jpg.asset.json'
import stage06 from '@/assets/house/stage-06-door.jpg.asset.json'
import stage07 from '@/assets/house/stage-07-roof-frame.jpg.asset.json'
import stage08 from '@/assets/house/stage-08-roof-complete.jpg.asset.json'
import stage09 from '@/assets/house/stage-09-finished.jpg.asset.json'
import expLibrary from '@/assets/house/expansion-library.jpg.asset.json'
import expReading from '@/assets/house/expansion-reading-room.jpg.asset.json'
import expGarden from '@/assets/house/expansion-garden.jpg.asset.json'
import expWorkshop from '@/assets/house/expansion-workshop.jpg.asset.json'
import expObservatory from '@/assets/house/expansion-observatory.jpg.asset.json'

// Stage-key → illustration URL.
// We have 8 main-progression illustrations (foundation → finished).
// Map the algorithm's 8 main stage keys to those frames in order.
// Mid-stage interpolation (stageFraction) is reflected by picking either
// the "in-progress" or "complete" variant within the same algorithm stage.
// This keeps the existing progression logic untouched while doubling
// the visual rewards.
const MAIN_FRAMES = [
  stage01.url, // 0 foundation start
  stage02.url, // 0 foundation complete (mid-stage view)
  stage02.url, // 1 foundation-complete
  stage03.url, // 2 walls rising (early)
  stage04.url, // 2 walls rising (full)
  stage05.url, // 3 window
  stage06.url, // 4 door
  stage07.url, // 5 roof framework
  stage08.url, // 6 roof complete
  stage09.url, // 7 finished home
]

const EXPANSION_URL: Record<string, string> = {
  'study-room':       expReading.url,
  'library':          expLibrary.url,
  'reading-corner':   expReading.url,
  'garden-expansion': expGarden.url,
  'workshop':         expWorkshop.url,
  'observatory':      expObservatory.url,
}

/** Resolve the most rewarding visual frame for a given algorithm stage. */
export function resolveStageFrame(stage: HouseStage, stageFraction: number): string {
  if (stage.isExpansion) return EXPANSION_URL[stage.key] ?? stage09.url
  // Map stage index 0..7 onto MAIN_FRAMES with mid-stage variants for 0 and 2.
  switch (stage.index) {
    case 0: return stageFraction > 0.45 ? MAIN_FRAMES[1] : MAIN_FRAMES[0]
    case 1: return MAIN_FRAMES[2]
    case 2: return stageFraction > 0.5 ? MAIN_FRAMES[4] : MAIN_FRAMES[3]
    case 3: return MAIN_FRAMES[5]
    case 4: return MAIN_FRAMES[6]
    case 5: return MAIN_FRAMES[7]
    case 6: return MAIN_FRAMES[8]
    case 7: return MAIN_FRAMES[9]
    default: return MAIN_FRAMES[9]
  }
}

interface HouseSceneProps {
  stage: HouseStage
  nextStage: HouseStage | null
  stageFraction: number
  showNextPeek?: boolean
  /** Adds a subtle re-entry animation when the stage just changed. */
  animateIn?: boolean
}

export default function HouseScene({
  stage,
  nextStage,
  stageFraction,
  showNextPeek = true,
  animateIn = false,
}: HouseSceneProps) {
  const current = resolveStageFrame(stage, stageFraction)
  const next = nextStage ? resolveStageFrame(nextStage, 0) : null

  return (
    <div className="space-y-3">
      {/* Hero illustration */}
      <div
        className={
          'relative aspect-square w-full rounded-[28px] overflow-hidden bg-[#F4ECDA] dark:bg-[#2B2218] border border-border/60 shadow-warm ' +
          (animateIn ? 'animate-house-grow' : '')
        }
      >
        <img
          src={current}
          alt={`${stage.label} — your house of knowledge`}
          width={1024}
          height={1024}
          className="absolute inset-0 w-full h-full object-cover select-none"
          draggable={false}
        />
        {/* Soft top vignette so labels read */}
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#F2EAD9]/60 to-transparent pointer-events-none" />

        <div className="absolute top-4 left-5 right-5 flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#6B4A2A]/80 dark:text-primary/80">
            Stage {Math.min(stage.index + 1, HOUSE_STAGES.length)}
          </span>
          {stage.isExpansion && (
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              Expansion
            </span>
          )}
        </div>
      </div>

      {/* Next stage peek — only the immediate next, faded + locked */}
      {showNextPeek && next && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-card/60 border border-border/60">
          <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-muted shrink-0">
            <img
              src={next}
              alt=""
              width={1024}
              height={1024}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover opacity-50 saturate-[0.6] blur-[1px]"
              draggable={false}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-background/30">
              <Lock size={14} className="text-foreground/60" strokeWidth={2.2} />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Next up
            </p>
            <p className="text-sm font-bold text-foreground truncate">
              {nextStage!.label}
            </p>
            <p className="text-xs text-muted-foreground italic truncate">
              {nextStage!.description}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
