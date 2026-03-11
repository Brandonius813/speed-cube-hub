import { describe, expect, it } from "vitest"
import {
  getOnboardingCompletedCount,
  hasCompletedOnboarding,
  parseOnboardingTour,
  shouldAutoLaunchOverviewTour,
  shouldTrackClubSearch,
  type OnboardingStepId,
} from "./onboarding"
import type { UserOnboarding } from "@/lib/types"

function buildOnboarding(overrides: Partial<UserOnboarding> = {}): UserOnboarding {
  return {
    user_id: "user-1",
    auto_launch_pending: true,
    profile_viewed_at: null,
    main_cube_added_at: null,
    bulk_imported_at: null,
    first_timer_solve_at: null,
    feed_visited_at: null,
    clubs_searched_at: null,
    dismissed_at: null,
    finished_at: null,
    created_at: "2026-03-11T00:00:00.000Z",
    updated_at: "2026-03-11T00:00:00.000Z",
    ...overrides,
  }
}

describe("onboarding helpers", () => {
  it("counts completed steps", () => {
    const onboarding = buildOnboarding({
      profile_viewed_at: "2026-03-11T00:00:00.000Z",
      feed_visited_at: "2026-03-11T00:00:00.000Z",
    })
    expect(getOnboardingCompletedCount(onboarding)).toBe(2)
  })

  it("detects finished onboarding", () => {
    const stepKeys: OnboardingStepId[] = [
      "profile_viewed",
      "main_cube_added",
      "bulk_imported",
      "first_timer_solve",
      "feed_visited",
      "clubs_searched",
    ]
    const onboarding = stepKeys.reduce((result, step) => {
      const mapping: Record<OnboardingStepId, keyof UserOnboarding> = {
        profile_viewed: "profile_viewed_at",
        main_cube_added: "main_cube_added_at",
        bulk_imported: "bulk_imported_at",
        first_timer_solve: "first_timer_solve_at",
        feed_visited: "feed_visited_at",
        clubs_searched: "clubs_searched_at",
      }
      return {
        ...result,
        [mapping[step]]: "2026-03-11T00:00:00.000Z",
      }
    }, buildOnboarding())

    expect(hasCompletedOnboarding(onboarding)).toBe(true)
  })

  it("only auto-launches when pending and not dismissed", () => {
    expect(shouldAutoLaunchOverviewTour(buildOnboarding())).toBe(true)
    expect(
      shouldAutoLaunchOverviewTour(buildOnboarding({ auto_launch_pending: false }))
    ).toBe(false)
    expect(
      shouldAutoLaunchOverviewTour(
        buildOnboarding({ dismissed_at: "2026-03-11T00:00:00.000Z" })
      )
    ).toBe(false)
  })

  it("parses supported tours only", () => {
    expect(parseOnboardingTour("overview")).toBe("overview")
    expect(parseOnboardingTour("wat")).toBeNull()
  })

  it("tracks only non-empty club searches", () => {
    expect(shouldTrackClubSearch("club")).toBe(true)
    expect(shouldTrackClubSearch("   ")).toBe(false)
  })
})
