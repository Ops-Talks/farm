import React, { type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

// ---------------------------------------------------------------------------
// Default fallback UI shown when no custom `fallback` prop is provided.
// ---------------------------------------------------------------------------

function ErrorFallback({ error }: { error: Error | null }) {
  return (
    <Card className="mx-auto max-w-lg border-destructive/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <CardTitle className="text-destructive">Something went wrong</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {error?.message ?? 'An unexpected error occurred.'}
        </p>
        {/* Reload the page — gives the user an escape hatch without needing
            access to the React tree's `reset` callback. */}
        <Button variant="outline" onClick={() => window.location.reload()}>
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// ErrorBoundary — generic class component that catches render-time errors.
// ---------------------------------------------------------------------------

interface ErrorBoundaryProps {
  /** Content to protect. */
  children: ReactNode;
  /**
   * Optional custom fallback rendered when an error is caught.
   * When omitted, the built-in `ErrorFallback` card is shown.
   */
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  /** Derive error state from the thrown value — called during render. */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  /** Side-effect hook — log full error details after the tree has committed. */
  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error(error, info);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Prefer caller-supplied fallback; fall back to the default card UI.
      return this.props.fallback !== undefined ? (
        this.props.fallback
      ) : (
        <ErrorFallback error={this.state.error} />
      );
    }

    return this.props.children;
  }
}
