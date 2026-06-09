import { Component } from 'react'

class ProjectsErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Projects section error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[400px] px-6">
          <div className="text-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-full mx-auto mb-5"
              style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h3 className="font-heading text-lg font-bold mb-2" style={{ color: 'var(--text-heading)' }}>
              Failed to load projects
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Something went wrong rendering this section. Try refreshing the page.
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ProjectsErrorBoundary
