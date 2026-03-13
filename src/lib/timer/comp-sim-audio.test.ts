import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

class MockAudio {
  static instances: MockAudio[] = []

  src: string
  preload = "auto"
  loop = false
  volume = 1
  currentTime = 0
  pauseCalls = 0
  playCalls = 0
  private listeners = new Map<string, Set<() => void>>()

  constructor(src: string) {
    this.src = src
    MockAudio.instances.push(this)
  }

  play() {
    this.playCalls += 1
    return Promise.resolve()
  }

  pause() {
    this.pauseCalls += 1
    this.dispatch("pause")
  }

  addEventListener(event: string, listener: () => void) {
    const listeners = this.listeners.get(event) ?? new Set<() => void>()
    listeners.add(listener)
    this.listeners.set(event, listeners)
  }

  removeEventListener(event: string, listener: () => void) {
    this.listeners.get(event)?.delete(listener)
  }

  private dispatch(event: string) {
    for (const listener of this.listeners.get(event) ?? []) {
      listener()
    }
  }
}

async function loadAudioModule() {
  vi.resetModules()
  return import("./comp-sim-audio")
}

describe("comp sim audio handoff", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    MockAudio.instances = []
    vi.stubGlobal("window", {})
    vi.stubGlobal("Audio", MockAudio)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it("stops preview playback when the preview timer expires", async () => {
    const audio = await loadAudioModule()

    audio.previewSoundscape(
      {
        scene: "quiet_local",
        intensity: 55,
        randomReactionsEnabled: false,
      },
      1000
    )

    expect(MockAudio.instances).toHaveLength(1)
    expect(MockAudio.instances[0]?.playCalls).toBe(1)

    vi.advanceTimersByTime(1000)

    expect(MockAudio.instances[0]?.pauseCalls).toBe(1)
  })

  it("clears preview timers when live playback starts", async () => {
    const audio = await loadAudioModule()

    audio.previewSoundscape({
      scene: "quiet_local",
      intensity: 55,
      randomReactionsEnabled: false,
    })
    const previewAmbient = MockAudio.instances[0]

    audio.startNoise({
      scene: "regional_floor",
      intensity: 70,
      randomReactionsEnabled: false,
    })
    const liveAmbient = MockAudio.instances[1]

    expect(previewAmbient?.pauseCalls).toBe(1)

    vi.advanceTimersByTime(5000)

    expect(liveAmbient?.pauseCalls).toBe(0)
  })

  it("does not stop live playback when preview cleanup runs after handoff", async () => {
    const audio = await loadAudioModule()

    audio.previewSoundscape({
      scene: "quiet_local",
      intensity: 55,
      randomReactionsEnabled: false,
    })
    audio.startNoise({
      scene: "finals_stage",
      intensity: 80,
      randomReactionsEnabled: true,
    })
    const liveAmbient = MockAudio.instances[1]

    audio.stopSoundscapePreview()

    expect(liveAmbient?.pauseCalls).toBe(0)
  })

  it("still lets the round shutdown path stop live playback", async () => {
    const audio = await loadAudioModule()

    audio.startNoise({
      scene: "championship_hall",
      intensity: 90,
      randomReactionsEnabled: true,
    })
    const liveAmbient = MockAudio.instances[0]

    audio.stopAllNoise()

    expect(liveAmbient?.pauseCalls).toBe(1)
  })

  it("waits at least six minutes before a live random reaction fires", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0)
    const audio = await loadAudioModule()

    audio.startNoise({
      scene: "championship_hall",
      intensity: 90,
      randomReactionsEnabled: true,
    })

    expect(MockAudio.instances).toHaveLength(1)

    vi.advanceTimersByTime(6 * 60 * 1000 - 1)
    expect(MockAudio.instances).toHaveLength(1)

    vi.advanceTimersByTime(1)
    expect(MockAudio.instances).toHaveLength(2)
  })

  it("makes live random reactions much louder than the ambient bed", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0)
    const audio = await loadAudioModule()

    audio.startNoise({
      scene: "championship_hall",
      intensity: 100,
      randomReactionsEnabled: true,
    })

    const ambient = MockAudio.instances[0]
    expect(ambient?.volume).toBeCloseTo(0.456, 2)

    vi.advanceTimersByTime(6 * 60 * 1000)

    const reaction = MockAudio.instances[1]
    expect(reaction?.volume).toBeCloseTo(0.724, 2)
    expect((reaction?.volume ?? 0) / (ambient?.volume ?? 1)).toBeGreaterThan(1.5)
  })

  it("plays an inspection call cue without stopping the live ambient bed", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0)
    const audio = await loadAudioModule()

    audio.startNoise({
      scene: "regional_floor",
      intensity: 70,
      randomReactionsEnabled: false,
    })

    const ambient = MockAudio.instances[0]
    audio.playInspectionCall()

    const cue = MockAudio.instances[1]
    expect(ambient?.pauseCalls).toBe(0)
    expect(cue?.src).toContain("/audio/comp-sim/judge/")
    expect(cue?.playCalls).toBe(1)
  })
})
