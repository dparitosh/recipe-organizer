import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from "react-error-boundary";
import "@github/spark/spark"

import App from './App.jsx'
import { ErrorFallback } from './ErrorFallback.jsx'

import "./main.css"
import "./styles/theme.css"
import "./index.css"

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <App />
    </ErrorBoundary>
  )
}
