'use client'

import {
  Atom,
  FlaskConical,
  Calculator,
  Globe,
  BookOpen,
  Microscope,
  Landmark,
  Code,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SubjectColor, SubjectIcon } from '@/lib/types'

interface Props {
  icon: SubjectIcon
  color: SubjectColor
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const ICON_MAP: Record<SubjectIcon, React.ElementType> = {
  atom: Atom,
  flask: FlaskConical,
  calculator: Calculator,
  globe: Globe,
  book: BookOpen,
  microscope: Microscope,
  landmark: Landmark,
  code: Code,
}

const BG_MAP: Record<SubjectColor, string> = {
  lavender: 'bg-[#E8DECE]',
  sage:     'bg-[#DCE3D2]',
  amber:    'bg-[#F0DCB4]',
  sky:      'bg-[#D8E2DE]',
  rose:     'bg-[#EBD2C4]',
  emerald:  'bg-[#D4DDC9]',
}

const COLOR_MAP: Record<SubjectColor, string> = {
  lavender: 'text-[#6B5337]',
  sage:     'text-[#5A6B47]',
  amber:    'text-[#8B5E2C]',
  sky:      'text-[#4A6358]',
  rose:     'text-[#A0522D]',
  emerald:  'text-[#4F6939]',
}

const SIZE_MAP = {
  sm: { wrapper: 'w-9 h-9 rounded-xl', icon: 16 },
  md: { wrapper: 'w-12 h-12 rounded-2xl', icon: 20 },
  lg: { wrapper: 'w-14 h-14 rounded-2xl', icon: 24 },
}

export default function SubjectIcon({ icon, color, size = 'md', className }: Props) {
  const IconComponent = ICON_MAP[icon] ?? BookOpen
  const { wrapper, icon: iconSize } = SIZE_MAP[size]

  return (
    <div
      className={cn(
        'flex items-center justify-center flex-shrink-0',
        BG_MAP[color],
        wrapper,
        className
      )}
    >
      <IconComponent size={iconSize} className={COLOR_MAP[color]} strokeWidth={1.8} />
    </div>
  )
}
