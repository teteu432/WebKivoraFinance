import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCcw } from 'lucide-react'
import Brand from './Brand'

type Props = { children: ReactNode }
type State = { hasError: boolean }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Web Kivora Finance — erro não tratado', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="fatal-error-page">
        <div className="fatal-error-card">
          <Brand />
          <div className="fatal-error-icon"><AlertTriangle size={24} /></div>
          <h1>Algo não saiu como esperado</h1>
          <p>Seus dados não foram apagados. Recarregue a aplicação para tentar novamente.</p>
          <button className="primary-btn" type="button" onClick={() => window.location.reload()}>
            <RefreshCcw size={17} /> Recarregar aplicação
          </button>
        </div>
      </div>
    )
  }
}
