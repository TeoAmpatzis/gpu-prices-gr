import { Component, type ReactNode } from 'react';
import { ErrorState } from '../ui/states';

/**
 * When a page's code fails to load (offline, or a new deploy replaced the files), the page shows the
 * translated error with "Δοκιμή ξανά" (UX-19) instead of a blank area; retrying reloads the page.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
  render() {
    return this.state.error ? <ErrorState detail={this.state.error} onRetry={() => location.reload()} /> : this.props.children;
  }
}
