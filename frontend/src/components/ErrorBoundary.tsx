import { Component, type ReactNode, type ErrorInfo } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0d1117] px-4">
          <div className="text-center">
            <div className="w-20 h-20 rounded-3xl bg-red-100 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Что-то пошло не так</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Произошла непредвиденная ошибка</p>
            <a href="/" onClick={() => this.setState({ hasError: false })} className="btn-primary text-white px-6 py-3 rounded-2xl font-semibold inline-block">
              На главную
            </a>
          </div>
        </main>
      )
    }
    return this.props.children
  }
}
