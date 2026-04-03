import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string
}

export default function Input({ className = '', ...props }: InputProps) {
  return (
    <input
      className={`w-full px-4 py-3 bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white dark:focus:bg-white/[0.08] outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 ${className}`}
      {...props}
    />
  )
}
