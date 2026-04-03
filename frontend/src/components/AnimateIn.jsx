import { useInView } from '../hooks/useAnimations'

const animations = {
  'fade-up': 'anim-fade-up',
  'fade-down': 'anim-fade-down',
  'fade-left': 'anim-fade-left',
  'fade-right': 'anim-fade-right',
  'scale': 'anim-scale',
  'blur': 'anim-blur',
  'flip': 'anim-flip',
}

/**
 * Wrapper that animates children when they scroll into view.
 * @param {string} variant - Animation type: 'fade-up' | 'fade-down' | 'fade-left' | 'fade-right' | 'scale' | 'blur' | 'flip'
 * @param {number} delay - Delay in ms
 * @param {string} className - Extra classes
 */
export default function AnimateIn({ children, variant = 'fade-up', delay = 0, className = '', as: Tag = 'div', ...rest }) {
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

/**
 * Staggered container: each direct child gets incremental delay.
 */
export function StaggerChildren({ children, variant = 'fade-up', stagger = 80, className = '', as: Tag = 'div', ...rest }) {
  const [ref, isVisible] = useInView()
  const animClass = animations[variant] || animations['fade-up']

  return (
    <Tag ref={ref} className={className} {...rest}>
      {Array.isArray(children) ? children.map((child, i) => (
        <div
          key={child?.key ?? i}
          className={`${animClass} ${isVisible ? 'anim-visible' : ''}`}
          style={{ transitionDelay: `${i * stagger}ms` }}
        >
          {child}
        </div>
      )) : children}
    </Tag>
  )
}
