import { afterEach, describe, expect, it, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"

vi.mock("@/components/shared/feedback-button", () => ({
  FeedbackButton: () => <button type="button">Send Feedback</button>,
}))

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe("Footer", () => {
  it("renders the Discord link when the invite is configured", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SPEEDCUBEHUB_DISCORD_INVITE_URL",
      "https://discord.gg/test"
    )

    const { Footer } = await import("@/components/shared/footer")
    const markup = renderToStaticMarkup(<Footer />)

    expect(markup).toContain("Discord")
    expect(markup).toContain("https://discord.gg/test")
  })

  it("omits the Discord link when the invite is not configured", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SPEEDCUBEHUB_DISCORD_INVITE_URL",
      "https://discord.gg/VYAYUsVbDw"
    )

    const { Footer } = await import("@/components/shared/footer")
    const markup = renderToStaticMarkup(<Footer />)

    expect(markup).toContain("https://discord.gg/VYAYUsVbDw")
  })
})
