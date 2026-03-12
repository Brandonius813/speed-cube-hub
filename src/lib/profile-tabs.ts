export type ProfileTab = "pbs" | "stats" | "overview" | "cubes" | "official"

const VALID_TABS: ProfileTab[] = [
  "pbs",
  "stats",
  "overview",
  "cubes",
  "official",
]

export function parseTabParam(tab: string | null | undefined): ProfileTab {
  if (tab === "comp-sim") return "stats"
  if (tab && VALID_TABS.includes(tab as ProfileTab)) return tab as ProfileTab
  return "overview"
}

export function profileTabNeedsSessions(tab: ProfileTab): boolean {
  return tab === "overview" || tab === "stats"
}

export function profileTabNeedsPbs(tab: ProfileTab): boolean {
  return tab === "pbs"
}

export function profileTabNeedsOfficialData(tab: ProfileTab): boolean {
  return tab === "official"
}

export function profileTabNeedsOnboarding(tab: ProfileTab): boolean {
  return tab === "overview"
}
