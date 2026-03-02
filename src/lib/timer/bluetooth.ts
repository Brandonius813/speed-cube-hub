// GAN Smart Timer — Web Bluetooth protocol handler
// Protocol confirmed against afedotov/gan-web-bluetooth (MIT)
// Supports GAN Halo and other GAN smart timers.
// Web Bluetooth is available in Chrome/Chromium only (not Firefox/Safari/iOS).

const SERVICE_UUID = "0000fff0-0000-1000-8000-00805f9b34fb"
const NOTIFY_CHAR_UUID = "0000fff5-0000-1000-8000-00805f9b34fb"
const MAGIC_BYTE = 0xfe

export type GanTimerStateCode =
  | "HANDS_ON"  // 0x06 — both hands on mat
  | "GET_SET"   // 0x01 — grace period complete, show green
  | "HANDS_OFF" // 0x02 — premature lift before grace period, revert to idle
  | "RUNNING"   // 0x03 — timer counting
  | "STOPPED"   // 0x04 — timer stopped (time_ms included)
  | "IDLE"      // 0x05 — hardware reset button pressed
  | "FINISHED"  // 0x07 — auto-transition after stop
  | "DISCONNECT" // synthetic — BLE connection dropped

export interface GanTimerEvent {
  state: GanTimerStateCode
  /** Hardware-measured solve time in milliseconds. Only present on STOPPED. */
  time_ms?: number
}

export interface GanTimerConnection {
  /** Register the single event callback. Must be called immediately after connect. */
  onEvent: (cb: (evt: GanTimerEvent) => void) => void
  /** Disconnect from the device and clean up BLE resources. */
  disconnect: () => void
}

const STATE_MAP: Record<number, GanTimerStateCode> = {
  0x01: "GET_SET",
  0x02: "HANDS_OFF",
  0x03: "RUNNING",
  0x04: "STOPPED",
  0x05: "IDLE",
  0x06: "HANDS_ON",
  0x07: "FINISHED",
}

/**
 * CRC-16/CCITT-FALSE: initial value 0xFFFF, polynomial 0x1021.
 * Operates over the provided ArrayBuffer slice.
 */
function crc16(buffer: ArrayBuffer): number {
  const view = new DataView(buffer)
  let crc = 0xffff
  for (let i = 0; i < view.byteLength; i++) {
    crc ^= view.getUint8(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) : (crc << 1)
    }
  }
  return crc & 0xffff
}

/**
 * Validates and parses an incoming BLE notification packet.
 * Packet structure:
 *   [0]     0xFE  magic byte
 *   [1]     len   bytes remaining (including CRC)
 *   [2]     0x01  data prefix
 *   [3]     state code
 *   [4-7]   time  (minutes, seconds, ms_lo, ms_hi) — only for STOPPED (0x04)
 *   [-2,-1] CRC-16/CCITT-FALSE (little-endian uint16) over bytes[2..length-2]
 */
function parsePacket(data: DataView): GanTimerEvent | null {
  if (data.byteLength < 6) return null
  if (data.getUint8(0) !== MAGIC_BYTE) return null

  // CRC check: computed over bytes[2 .. byteLength-2], stored little-endian at the end
  const crcData = data.buffer.slice(
    data.byteOffset + 2,
    data.byteOffset + data.byteLength - 2
  ) as ArrayBuffer
  const crcExpected = data.getUint16(data.byteLength - 2, true)
  if (crc16(crcData) !== crcExpected) return null

  const stateCode = data.getUint8(3)
  const state = STATE_MAP[stateCode]
  if (!state) return null

  if (state === "STOPPED" && data.byteLength >= 10) {
    const minutes = data.getUint8(4)
    const seconds = data.getUint8(5)
    const millis  = data.getUint16(6, true)
    const time_ms = minutes * 60000 + seconds * 1000 + millis
    return { state, time_ms }
  }

  return { state }
}

/**
 * Opens the browser Bluetooth device picker filtered to GAN devices,
 * connects to the GAN timer GATT service, and subscribes to state notifications.
 *
 * Throws if Web Bluetooth is unavailable, the user cancels, or connection fails.
 */
export async function connectGanTimer(): Promise<GanTimerConnection> {
  const device = await navigator.bluetooth.requestDevice({
    filters: [
      { namePrefix: "GAN" },
      { namePrefix: "gan" },
      { namePrefix: "Gan" },
    ],
    optionalServices: [SERVICE_UUID],
  })

  const server = await device.gatt!.connect()
  const service = await server.getPrimaryService(SERVICE_UUID)
  const stateChar = await service.getCharacteristic(NOTIFY_CHAR_UUID)

  let eventCallback: ((evt: GanTimerEvent) => void) | null = null

  const onNotify = (e: Event) => {
    const chr = e.target as BluetoothRemoteGATTCharacteristic
    const value = chr.value
    if (!value) return
    const evt = parsePacket(value)
    if (evt) eventCallback?.(evt)
  }

  const disconnectCleanup = () => {
    device.removeEventListener("gattserverdisconnected", disconnectCleanup)
    stateChar.removeEventListener("characteristicvaluechanged", onNotify)
    stateChar.stopNotifications().catch(() => {})
    eventCallback?.({ state: "DISCONNECT" })
    if (server.connected) server.disconnect()
  }

  stateChar.addEventListener("characteristicvaluechanged", onNotify)
  await stateChar.startNotifications()
  device.addEventListener("gattserverdisconnected", disconnectCleanup)

  return {
    onEvent: (cb) => { eventCallback = cb },
    disconnect: disconnectCleanup,
  }
}

/**
 * Returns true if Web Bluetooth is available in this browser.
 * False in Firefox, Safari, and all iOS browsers.
 */
export function isBleSupported(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator
}
