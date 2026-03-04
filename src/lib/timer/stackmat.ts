/**
 * Stackmat Timer Support
 *
 * Reads time signals from a physical Stackmat timer connected via
 * microphone/audio input (3.5mm jack or USB adapter).
 *
 * Stackmat protocol:
 * - 1200 baud, RS-232 serial over audio
 * - Each packet: 1 start bit, 8 data bits, 1 stop bit
 * - Packet format: status + 6 digit chars (MSSCC0) + checksum + LF
 * - Status codes: 'I' = idle, ' ' = running, 'S' = stopped, 'L'/'R' = hand
 */

export type StackmatState = "idle" | "running" | "stopped" | "reset" | "left_hand" | "right_hand"

export type StackmatPacket = {
  state: StackmatState
  timeMs: number
}

type StackmatDecoderOptions = {
  onStateChange: (state: StackmatState, timeMs: number) => void
  onPacket: (packet: StackmatPacket) => void
  onError: (message: string) => void
}

const BAUD_RATE = 1200
const BITS_PER_BYTE = 10 // 1 start + 8 data + 1 stop
const PACKET_LENGTH = 9 // status + 6 digits + checksum + LF

export class StackmatDecoder {
  private audioCtx: AudioContext | null = null
  private stream: MediaStream | null = null
  private processor: ScriptProcessorNode | null = null

  private options: StackmatDecoderOptions
  private sampleRate = 0
  private samplesPerBit = 0
  private bitBuffer: number[] = []
  private lastSample = 0
  private sampleCount = 0
  private lastPacketTime = 0
  isReceiving = false

  constructor(options: StackmatDecoderOptions) {
    this.options = options
  }

  static isSupported(): boolean {
    return (
      typeof navigator !== "undefined" &&
      "mediaDevices" in navigator &&
      "getUserMedia" in navigator.mediaDevices
    )
  }

  async start(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      })

      this.audioCtx = new AudioContext()
      this.sampleRate = this.audioCtx.sampleRate
      this.samplesPerBit = Math.round(this.sampleRate / BAUD_RATE)

      const source = this.audioCtx.createMediaStreamSource(this.stream)

      // ScriptProcessor for raw sample access
      this.processor = this.audioCtx.createScriptProcessor(4096, 1, 1)
      this.processor.onaudioprocess = (e) => this.processAudio(e)
      source.connect(this.processor)
      this.processor.connect(this.audioCtx.destination)
    } catch (err) {
      this.options.onError(
        err instanceof Error ? err.message : "Microphone access denied"
      )
    }
  }

  stop() {
    if (this.processor) {
      this.processor.disconnect()
      this.processor = null
    }
    if (this.audioCtx) {
      this.audioCtx.close()
      this.audioCtx = null
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop())
      this.stream = null
    }
    this.bitBuffer = []
    this.isReceiving = false
  }

  private processAudio(event: AudioProcessingEvent) {
    const input = event.inputBuffer.getChannelData(0)

    for (let i = 0; i < input.length; i++) {
      const sample = input[i] > 0 ? 1 : 0

      if (sample !== this.lastSample) {
        this.lastSample = sample
        this.sampleCount = 0
      }

      this.sampleCount++

      // Sample at bit center
      if (this.sampleCount === Math.round(this.samplesPerBit / 2)) {
        this.bitBuffer.push(sample)
        this.tryDecodePacket()
      }

      // Re-sync on idle
      if (this.sampleCount > this.samplesPerBit * 2) {
        this.sampleCount = 0
      }
    }

    // Check for signal timeout
    const now = Date.now()
    if (this.lastPacketTime > 0 && now - this.lastPacketTime > 2000) {
      this.isReceiving = false
    }
  }

  private tryDecodePacket() {
    const packetBits = PACKET_LENGTH * BITS_PER_BYTE
    if (this.bitBuffer.length < packetBits) return

    // Find start bit (1→0 transition)
    let startIdx = -1
    for (let i = 0; i <= this.bitBuffer.length - packetBits; i++) {
      if (this.bitBuffer[i] === 0 && (i === 0 || this.bitBuffer[i - 1] === 1)) {
        startIdx = i
        break
      }
    }

    if (startIdx < 0) {
      if (this.bitBuffer.length > packetBits * 2) {
        this.bitBuffer = this.bitBuffer.slice(-packetBits)
      }
      return
    }

    // Decode bytes
    const bytes: number[] = []
    for (let b = 0; b < PACKET_LENGTH; b++) {
      const byteStart = startIdx + b * BITS_PER_BYTE
      let value = 0
      for (let bit = 0; bit < 8; bit++) {
        const bitIdx = byteStart + 1 + bit
        if (bitIdx >= this.bitBuffer.length) return
        value |= (this.bitBuffer[bitIdx] ? 1 : 0) << bit
      }
      bytes.push(value)
    }

    this.bitBuffer = this.bitBuffer.slice(startIdx + packetBits)
    this.parsePacket(bytes)
  }

  private parsePacket(bytes: number[]) {
    if (bytes.length < PACKET_LENGTH) return

    const statusChar = String.fromCharCode(bytes[0])
    const digits = bytes.slice(1, 7).map((b) => String.fromCharCode(b))

    // Validate digits
    for (const d of digits) {
      if (d < "0" || d > "9") return
    }

    const minutes = parseInt(digits[0])
    const seconds = parseInt(digits[1] + digits[2])
    const centiseconds = parseInt(digits[3] + digits[4])
    const timeMs = minutes * 60000 + seconds * 1000 + centiseconds * 10

    let state: StackmatState = "idle"
    if (statusChar === " ") state = "running"
    else if (statusChar === "S") state = "stopped"
    else if (statusChar === "L") state = "left_hand"
    else if (statusChar === "R") state = "right_hand"
    else if (statusChar === "I") state = timeMs === 0 ? "idle" : "reset"

    this.lastPacketTime = Date.now()
    this.isReceiving = true

    const packet: StackmatPacket = { state, timeMs }
    this.options.onPacket(packet)
    this.options.onStateChange(state, timeMs)
  }
}
