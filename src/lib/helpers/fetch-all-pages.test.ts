import { describe, expect, it } from "vitest"

import { fetchAllPages } from "./fetch-all-pages"

describe("fetchAllPages", () => {
  it("merges data from every page in order", async () => {
    const source = [1, 2, 3, 4, 5]

    const result = await fetchAllPages(async (from, to) => ({
      data: source.slice(from, to + 1),
      error: null,
    }), 2)

    expect(result).toEqual({ data: [1, 2, 3, 4, 5] })
  })

  it("returns the query error message", async () => {
    const result = await fetchAllPages<number>(async () => ({
      data: null,
      error: { message: "page failed" },
    }))

    expect(result).toEqual({ data: [], error: "page failed" })
  })
})
