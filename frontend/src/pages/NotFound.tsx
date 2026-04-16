import { Link } from 'react-router-dom'
import PageTransition from '../components/PageTransition'

export default function NotFound() {
  return (
    <PageTransition>
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="text-center max-w-md">
          <h1 className="text-[8rem] font-extrabold leading-none bg-gradient-to-br from-primary-500 to-accent-500 bg-clip-text text-transparent select-none">
            404
          </h1>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-4 mb-3">
            Страница не найдена
          </h2>
          <p className="text-gray-500 dark:text-gray-300 mb-8">
            К сожалению, запрашиваемая страница не существует или была перемещена
          </p>
          <Link
            to="/"
            className="btn-primary text-white px-8 py-3 rounded-2xl font-semibold inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            Вернуться на главную
          </Link>
        </div>
      </div>
    </PageTransition>
  )
}
