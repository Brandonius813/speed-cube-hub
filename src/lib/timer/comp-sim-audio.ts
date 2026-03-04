/**
 * Audio manager for Competition Simulator mode.
 *
 * - "Time to solve" speech cue via SpeechSynthesis (same pattern as inspection.ts)
 * - Brown noise via procedural Web Audio API (no audio file needed)
 * - Crowd noise via looping HTML Audio element (public/audio/crowd-noise.mp3)
 */

// --- Speech Cue ---

export function playTimeToSolveCue(): void {
  if (typeof window === "undefined") return
  if (!("speechSynthesis" in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance("Time to solve")
  utterance.rate = 1.2
  utterance.volume = 1.0
  window.speechSynthesis.speak(utterance)
}

// --- Brown Noise (procedural) ---

let brownCtx: AudioContext | null = null
let brownNode: ScriptProcessorNode | null = null
let brownGain: GainNode | null = null

export function startBrownNoise(): void {
  if (brownCtx) return // already playing
  try {
    brownCtx = new AudioContext()
    const bufferSize = 4096
    brownNode = brownCtx.createScriptProcessor(bufferSize, 1, 1)
    let lastOut = 0.0

    brownNode.onaudioprocess = (e) => {
      const output = e.outputBuffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1
        lastOut = (lastOut + 0.02 * white) / 1.02
        output[i] = lastOut * 3.5
      }
    }

    brownGain = brownCtx.createGain()
    brownGain.gain.value = 0.25
    brownNode.connect(brownGain)
    brownGain.connect(brownCtx.destination)

    // iOS requires resume after user gesture
    if (brownCtx.state === "suspended") {
      brownCtx.resume()
    }
  } catch {
    stopBrownNoise()
  }
}

export function stopBrownNoise(): void {
  try {
    brownNode?.disconnect()
    brownGain?.disconnect()
    brownCtx?.close()
  } catch { /* ignore */ }
  brownCtx = null
  brownNode = null
  brownGain = null
}

// --- Crowd Noise (audio file loop) ---

let crowdAudio: HTMLAudioElement | null = null

export function startCrowdNoise(): void {
  if (crowdAudio) return // already playing
  try {
    crowdAudio = new Audio("/audio/crowd-noise.mp3")
    crowdAudio.loop = true
    crowdAudio.volume = 0.3
    crowdAudio.play().catch(() => {
      // Browser may block autoplay — user gesture required
      crowdAudio = null
    })
  } catch {
    crowdAudio = null
  }
}

export function stopCrowdNoise(): void {
  if (crowdAudio) {
    crowdAudio.pause()
    crowdAudio.src = ""
    crowdAudio = null
  }
}

// --- Combined Controls ---

export type NoiseType = "none" | "crowd" | "brown"

export function startNoise(type: NoiseType): void {
  stopAllNoise()
  if (type === "brown") startBrownNoise()
  if (type === "crowd") startCrowdNoise()
}

export function stopAllNoise(): void {
  stopBrownNoise()
  stopCrowdNoise()
}
