export default function Loading() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="animate-pulse space-y-6">
        {/* Page title skeleton */}
        <div className="space-y-2">
          <div className="h-8 w-48 rounded-md bg-muted" />
          <div className="h-4 w-72 rounded-md bg-muted" />
        </div>

        {/* Content area skeleton */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="h-24 rounded-lg bg-muted" />
          <div className="h-24 rounded-lg bg-muted" />
          <div className="h-24 rounded-lg bg-muted" />
          <div className="h-24 rounded-lg bg-muted" />
        </div>

        {/* Main content skeleton */}
        <div className="h-64 rounded-lg bg-muted" />
        <div className="h-48 rounded-lg bg-muted" />
      </div>
    </main>
  )
}
