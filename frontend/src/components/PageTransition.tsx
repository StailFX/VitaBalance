import type { ReactNode } from 'react'

interface PageTransitionProps {
  children: ReactNode
}

export default function PageTransition({ children }: PageTransitionProps) {
  return (
    <div className="animate-slide-up">
      {children}
    </div>
  )
}
