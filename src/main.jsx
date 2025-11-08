import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from 'react-error-boundary'
import { RecoilRoot } from 'recoil'

import App from './App.jsx'
import { ErrorFallback } from './ErrorFallback.jsx'

import './main.css'
import './styles/theme.css'
import './index.css'

const root = document.getElementById('root')

if (root) {
  createRoot(root).render(
    <RecoilRoot>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <App />
      </ErrorBoundary>
    </RecoilRoot>
  )
}
