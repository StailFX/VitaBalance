import { useInView } from '../hooks/useAnimations'
import type { ReactNode, ElementType } from 'react'

type AnimationVariant = 'fade-up' | 'fade-down' | 'fade-left' | 'fade-right' | 'scale' | 'blur' | 'flip'

const animations: Record<AnimationVariant, string> = {
  'fade-up': 'anim-fade-up',
  'fade-down': 'anim-fade-down',
  'fade-left': 'anim-fade-left',
  'fade-right': 'anim-fade-right',
  'scale': 'anim-scale',
  'blur': 'anim-blur',
  'flip': 'anim-flip',
}

interface AnimateInProps {
  children: ReactNode
  variant?: AnimationVariant
  delay?: number
  className?: string
  as?: ElementType
  [key: string]: any
}

export default function AnimateIn({
  children,
  variant = 'fade-up',
  delay = 0,
  className = '',
  as: Tag = 'div',
  ...rest
}: AnimateInProps) {
  const [ref, isVisible] = useInView()
  const animClass = animations[variant] || animations['fade-up']

  return (
    <Tag
      ref={ref}
      className={`${animClass} ${isVisible ? 'anim-visible' : ''} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      {...rest}
    >
      {children}
    </Tag>
  )
}

interface StaggerChildrenProps {
  children: ReactNode
  variant?: AnimationVariant
  stagger?: number
  className?: string
  as?: ElementType
  [key: string]: any
}

export function StaggerChildren({
  children,
  variant = 'fade-up',
  stagger = 80,
  className = '',
  as: Tag = 'div',
  ...rest
}: StaggerChildrenProps) {
  const [ref, isVisible] = useInView()
  const animClass = animations[variant] || animations['fade-up']

  return (
    <Tag ref={ref} className={className} {...rest}>
      {Array.isArray(children) ? children.map((child, i) => (
        <div
          key={(child as any)?.key ?? i}
          className={`${animClass} ${isVisible ? 'anim-visible' : ''}`}
          style={{ transitionDelay: `${i * stagger}ms` }}
        >
          {child}
        </div>
      )) : children}
    </Tag>
  )
}
