export default function ProfileLoading() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="animate-pulse">
        {/* Profile header skeleton */}
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          {/* Avatar */}
          <div className="h-24 w-24 rounded-full bg-muted" />

          <div className="flex-1 space-y-3 text-center sm:text-left">
            {/* Name */}
            <div className="mx-auto h-7 w-48 rounded-md bg-muted sm:mx-0" />
            {/* Location */}
            <div className="mx-auto h-4 w-32 rounded-md bg-muted sm:mx-0" />
            {/* Follow counts */}
            <div className="mx-auto flex gap-4 sm:mx-0">
              <div className="h-4 w-24 rounded-md bg-muted" />
              <div className="h-4 w-24 rounded-md bg-muted" />
            </div>
          </div>
        </div>

        {/* Stats cards skeleton */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="h-24 rounded-lg bg-muted" />
          <div className="h-24 rounded-lg bg-muted" />
          <div className="h-24 rounded-lg bg-muted" />
          <div className="h-24 rounded-lg bg-muted" />
        </div>

        {/* PB grid skeleton */}
        <div className="mt-8 h-48 rounded-lg bg-muted" />

        {/* Chart skeleton */}
        <div className="mt-8 h-64 rounded-lg bg-muted" />
      </div>
    </main>
  )
}
