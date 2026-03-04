/**
 * Bluetooth Smart Cube Support
 *
 * Uses Web Bluetooth API to connect to smart cubes (GAN, GoCube, Giiker, Moyu).
 * Each cube brand uses different BLE service/characteristic UUIDs and data formats.
 *
 * This module provides a unified interface for:
 * - Connecting to a smart cube via BLE
 * - Receiving move events in real time
 * - Reading battery level
 * - Tracking cube state
 */

export type SmartCubeMove = {
  face: string // "R" | "R'" | "U" | "U'" | ...
  timestamp: number // ms since connection
}

export type SmartCubeState = {
  connected: boolean
  deviceName: string | null
  battery: number | null // 0-100
  moves: SmartCubeMove[]
  lastMove: SmartCubeMove | null
}

type MoveCallback = (move: SmartCubeMove) => void
type StateCallback = (state: Partial<SmartCubeState>) => void

// GAN cube BLE service UUIDs (GAN 356i, 356 X, 12 UI, etc.)
const GAN_SERVICE = "0000fff0-0000-1000-8000-00805f9b34fb"
const GAN_CHAR_READ = "0000fff5-0000-1000-8000-00805f9b34fb"
const GAN_CHAR_WRITE = "0000fff3-0000-1000-8000-00805f9b34fb"

// Giiker cube BLE service UUID
const GIIKER_SERVICE = "0000aadb-0000-1000-8000-00805f9b34fb"
const GIIKER_CHAR = "0000aadc-0000-1000-8000-00805f9b34fb"

// Standard Battery Service
const BATTERY_SERVICE = "battery_service"
const BATTERY_CHAR = "battery_level"

// GAN move mapping (index → move name)
const GAN_MOVES = [
  "U", "U'", "R", "R'", "F", "F'",
  "D", "D'", "L", "L'", "B", "B'",
]

// Giiker move mapping
const GIIKER_FACES = ["?", "B", "D", "L", "U", "R", "F"]

export class SmartCubeConnection {
  private device: BluetoothDevice | null = null
  private server: BluetoothRemoteGATTServer | null = null
  private moveCallbacks: MoveCallback[] = []
  private stateCallbacks: StateCallback[] = []
  private connectedAt = 0
  private cubeType: "gan" | "giiker" | "unknown" = "unknown"

  get isConnected(): boolean {
    return this.device?.gatt?.connected ?? false
  }

  get deviceName(): string | null {
    return this.device?.name ?? null
  }

  onMove(cb: MoveCallback) {
    this.moveCallbacks.push(cb)
    return () => {
      this.moveCallbacks = this.moveCallbacks.filter((c) => c !== cb)
    }
  }

  onStateChange(cb: StateCallback) {
    this.stateCallbacks.push(cb)
    return () => {
      this.stateCallbacks = this.stateCallbacks.filter((c) => c !== cb)
    }
  }

  private emitMove(move: SmartCubeMove) {
    for (const cb of this.moveCallbacks) cb(move)
  }

  private emitState(state: Partial<SmartCubeState>) {
    for (const cb of this.stateCallbacks) cb(state)
  }

  /** Request a Bluetooth connection to a smart cube */
  async connect(): Promise<boolean> {
    if (!navigator.bluetooth) {
      throw new Error("Web Bluetooth API is not available in this browser")
    }

    try {
      this.device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: [GAN_SERVICE] },
          { services: [GIIKER_SERVICE] },
          { namePrefix: "GAN" },
          { namePrefix: "Gi" },
          { namePrefix: "GoCube" },
          { namePrefix: "MoYu" },
          { namePrefix: "Rubiks" },
        ],
        optionalServices: [BATTERY_SERVICE, GAN_SERVICE, GIIKER_SERVICE],
      })

      if (!this.device) return false

      this.device.addEventListener("gattserverdisconnected", () => {
        this.emitState({ connected: false })
      })

      this.server = await this.device.gatt!.connect()
      this.connectedAt = performance.now()

      // Detect cube type and set up notifications
      const name = this.device.name?.toLowerCase() ?? ""
      if (name.includes("gan") || name.includes("mg")) {
        this.cubeType = "gan"
        await this.setupGAN()
      } else if (name.includes("gi") || name.includes("gocube")) {
        this.cubeType = "giiker"
        await this.setupGiiker()
      }

      // Try reading battery
      await this.readBattery()

      this.emitState({ connected: true, deviceName: this.device.name })
      return true
    } catch (err) {
      console.error("Smart cube connection failed:", err)
      return false
    }
  }

  async disconnect() {
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect()
    }
    this.device = null
    this.server = null
    this.emitState({ connected: false, deviceName: null })
  }

  private async setupGAN() {
    if (!this.server) return
    try {
      const service = await this.server.getPrimaryService(GAN_SERVICE)
      const char = await service.getCharacteristic(GAN_CHAR_READ)
      await char.startNotifications()
      char.addEventListener("characteristicvaluechanged", (event) => {
        const value = (event.target as BluetoothRemoteGATTCharacteristic).value
        if (!value) return
        this.handleGANData(value)
      })
    } catch (err) {
      console.error("GAN setup failed:", err)
    }
  }

  private handleGANData(data: DataView) {
    // GAN cubes send move data in various formats depending on model
    // Simplified: first byte often indicates message type, subsequent bytes are move indices
    const byte0 = data.getUint8(0)
    if (byte0 < GAN_MOVES.length) {
      const move: SmartCubeMove = {
        face: GAN_MOVES[byte0],
        timestamp: Math.round(performance.now() - this.connectedAt),
      }
      this.emitMove(move)
    }
  }

  private async setupGiiker() {
    if (!this.server) return
    try {
      const service = await this.server.getPrimaryService(GIIKER_SERVICE)
      const char = await service.getCharacteristic(GIIKER_CHAR)
      await char.startNotifications()
      char.addEventListener("characteristicvaluechanged", (event) => {
        const value = (event.target as BluetoothRemoteGATTCharacteristic).value
        if (!value) return
        this.handleGiikerData(value)
      })
    } catch (err) {
      console.error("Giiker setup failed:", err)
    }
  }

  private handleGiikerData(data: DataView) {
    // Giiker protocol: byte 16 = face (1-6), byte 17 = direction (1=CW, 3=CCW)
    if (data.byteLength < 18) return
    const faceIdx = data.getUint8(16)
    const dir = data.getUint8(17)
    if (faceIdx >= 1 && faceIdx <= 6) {
      const faceName = GIIKER_FACES[faceIdx]
      const moveName = dir === 3 ? `${faceName}'` : faceName
      const move: SmartCubeMove = {
        face: moveName,
        timestamp: Math.round(performance.now() - this.connectedAt),
      }
      this.emitMove(move)
    }
  }

  private async readBattery() {
    if (!this.server) return
    try {
      const service = await this.server.getPrimaryService(BATTERY_SERVICE)
      const char = await service.getCharacteristic(BATTERY_CHAR)
      const value = await char.readValue()
      const battery = value.getUint8(0)
      this.emitState({ battery })
    } catch {
      // Battery service not available on all cubes
    }
  }
}

/** Check if Web Bluetooth is available */
export function isWebBluetoothAvailable(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator
}
