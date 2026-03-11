import type { UserOnboarding } from "@/lib/types"

export const ONBOARDING_STEP_IDS = [
  "profile_viewed",
  "main_cube_added",
  "bulk_imported",
  "first_timer_solve",
  "feed_visited",
  "clubs_searched",
] as const

export type OnboardingStepId = (typeof ONBOARDING_STEP_IDS)[number]

export const ONBOARDING_TOUR_IDS = [
  "overview",
  "main-cube",
  "bulk-import",
  "timer-basics",
  "clubs-search",
  "feed",
] as const

export type OnboardingTourId = (typeof ONBOARDING_TOUR_IDS)[number]

export type OnboardingChecklistItem = {
  step: OnboardingStepId
  label: string
  description: string
  href: string
  cta: string
}

export type OnboardingTourStep = {
  target: string | null
  title: string
  body: string
}

const STEP_TO_COLUMN: Record<OnboardingStepId, keyof UserOnboarding> = {
  profile_viewed: "profile_viewed_at",
  main_cube_added: "main_cube_added_at",
  bulk_imported: "bulk_imported_at",
  first_timer_solve: "first_timer_solve_at",
  feed_visited: "feed_visited_at",
  clubs_searched: "clubs_searched_at",
}

export const ONBOARDING_CHECKLIST: OnboardingChecklistItem[] = [
  {
    step: "profile_viewed",
    label: "See your profile",
    description: "Your stats, cubes, official results, and activity all live here.",
    href: "/profile?tour=overview",
    cta: "Take Tour",
  },
  {
    step: "main_cube_added",
    label: "Add main cubes",
    description: "Make your profile feel like your real cubing setup.",
    href: "/profile?tab=cubes&tour=main-cube",
    cta: "Add Cubes",
  },
  {
    step: "bulk_imported",
    label: "Import your data",
    description: "Bring in your old timer history so your stats start strong.",
    href: "/import?tab=chat&tour=bulk-import",
    cta: "Import Data",
  },
  {
    step: "first_timer_solve",
    label: "Try the timer",
    description: "See the built-in timer and save your first solve.",
    href: "/timer?tour=timer-basics",
    cta: "Open Timer",
  },
  {
    step: "feed_visited",
    label: "Visit the feed",
    description: "See the social side of SpeedCubeHub.",
    href: "/getting-started/feed",
    cta: "Open Feed",
  },
  {
    step: "clubs_searched",
    label: "Search clubs",
    description: "Find teams, coaching groups, and communities.",
    href: "/clubs?tour=clubs-search",
    cta: "Search Clubs",
  },
]

export const ONBOARDING_TOURS: Record<OnboardingTourId, OnboardingTourStep[]> = {
  overview: [
    {
      target: "profile-tabs",
      title: "Your cubing home base",
      body: "This is your home base. Your stats, cubes, official results, and activity all live here.",
    },
  ],
  "main-cube": [
    {
      target: "profile-tabs",
      title: "Jump between profile sections",
      body: "Use these tabs to switch between your profile sections any time.",
    },
    {
      target: "main-cubes-add",
      title: "Add your main cubes",
      body: "Add your main cubes so your profile actually looks like your cubing setup.",
    },
  ],
  "bulk-import": [
    {
      target: "import-chat-tab",
      title: "Use the bulk import path",
      body: "Start with Chat Bulk Import so you can bring in your history from another timer.",
    },
    {
      target: "import-upload",
      title: "Drop in your export",
      body: "Upload or paste your timer export here and SpeedCubeHub will help map it in.",
    },
  ],
  "timer-basics": [
    {
      target: "timer-event-select",
      title: "Choose your event",
      body: "Pick the event you want to practice before you start solving.",
    },
    {
      target: "timer-scramble",
      title: "Use the scramble area",
      body: "This shows your scramble. You can copy it or move to the next one from here.",
    },
    {
      target: "timer-settings",
      title: "Open timer settings",
      body: "Settings let you turn on things like inspection, typing mode, and tool panes.",
    },
    {
      target: "timer-readout",
      title: "Do one solve here",
      body: "This is the main timer area. Start and stop here, then save your first solve.",
    },
  ],
  "clubs-search": [
    {
      target: "clubs-search",
      title: "Find clubs here",
      body: "Clubs are where teams, coaching groups, and communities live. Start by searching one.",
    },
  ],
  feed: [
    {
      target: "feed-column",
      title: "This is the feed",
      body: "This is the social side of SpeedCubeHub. Your sessions can show up here and you can follow other cubers here.",
    },
    {
      target: "feed-highlight",
      title: "Look around here next",
      body: "Use this area to discover more cubers and keep up with what people are practicing.",
    },
  ],
}

export function parseOnboardingTour(tour: string | null | undefined): OnboardingTourId | null {
  if (!tour) return null
  return ONBOARDING_TOUR_IDS.includes(tour as OnboardingTourId)
    ? (tour as OnboardingTourId)
    : null
}

export function isOnboardingStepComplete(
  onboarding: UserOnboarding | null | undefined,
  step: OnboardingStepId
): boolean {
  if (!onboarding) return false
  return Boolean(onboarding[STEP_TO_COLUMN[step]])
}

export function getOnboardingCompletedCount(onboarding: UserOnboarding | null | undefined): number {
  return ONBOARDING_STEP_IDS.reduce(
    (count, step) => count + (isOnboardingStepComplete(onboarding, step) ? 1 : 0),
    0
  )
}

export function hasCompletedOnboarding(onboarding: UserOnboarding | null | undefined): boolean {
  return getOnboardingCompletedCount(onboarding) === ONBOARDING_STEP_IDS.length
}

export function shouldAutoLaunchOverviewTour(
  onboarding: UserOnboarding | null | undefined
): boolean {
  return Boolean(
    onboarding &&
      onboarding.auto_launch_pending &&
      !onboarding.dismissed_at &&
      !hasCompletedOnboarding(onboarding)
  )
}

export function shouldTrackClubSearch(query: string): boolean {
  return query.trim().length > 0
}
