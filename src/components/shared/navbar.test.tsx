import { describe, expect, it, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { navbarTextClass } from "@/components/shared/nav-links"

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(""),
}))

vi.mock("@/components/shared/theme-toggle", () => ({
  ThemeToggle: () => <button type="button">Theme</button>,
}))

vi.mock("@/components/shared/notification-popup", () => ({
  NotificationPopup: () => <button type="button">Notifications</button>,
}))

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: () => ({
    auth: {
      onAuthStateChange: () => ({
        data: {
          subscription: {
            unsubscribe() {},
          },
        },
      }),
      signOut: async () => undefined,
    },
  }),
}))

describe("NavbarClient", () => {
  it("renders guest navigation when the initial data is logged out", async () => {
    const { NavbarClient } = await import("@/components/shared/navbar-client")
    const markup = renderToStaticMarkup(
      <NavbarClient initialData={{ isLoggedIn: false }} />
    )

    expect(markup).toContain("Log In")
    expect(markup).toContain("Sign Up")
    expect(markup).toContain("Leaderboards")
  })

  it("renders member navigation when the initial data is logged in", async () => {
    const { NavbarClient } = await import("@/components/shared/navbar-client")
    const markup = renderToStaticMarkup(
      <NavbarClient
        initialData={{
          isLoggedIn: true,
          displayName: "Brandon True",
          avatarUrl: null,
          unreadCount: 3,
          isAdmin: false,
        }}
      />
    )

    expect(markup).toContain("Timer")
    expect(markup).toContain("Feed")
    expect(markup).toContain("User menu")
    expect(markup).toContain(">BT<")
  })
})

describe("navbarTextClass", () => {
  it("uses one shared desktop typography treatment for both active and inactive labels", () => {
    expect(navbarTextClass(false)).toContain("text-sm")
    expect(navbarTextClass(false)).toContain("font-semibold")
    expect(navbarTextClass(true)).toContain("text-sm")
    expect(navbarTextClass(true)).toContain("font-semibold")
  })
})
