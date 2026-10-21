import { Component, type ReactNode } from 'react';
import { appFailure } from '../../domain/appFailure';

export class AppBoundary extends Component<{ children: ReactNode }, { error?: unknown }> {
  state: { error?: unknown } = {};
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }
  render() {
    if (!this.state.error) return this.props.children;
    const failure = appFailure(this.state.error);
    return (
      <main className="app-error card">
        <h1>{failure.title}</h1>
        <p>{failure.detail}</p>
        <button onClick={() => location.reload()}>{failure.action}</button>
      </main>
    );
  }
}
