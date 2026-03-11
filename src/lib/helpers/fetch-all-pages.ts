type PagedQueryResult<T> = {
  data: T[] | null
  error: unknown
}

function getErrorMessage(error: unknown) {
  if (typeof error === "string") return error
  if (error instanceof Error) return error.message
  if (error && typeof error === "object" && "message" in error) {
    const { message } = error as { message?: unknown }
    if (typeof message === "string") return message
  }
  return "Unknown error"
}

export async function fetchAllPages<T>(
  queryFn: (from: number, to: number) => PromiseLike<PagedQueryResult<T>>,
  pageSize = 1000,
): Promise<{ data: T[]; error?: string }> {
  const all: T[] = []
  const effectivePageSize = pageSize > 0 ? pageSize : 1000
  let from = 0

  while (true) {
    const { data, error } = await queryFn(from, from + effectivePageSize - 1)
    if (error) {
      return { data: [], error: getErrorMessage(error) }
    }
    if (!data || data.length === 0) {
      break
    }

    all.push(...data)

    if (data.length < effectivePageSize) {
      break
    }

    from += effectivePageSize
  }

  return { data: all }
}
