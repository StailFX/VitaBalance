import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * Hook: trigger CSS class when element enters viewport.
 * Returns [ref, isVisible].
 */
export function useInView(options = {}) {
  const { threshold = 0.15, once = true, rootMargin = '0px 0px -40px 0px' } = options
  const ref = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          if (once) observer.unobserve(el)
        } else if (!once) {
          setIsVisible(false)
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold, once, rootMargin])

  return [ref, isVisible]
}

/**
 * Hook: animated counter from 0 to target.
 */
export function useCountUp(target, options = {}) {
  const { duration = 1500, enabled = true } = options
  const [value, setValue] = useState(0)
  const frameRef = useRef(null)

  useEffect(() => {
    if (!enabled || target === 0) {
      setValue(target)
      return
    }

    const startTime = performance.now()
    const animate = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) frameRef.current = requestAnimationFrame(animate)
    }
    frameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameRef.current)
  }, [target, duration, enabled])

  return value
}
