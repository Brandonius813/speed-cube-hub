/**
 * Pre-written message text for the chat-based import experience.
 * Pure data — no React, no side effects. Easy to review and edit the copy.
 */

export const GREETING = `Hey! I'll help you import your solve data into Speed Cube Hub.\n\nWhich timer app are you coming from?`

export const TIMER_INSTRUCTIONS: Record<string, { intro: string; steps: string }> = {
  cstimer: {
    intro: "Great — csTimer is fully supported!",
    steps: `Here's how to export your data:\n\n1. Open **cstimer.net** in your browser\n2. Click **Session** (next to your session name) to open the Session Manager\n3. Click the **...** button on the right side of the session you want to export\n4. Select **Export CSV**\n5. It'll download a **.csv** file with that session's solves\n\nUpload that file below. You can repeat this for each session/event you want to import.`,
  },
  cubetime: {
    intro: "CubeTime is fully supported!",
    steps: `Here's how to export your data:\n\n1. Open **CubeTime** on your iPhone or iPad\n2. Go to the **Sessions** menu\n3. Tap the **Export** button in the top-left\n4. Select **one session** to export\n5. CubeTime allows multi-session export, but export **one session at a time** so Speed Cube Hub maps it correctly\n6. Tap **Continue**\n7. Choose **CSV** (not ODF or JSON), then tap **Confirm Export**\n8. Save or share that file\n\nUpload that CSV file below. Repeat for each session you want to import.`,
  },
  twistytimer: {
    intro: "Twisty Timer is fully supported!",
    steps: `Here's how to export your data:\n\n1. Open **Twisty Timer** on your Android device\n2. Tap the **three dots** menu (top-right)\n3. Tap **Export / Import**\n4. Tap **Export times**\n5. It saves as a **.txt** file in your Downloads folder\n\nUpload that file below.`,
  },
  other: {
    intro: "No problem! Speed Cube Hub can read most timer exports.",
    steps: `Try exporting your data as a **CSV** or **TXT** file from your timer app, then upload it below.\n\nI'll figure out the format automatically. If I can't recognize it, our AI parser will take a crack at it.`,
  },
}

export const ANALYZING = "Analyzing your data..."
export const AI_ANALYZING = "Our AI is analyzing your data — this might take a moment..."

export function eventSelectMessage(source: string) {
  return `I detected **${source}** data! One thing I need from you — which event are these solves for?`
}

export function previewMessage() {
  return `I parsed your file. Review the summary below, and if anything looks off you can remove solves before importing.`
}

export function completeMessage(count: number, hasRawSolves: boolean) {
  if (hasRawSolves) {
    return `All done! Successfully imported **${count.toLocaleString()}** solve${count !== 1 ? "s" : ""}. Your full solve history is now in the timer.`
  }
  return `All done! Successfully imported **${count.toLocaleString()}** item${count !== 1 ? "s" : ""}.`
}

export const IMPORTING = "Importing now — this might take a moment..."
export const PARSE_ERROR = "I couldn't read that file. Make sure it's a CSV, TXT, or JSON export from a timer app.\n\nWant to try again?"
