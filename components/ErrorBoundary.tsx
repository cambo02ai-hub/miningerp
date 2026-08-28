import React from 'react'

type Props = { children: React.ReactNode }
type State = { hasError: boolean }

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch() {}
  render() {
    if (this.state.hasError) {
      return <div className="p-4 text-red-600">အမှားတစ်ခု ဖြစ်ပွားခဲ့သည်</div>
    }
    return this.props.children
  }
}
