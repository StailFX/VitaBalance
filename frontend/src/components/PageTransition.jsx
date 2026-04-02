export default function PageTransition({ children }) {
  return (
    <div className="animate-slide-up">
      {children}
    </div>
  )
}
