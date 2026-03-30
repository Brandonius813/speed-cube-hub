import type { CompSimScene } from "@/lib/timer/comp-sim-round"

type ReactionCategory = "applause" | "cheer" | "burst" | "shout"

type StartNoiseOptions = {
  scene: CompSimScene
  intensity: number
  randomReactionsEnabled: boolean
}

type PlaybackMode = "idle" | "preview" | "live"

const LIVE_REACTION_DELAY_MIN_MS = 6 * 60 * 1000
const LIVE_REACTION_DELAY_MAX_MS = 7 * 60 * 1000
const LIVE_REACTION_VOLUME_MULTIPLIER = 1.85

const SILENT_AUDIO_DATA_URI =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA="

type ReactionPreset = {
  id: string
  label: string
  category: ReactionCategory
  src: string
  gain: number
}

type ScenePreset = {
  label: string
  src: string
  gain: number
}

type CuePreset = {
  id: string
  label: string
  src: string
  gain: number
}

const AMBIENT_SCENES: Record<Exclude<CompSimScene, "off">, ScenePreset> = {
  quiet_local: {
    label: "Quiet Local",
    src: "/audio/comp-sim/ambient/quiet-local.mp3",
    gain: 0.18,
  },
  school_gym: {
    label: "School Gym",
    src: "/audio/comp-sim/ambient/school-gym.mp3",
    gain: 0.22,
  },
  regional_floor: {
    label: "Regional Floor",
    src: "/audio/comp-sim/ambient/regional-floor.mp3",
    gain: 0.28,
  },
  finals_stage: {
    label: "Finals Stage",
    src: "/audio/comp-sim/ambient/finals-stage.mp3",
    gain: 0.33,
  },
  championship_hall: {
    label: "Championship Hall",
    src: "/audio/comp-sim/ambient/championship-hall.mp3",
    gain: 0.38,
  },
}

export const COMP_SIM_REACTION_LIBRARY: ReactionPreset[] = [
  {
    id: "applause_soft",
    label: "Soft applause",
    category: "applause",
    src: "/audio/comp-sim/reactions/applause-soft.mp3",
    gain: 0.34,
  },
  {
    id: "applause_indoor",
    label: "Indoor applause",
    category: "applause",
    src: "/audio/comp-sim/reactions/applause-indoor.mp3",
    gain: 0.38,
  },
  {
    id: "applause_small_crowd",
    label: "Small crowd clapping",
    category: "applause",
    src: "/audio/comp-sim/reactions/applause-small-crowd.mp3",
    gain: 0.36,
  },
  {
    id: "applause_medium",
    label: "Medium applause",
    category: "applause",
    src: "/audio/comp-sim/reactions/applause-medium.mp3",
    gain: 0.42,
  },
  {
    id: "applause_theatre",
    label: "Theatre applause",
    category: "applause",
    src: "/audio/comp-sim/reactions/applause-theatre.mp3",
    gain: 0.32,
  },
  {
    id: "cheer_whistle",
    label: "Cheer with whistle",
    category: "cheer",
    src: "/audio/comp-sim/reactions/cheer-whistle.mp3",
    gain: 0.46,
  },
  {
    id: "cheer_victory",
    label: "Victory cheer",
    category: "cheer",
    src: "/audio/comp-sim/reactions/cheer-victory.mp3",
    gain: 0.44,
  },
  {
    id: "cheer_party",
    label: "Party cheer",
    category: "cheer",
    src: "/audio/comp-sim/reactions/cheer-party.mp3",
    gain: 0.4,
  },
  {
    id: "cheer_birthday",
    label: "Birthday cheer",
    category: "cheer",
    src: "/audio/comp-sim/reactions/cheer-birthday.mp3",
    gain: 0.38,
  },
  {
    id: "cheer_stadium",
    label: "Stadium cheer",
    category: "cheer",
    src: "/audio/comp-sim/reactions/cheer-stadium.mp3",
    gain: 0.48,
  },
  {
    id: "burst_conference",
    label: "Conference burst",
    category: "burst",
    src: "/audio/comp-sim/reactions/burst-conference.mp3",
    gain: 0.5,
  },
  {
    id: "burst_ending_show",
    label: "Ending show burst",
    category: "burst",
    src: "/audio/comp-sim/reactions/burst-ending-show.mp3",
    gain: 0.56,
  },
  {
    id: "burst_auditorium",
    label: "Auditorium burst",
    category: "burst",
    src: "/audio/comp-sim/reactions/burst-auditorium.mp3",
    gain: 0.58,
  },
  {
    id: "burst_end_show",
    label: "End show burst",
    category: "burst",
    src: "/audio/comp-sim/reactions/burst-end-show.mp3",
    gain: 0.52,
  },
  {
    id: "gasp_female_astonished",
    label: "Female astonished gasp",
    category: "shout",
    src: "/audio/comp-sim/reactions/gasp-female-astonished.mp3",
    gain: 0.34,
  },
  {
    id: "gasp_female_surprised",
    label: "Female surprised gasp",
    category: "shout",
    src: "/audio/comp-sim/reactions/gasp-female-surprised.mp3",
    gain: 0.34,
  },
  {
    id: "gasp_male_astonished",
    label: "Male astonished gasp",
    category: "shout",
    src: "/audio/comp-sim/reactions/gasp-male-astonished.mp3",
    gain: 0.34,
  },
]

const RANDOM_REACTIONS = COMP_SIM_REACTION_LIBRARY
const INSPECTION_CALL_CUES: CuePreset[] = [
  {
    id: "female_mic_countdown",
    label: "Female mic countdown",
    src: "/audio/comp-sim/judge/female-mic-countdown.mp3",
    gain: 0.72,
  },
  {
    id: "male_deep_countdown",
    label: "Male deep countdown",
    src: "/audio/comp-sim/judge/male-deep-countdown.mp3",
    gain: 0.74,
  },
  {
    id: "sport_start_bleeps",
    label: "Sport start bleeps",
    src: "/audio/comp-sim/judge/sport-start-bleeps.mp3",
    gain: 0.68,
  },
]

// Web Audio API ambient loop state (gapless looping via AudioBufferSourceNode)
let ambientCtx: AudioContext | null = null
let ambientSource: AudioBufferSourceNode | null = null
let ambientGain: GainNode | null = null
const ambientBufferCache = new Map<string, AudioBuffer>()

let activeOneShots = new Set<HTMLAudioElement>()
let reactionTimeout: ReturnType<typeof setTimeout> | null = null
let previewReactionTimeout: ReturnType<typeof setTimeout> | null = null
let previewStopTimeout: ReturnType<typeof setTimeout> | null = null
let currentNoiseOptions: StartNoiseOptions | null = null
let audioUnlocked = false
let playbackMode: PlaybackMode = "idle"

function clearReactionLoop() {
  if (reactionTimeout) clearTimeout(reactionTimeout)
  reactionTimeout = null
}

function clearPreviewTimers() {
  if (previewReactionTimeout) clearTimeout(previewReactionTimeout)
  if (previewStopTimeout) clearTimeout(previewStopTimeout)
  previewReactionTimeout = null
  previewStopTimeout = null
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function createAudio(src: string, volume: number, loop = false): HTMLAudioElement | null {
  if (typeof window === "undefined") return null
  const audio = new Audio(src)
  audio.preload = "auto"
  audio.loop = loop
  audio.volume = clamp(volume, 0, 1)
  return audio
}

function getAmbientContext(): AudioContext {
  if (!ambientCtx || ambientCtx.state === "closed") {
    ambientCtx = new AudioContext()
  }
  return ambientCtx
}

async function fetchAudioBuffer(ctx: AudioContext, src: string): Promise<AudioBuffer> {
  const cached = ambientBufferCache.get(src)
  if (cached) return cached
  const response = await fetch(src)
  const arrayBuffer = await response.arrayBuffer()
  const buffer = await ctx.decodeAudioData(arrayBuffer)
  ambientBufferCache.set(src, buffer)
  return buffer
}

async function startAmbientLoop(src: string, volume: number): Promise<void> {
  stopAmbientAudio()
  const ctx = getAmbientContext()
  if (ctx.state === "suspended") await ctx.resume()

  const buffer = await fetchAudioBuffer(ctx, src)
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.loop = true

  const gain = ctx.createGain()
  gain.gain.value = clamp(volume, 0, 1)

  source.connect(gain)
  gain.connect(ctx.destination)
  source.start()

  ambientSource = source
  ambientGain = gain
}

export function primeCompSimAudioPlayback(): void {
  if (typeof window === "undefined" || audioUnlocked) return

  // Initialize Web Audio context on user gesture
  getAmbientContext()

  const primer = new Audio(SILENT_AUDIO_DATA_URI)
  primer.volume = 0
  void primer.play()
    .then(() => {
      audioUnlocked = true
      primer.pause()
      primer.currentTime = 0
    })
    .catch(() => {
      // Browser still requires a later user gesture; previews/start buttons retry this.
    })
}

function trackOneShot(audio: HTMLAudioElement) {
  activeOneShots.add(audio)
  const cleanup = () => {
    activeOneShots.delete(audio)
    audio.removeEventListener("ended", cleanup)
    audio.removeEventListener("pause", cleanup)
    audio.removeEventListener("error", cleanup)
  }
  audio.addEventListener("ended", cleanup)
  audio.addEventListener("pause", cleanup)
  audio.addEventListener("error", cleanup)
}

function stopActiveOneShots() {
  for (const audio of activeOneShots) {
    try {
      audio.pause()
      audio.currentTime = 0
    } catch {}
  }
  activeOneShots = new Set()
}

function stopAmbientAudio() {
  if (ambientSource) {
    try {
      ambientSource.stop()
    } catch {}
    ambientSource.disconnect()
    ambientSource = null
  }
  if (ambientGain) {
    ambientGain.disconnect()
    ambientGain = null
  }
}

function clearPlaybackState() {
  clearReactionLoop()
  stopAmbientAudio()
  stopActiveOneShots()
  currentNoiseOptions = null
  playbackMode = "idle"
}

function playClip(src: string, volume: number) {
  const audio = createAudio(src, volume)
  if (!audio) return
  trackOneShot(audio)
  void audio.play().catch(() => {
    activeOneShots.delete(audio)
  })
}

function playReactionPreset(
  preset: ReactionPreset,
  intensity: number,
  options?: { volumeMultiplier?: number }
) {
  const normalizedIntensity = clamp(intensity / 100, 0, 1)
  const multiplier = options?.volumeMultiplier ?? 1
  playClip(
    preset.src,
    preset.gain * (0.45 + normalizedIntensity * 0.7) * multiplier
  )
}

function playCuePreset(preset: CuePreset) {
  playClip(preset.src, preset.gain)
}

function scheduleReactionLoop() {
  clearReactionLoop()

  if (!currentNoiseOptions?.randomReactionsEnabled || currentNoiseOptions.scene === "off") {
    return
  }

  const { intensity } = currentNoiseOptions
  const delayWindow = LIVE_REACTION_DELAY_MAX_MS - LIVE_REACTION_DELAY_MIN_MS
  const nextDelay = LIVE_REACTION_DELAY_MIN_MS + Math.random() * delayWindow

  reactionTimeout = setTimeout(() => {
    const preset = RANDOM_REACTIONS[Math.floor(Math.random() * RANDOM_REACTIONS.length)]
    playReactionPreset(preset, intensity, {
      volumeMultiplier: LIVE_REACTION_VOLUME_MULTIPLIER,
    })
    scheduleReactionLoop()
  }, nextDelay)
}

function beginPlayback(options: StartNoiseOptions, mode: PlaybackMode): void {
  clearPreviewTimers()
  clearPlaybackState()
  currentNoiseOptions = options
  playbackMode = mode

  if (options.scene === "off") return

  const scene = AMBIENT_SCENES[options.scene]
  const volume = scene.gain * (0.35 + clamp(options.intensity / 100, 0, 1) * 0.85)

  // Use Web Audio API for gapless looping (avoids MP3 padding gaps)
  void startAmbientLoop(scene.src, volume).catch(() => {
    if (playbackMode === mode) {
      clearPlaybackState()
    }
  })

  if (mode === "live") {
    scheduleReactionLoop()
  }
}

export function startNoise(options: StartNoiseOptions): void {
  beginPlayback(options, "live")
}

export function previewSoundscape(
  options: StartNoiseOptions,
  previewDurationMs = 4200
): void {
  beginPlayback(
    {
      ...options,
      randomReactionsEnabled: false,
    },
    "preview"
  )

  if (options.scene !== "off" && options.randomReactionsEnabled) {
    previewReactionTimeout = setTimeout(() => {
      const preset = RANDOM_REACTIONS[Math.floor(Math.random() * RANDOM_REACTIONS.length)]
      playReactionPreset(preset, options.intensity)
    }, 900)
  }

  previewStopTimeout = setTimeout(() => {
    if (playbackMode === "preview") {
      clearPlaybackState()
    }
  }, previewDurationMs)
}

export function playInspectionCall(): void {
  const preset = INSPECTION_CALL_CUES[Math.floor(Math.random() * INSPECTION_CALL_CUES.length)]
  playCuePreset(preset)
}

export function stopSoundscapePreview(): void {
  clearPreviewTimers()
  if (playbackMode === "preview") {
    clearPlaybackState()
  }
}

export function stopAllNoise(): void {
  clearPreviewTimers()
  clearPlaybackState()
}

// ---------------------------------------------------------------------------
// Ready-window audio cues (Web Audio API tones — no external files needed)
// ---------------------------------------------------------------------------

let toneCtx: AudioContext | null = null

function getToneContext(): AudioContext | null {
  if (typeof window === "undefined") return null
  if (!toneCtx || toneCtx.state === "closed") {
    toneCtx = new AudioContext()
  }
  return toneCtx
}

function playTone(
  frequency: number,
  durationMs: number,
  options?: { endFrequency?: number; volume?: number }
) {
  const ctx = getToneContext()
  if (!ctx) return
  if (ctx.state === "suspended") void ctx.resume()

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = "sine"
  osc.frequency.setValueAtTime(frequency, ctx.currentTime)
  if (options?.endFrequency) {
    osc.frequency.linearRampToValueAtTime(
      options.endFrequency,
      ctx.currentTime + durationMs / 1000
    )
  }
  gain.gain.setValueAtTime(options?.volume ?? 0.35, ctx.currentTime)
  // Fade out over last 30% to avoid click
  gain.gain.setValueAtTime(options?.volume ?? 0.35, ctx.currentTime + durationMs / 1000 * 0.7)
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + durationMs / 1000)

  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + durationMs / 1000)
}

/** Single beep at 15 seconds remaining in the ready window. */
export function playReadyWindow15sWarning(): void {
  playTone(880, 200, { volume: 0.3 })
}

/** Descending tone when the 60-second ready window expires. */
export function playReadyWindowExpired(): void {
  playTone(880, 500, { endFrequency: 440, volume: 0.4 })
}
