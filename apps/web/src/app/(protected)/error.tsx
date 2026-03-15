'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service if needed
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-muted/10 rounded-lg border border-dashed border-destructive/50">
      <h2 className="text-xl font-bold text-destructive mb-2">Something went wrong!</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        An unexpected error occurred in this section of the application. 
        If the problem persists, please contact support.
      </p>
      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={() => window.location.reload()}
        >
          Reload Page
        </Button>
        <Button
          onClick={() => reset()}
        >
          Try Again
        </Button>
      </div>
    </div>
  )
}
