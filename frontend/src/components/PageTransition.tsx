import { useEffect, type ReactNode } from 'react'

interface PageTransitionProps {
  children: ReactNode
}

let hasRenderedInitialPage = false

export default function PageTransition({ children }: PageTransitionProps) {
  const shouldSkipAnimation =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const shouldAnimate = hasRenderedInitialPage && !shouldSkipAnimation

  useEffect(() => {
    hasRenderedInitialPage = true
  }, [])

  return (
    <div className={shouldAnimate ? 'animate-slide-up' : undefined}>
      {children}
    </div>
  )
}
