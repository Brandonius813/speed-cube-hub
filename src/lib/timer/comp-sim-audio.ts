import type { CompSimScene } from "@/lib/timer/comp-sim-round"

type SceneConfig = {
  gain: number
  lowpass: number
  highpass: number
  pulseDepth: number
  rumble: number
}

type ReactionCategory = "applause" | "cheer" | "burst" | "shout" | "judge"

type ReactionPreset = {
  id: string
  label: string
  category: ReactionCategory
  phrase?: string
  gain: number
  durationMs: number
}

type StartNoiseOptions = {
  scene: CompSimScene
  intensity: number
  randomReactionsEnabled: boolean
}

const SCENE_CONFIGS: Record<Exclude<CompSimScene, "off">, SceneConfig> = {
  quiet_local: { gain: 0.08, lowpass: 1200, highpass: 160, pulseDepth: 0.06, rumble: 0.18 },
  school_gym: { gain: 0.11, lowpass: 1500, highpass: 140, pulseDepth: 0.08, rumble: 0.22 },
  regional_floor: { gain: 0.15, lowpass: 1700, highpass: 120, pulseDepth: 0.1, rumble: 0.26 },
  finals_stage: { gain: 0.18, lowpass: 2000, highpass: 110, pulseDepth: 0.12, rumble: 0.3 },
  championship_hall: { gain: 0.22, lowpass: 2200, highpass: 100, pulseDepth: 0.16, rumble: 0.34 },
}

const SHOUT_PHRASES = [
  "Let's go!",
  "Come on!",
  "Nice!",
]

const JUDGE_PHRASES = [
  "Competitor ready?",
  "The cube is covered.",
  "You may inspect.",
]

export const COMP_SIM_REACTION_LIBRARY: ReactionPreset[] = [
  { id: "applause_soft_1", label: "Soft applause", category: "applause", gain: 0.18, durationMs: 900 },
  { id: "applause_soft_2", label: "Polite applause", category: "applause", gain: 0.2, durationMs: 950 },
  { id: "applause_medium_1", label: "Medium applause", category: "applause", gain: 0.24, durationMs: 1100 },
  { id: "applause_medium_2", label: "Rolling applause", category: "applause", gain: 0.26, durationMs: 1200 },
  { id: "applause_big", label: "Big applause", category: "applause", gain: 0.3, durationMs: 1350 },
  { id: "cheer_short_1", label: "Short cheer", category: "cheer", gain: 0.18, durationMs: 850 },
  { id: "cheer_short_2", label: "Quick cheer", category: "cheer", gain: 0.2, durationMs: 900 },
  { id: "cheer_short_3", label: "Excited cheer", category: "cheer", gain: 0.22, durationMs: 980 },
  { id: "cheer_short_4", label: "Sharp cheer", category: "cheer", gain: 0.23, durationMs: 1050 },
  { id: "cheer_short_5", label: "Bright cheer", category: "cheer", gain: 0.24, durationMs: 1000 },
  { id: "burst_1", label: "Burst pop", category: "burst", gain: 0.28, durationMs: 1050 },
  { id: "burst_2", label: "Loud burst", category: "burst", gain: 0.32, durationMs: 1150 },
  { id: "burst_3", label: "Wave burst", category: "burst", gain: 0.35, durationMs: 1250 },
  { id: "burst_4", label: "Finals burst", category: "burst", gain: 0.38, durationMs: 1350 },
  { id: "shout_1", label: "Let's go", category: "shout", phrase: SHOUT_PHRASES[0], gain: 0.16, durationMs: 800 },
  { id: "shout_2", label: "Come on", category: "shout", phrase: SHOUT_PHRASES[1], gain: 0.16, durationMs: 800 },
  { id: "shout_3", label: "Nice", category: "shout", phrase: SHOUT_PHRASES[2], gain: 0.16, durationMs: 700 },
  { id: "judge_1", label: "Competitor ready", category: "judge", phrase: JUDGE_PHRASES[0], gain: 0.12, durationMs: 900 },
  { id: "judge_2", label: "Cube covered", category: "judge", phrase: JUDGE_PHRASES[1], gain: 0.12, durationMs: 900 },
  { id: "judge_3", label: "You may inspect", category: "judge", phrase: JUDGE_PHRASES[2], gain: 0.12, durationMs: 900 },
]

const RANDOM_REACTIONS = COMP_SIM_REACTION_LIBRARY.filter(
  (reaction) => reaction.category !== "judge"
)
const JUDGE_REACTIONS = COMP_SIM_REACTION_LIBRARY.filter(
  (reaction) => reaction.category === "judge"
)

let ambientCtx: AudioContext | null = null
let ambientSource: AudioBufferSourceNode | null = null
let ambientGain: GainNode | null = null
let ambientLowpass: BiquadFilterNode | null = null
let ambientHighpass: BiquadFilterNode | null = null
let reactionTimeout: ReturnType<typeof setTimeout> | null = null
let previewReactionTimeout: ReturnType<typeof setTimeout> | null = null
let previewStopTimeout: ReturnType<typeof setTimeout> | null = null
let currentNoiseOptions: StartNoiseOptions | null = null

function createAmbientBuffer(ctx: AudioContext, config: SceneConfig): AudioBuffer {
  const sampleRate = ctx.sampleRate
  const durationSeconds = 6
  const frameCount = sampleRate * durationSeconds
  const buffer = ctx.createBuffer(1, frameCount, sampleRate)
  const output = buffer.getChannelData(0)

  let rumble = 0
  let hiss = 0
  for (let i = 0; i < frameCount; i++) {
    const t = i / sampleRate
    const white = Math.random() * 2 - 1
    rumble = rumble * 0.985 + white * config.rumble * 0.02
    hiss = hiss * 0.82 + white * 0.18
    const pulse = 1 + Math.sin(t * 2.2) * config.pulseDepth
    output[i] = (rumble * 0.9 + hiss * 0.18) * pulse
  }

  return buffer
}

function ensureAmbientContext(): AudioContext | null {
  if (typeof window === "undefined") return null
  if (ambientCtx) return ambientCtx
  try {
    ambientCtx = new AudioContext()
    return ambientCtx
  } catch {
    ambientCtx = null
    return null
  }
}

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

function speakPhrase(phrase: string, volume = 0.9) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return
  const utterance = new SpeechSynthesisUtterance(phrase)
  utterance.rate = 1
  utterance.pitch = 1
  utterance.volume = volume
  window.speechSynthesis.speak(utterance)
}

function playNoiseBurst(preset: ReactionPreset, intensity: number) {
  const ctx = ensureAmbientContext()
  if (!ctx) return

  const durationSeconds = preset.durationMs / 1000
  const frameCount = Math.max(1, Math.floor(ctx.sampleRate * durationSeconds))
  const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate)
  const output = buffer.getChannelData(0)
  const normalizedIntensity = Math.max(0.2, Math.min(1, intensity / 100))

  for (let i = 0; i < frameCount; i++) {
    const progress = i / frameCount
    const envelope = Math.max(0, 1 - progress)
    const chatter = Math.sin(progress * Math.PI * 6) * 0.15 + 0.85
    output[i] = (Math.random() * 2 - 1) * envelope * chatter * preset.gain * normalizedIntensity
  }

  const source = ctx.createBufferSource()
  const bandpass = ctx.createBiquadFilter()
  bandpass.type = preset.category === "applause" ? "bandpass" : "lowpass"
  bandpass.frequency.value = preset.category === "burst" ? 2000 : 1500
  const gain = ctx.createGain()
  gain.gain.value = 1

  source.buffer = buffer
  source.connect(bandpass)
  bandpass.connect(gain)
  gain.connect(ctx.destination)
  source.start()
}

function playReactionPreset(preset: ReactionPreset, intensity: number) {
  if (preset.category === "shout" || preset.category === "judge") {
    if (preset.phrase) {
      speakPhrase(preset.phrase, 0.6 + intensity / 250)
    }
    return
  }

  playNoiseBurst(preset, intensity)
}

function scheduleReactionLoop() {
  clearReactionLoop()

  if (!currentNoiseOptions?.randomReactionsEnabled || currentNoiseOptions.scene === "off") {
    return
  }

  const { intensity } = currentNoiseOptions
  const baseDelay = Math.max(1800, 7000 - intensity * 35)
  const jitter = Math.random() * 1800

  reactionTimeout = setTimeout(() => {
    const preset = RANDOM_REACTIONS[Math.floor(Math.random() * RANDOM_REACTIONS.length)]
    playReactionPreset(preset, intensity)
    scheduleReactionLoop()
  }, baseDelay + jitter)
}

export function playJudgeCue(kind: "ready" | "covered" | "inspect" | "time_to_solve" | "next_attempt"): void {
  const preset =
    kind === "covered"
      ? JUDGE_REACTIONS[1]
      : kind === "inspect"
        ? JUDGE_REACTIONS[2]
        : JUDGE_REACTIONS[0]

  if (kind === "time_to_solve") {
    speakPhrase("Time to solve", 1)
    return
  }

  if (kind === "next_attempt") {
    speakPhrase("Next attempt coming up", 0.7)
    return
  }

  playReactionPreset(preset, currentNoiseOptions?.intensity ?? 50)
}

export function startNoise(options: StartNoiseOptions): void {
  clearPreviewTimers()
  stopAllNoise()
  currentNoiseOptions = options

  if (options.scene === "off") return

  const ctx = ensureAmbientContext()
  if (!ctx) return

  const config = SCENE_CONFIGS[options.scene]
  ambientSource = ctx.createBufferSource()
  ambientSource.buffer = createAmbientBuffer(ctx, config)
  ambientSource.loop = true

  ambientHighpass = ctx.createBiquadFilter()
  ambientHighpass.type = "highpass"
  ambientHighpass.frequency.value = config.highpass

  ambientLowpass = ctx.createBiquadFilter()
  ambientLowpass.type = "lowpass"
  ambientLowpass.frequency.value = config.lowpass

  ambientGain = ctx.createGain()
  ambientGain.gain.value = config.gain * (0.3 + options.intensity / 120)

  ambientSource.connect(ambientHighpass)
  ambientHighpass.connect(ambientLowpass)
  ambientLowpass.connect(ambientGain)
  ambientGain.connect(ctx.destination)

  if (ctx.state === "suspended") {
    void ctx.resume()
  }

  ambientSource.start()
  scheduleReactionLoop()
}

export function previewSoundscape(
  options: StartNoiseOptions,
  previewDurationMs = 4200
): void {
  clearPreviewTimers()
  startNoise({
    ...options,
    randomReactionsEnabled: false,
  })

  if (options.scene !== "off" && options.randomReactionsEnabled) {
    previewReactionTimeout = setTimeout(() => {
      const preset = RANDOM_REACTIONS[Math.floor(Math.random() * RANDOM_REACTIONS.length)]
      playReactionPreset(preset, options.intensity)
    }, 900)
  }

  previewStopTimeout = setTimeout(() => {
    stopAllNoise()
  }, previewDurationMs)
}

export function stopSoundscapePreview(): void {
  clearPreviewTimers()
  stopAllNoise()
}

export function stopAllNoise(): void {
  clearPreviewTimers()
  clearReactionLoop()
  try {
    ambientSource?.stop()
  } catch {}
  try {
    ambientSource?.disconnect()
    ambientHighpass?.disconnect()
    ambientLowpass?.disconnect()
    ambientGain?.disconnect()
  } catch {}
  ambientSource = null
  ambientHighpass = null
  ambientLowpass = null
  ambientGain = null
  currentNoiseOptions = null
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel()
  }
}
