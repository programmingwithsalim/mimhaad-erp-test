import type React from "react"
import { ErrorBoundary } from "@/components/error-boundary"
import { DataErrorFallback } from "@/components/data-error-fallback"
import { LoadingFallback } from "@/components/loading-fallback"

interface WithErrorHandlingOptions {
  loadingMessage?: string
  errorMessage?: string
  loadingFallback?: React.ReactNode
  errorFallback?: React.ReactNode
}

export function withErrorHandling<P extends object>(
  Component: React.ComponentType<P>,
  options: WithErrorHandlingOptions = {},
) {
  const { loadingMessage = "Loading...", errorMessage = "An error occurred", loadingFallback, errorFallback } = options

  return function WithErrorHandling(props: P & { isLoading?: boolean; error?: Error | null }) {
    const { isLoading, error, ...componentProps } = props as any

    if (isLoading) {
      return loadingFallback || <LoadingFallback message={loadingMessage} />
    }

    if (error) {
      return errorFallback || <DataErrorFallback message={errorMessage} />
    }

    return (
      <ErrorBoundary>
        <Component {...(componentProps as P)} />
      </ErrorBoundary>
    )
  }
}
