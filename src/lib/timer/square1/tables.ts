const SHAPE_COUNT = 3678
const SHAPE_STATE_COUNT = SHAPE_COUNT * 2
const SQUARE_PERMUTATION_COUNT = 40320
const SQUARE_STATE_COUNT = SQUARE_PERMUTATION_COUNT * 2

const HALFLAYER = [
  0x00, 0x03, 0x06, 0x0c, 0x0f, 0x18, 0x1b,
  0x1e, 0x30, 0x33, 0x36, 0x3c, 0x3f,
]

export const FACE_TURN_METRIC = 0
export const WCA_TURN_METRIC = 1
export const SEARCH_METRIC = WCA_TURN_METRIC
export const PRUNING_INCREMENT = SEARCH_METRIC === WCA_TURN_METRIC ? 2 : 1

function bitCount(value: number): number {
  let count = 0
  let current = value >>> 0
  while (current !== 0) {
    current &= current - 1
    count++
  }
  return count
}

function binarySearch(values: Int32Array, target: number): number {
  let low = 0
  let high = values.length - 1

  while (low <= high) {
    const mid = (low + high) >> 1
    const value = values[mid]
    if (value === target) return mid
    if (value < target) {
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  return -1
}

function encodeLayerShape(layer: number): number {
  let value = layer & 0x111111
  value |= value >> 3
  value |= value >> 6
  return (value & 0xf) | ((value >> 12) & 0x30)
}

class ShapeCursor {
  top = 0
  bottom = 0
  parity = 0

  getIdx(): number {
    const shapeIndex = binarySearch(ShapeTables.shapeIdx, (this.top << 12) | this.bottom)
    return (shapeIndex << 1) | this.parity
  }

  setIdx(idx: number): void {
    this.parity = idx & 1
    this.top = ShapeTables.shapeIdx[idx >> 1]
    this.bottom = this.top & 0xfff
    this.top >>= 12
  }

  topMove(): number {
    let move = 0
    let moveParity = 0

    do {
      if ((this.top & 0x800) === 0) {
        move += 1
        this.top <<= 1
      } else {
        move += 2
        this.top = (this.top << 2) ^ 0x3003
      }
      moveParity = 1 - moveParity
    } while ((bitCount(this.top & 0x3f) & 1) !== 0)

    if ((bitCount(this.top) & 2) === 0) {
      this.parity ^= moveParity
    }

    return move
  }

  bottomMove(): number {
    let move = 0
    let moveParity = 0

    do {
      if ((this.bottom & 0x800) === 0) {
        move += 1
        this.bottom <<= 1
      } else {
        move += 2
        this.bottom = (this.bottom << 2) ^ 0x3003
      }
      moveParity = 1 - moveParity
    } while ((bitCount(this.bottom & 0x3f) & 1) !== 0)

    if ((bitCount(this.bottom) & 2) === 0) {
      this.parity ^= moveParity
    }

    return move
  }

  twistMove(): void {
    const temp = this.top & 0x3f
    const p1 = bitCount(temp)
    const p3 = bitCount(this.bottom & 0xfc0)
    this.parity ^= ((p1 & p3) >> 1) & 1

    this.top = (this.top & 0xfc0) | ((this.bottom >> 6) & 0x3f)
    this.bottom = (this.bottom & 0x3f) | (temp << 6)
  }
}

function initShapePruning(pruning: Int16Array, seedCount: number, metric: number): void {
  let lastDone = 0
  let done = seedCount
  let depth = -1

  while (done !== lastDone) {
    lastDone = done
    depth += 1

    for (let i = 0; i < SHAPE_STATE_COUNT; i++) {
      if (pruning[i] !== depth) continue

      const twistIdx = ShapeTables.twistMove[i]
      if (pruning[twistIdx] === -1) {
        pruning[twistIdx] = depth + 1
        done += 1
      }

      if (metric === FACE_TURN_METRIC) {
        for (let move = 0, increment = 0, idx = i; move !== 12; move += increment) {
          idx = ShapeTables.topMove[idx]
          increment = idx & 0xf
          idx >>= 4
          if (pruning[idx] === -1) {
            pruning[idx] = depth + 1
            done += 1
          }
        }

        for (let move = 0, increment = 0, idx = i; move !== 12; move += increment) {
          idx = ShapeTables.bottomMove[idx]
          increment = idx & 0xf
          idx >>= 4
          if (pruning[idx] === -1) {
            pruning[idx] = depth + 1
            done += 1
          }
        }
      } else {
        for (let move = 0, increment = 0, idx = i; move !== 12; move += increment) {
          idx = ShapeTables.topMove[idx]
          increment = idx & 0xf
          idx >>= 4
          for (let move2 = 0, increment2 = 0, idx2 = idx; move2 !== 12; move2 += increment2) {
            idx2 = ShapeTables.bottomMove[idx2]
            increment2 = idx2 & 0xf
            idx2 >>= 4
            if (pruning[idx2] === -1) {
              pruning[idx2] = depth + 1
              done += 1
            }
          }
        }
      }
    }
  }
}

export const ShapeTables = {
  shapeIdx: new Int32Array(SHAPE_COUNT),
  shapePrun: new Int16Array(SHAPE_STATE_COUNT),
  shapePrunOpt: new Int16Array(SHAPE_STATE_COUNT),
  topMove: new Int32Array(SHAPE_STATE_COUNT),
  bottomMove: new Int32Array(SHAPE_STATE_COUNT),
  twistMove: new Int32Array(SHAPE_STATE_COUNT),
  initialized: false,

  getShape2Idx(shape: number): number {
    const shapeIndex = binarySearch(this.shapeIdx, shape & 0xffffff)
    return (shapeIndex << 1) | (shape >> 24)
  },

  init(): void {
    if (this.initialized) return

    let count = 0
    for (let i = 0; i < 13 * 13 * 13 * 13; i++) {
      const dr = HALFLAYER[i % 13]
      const dl = HALFLAYER[Math.floor(i / 13) % 13]
      const ur = HALFLAYER[Math.floor(i / 13 / 13) % 13]
      const ul = HALFLAYER[Math.floor(i / 13 / 13 / 13)]
      const value = (ul << 18) | (ur << 12) | (dl << 6) | dr
      if (bitCount(value) === 16) {
        this.shapeIdx[count] = value
        count += 1
      }
    }

    const cursor = new ShapeCursor()
    for (let i = 0; i < SHAPE_STATE_COUNT; i++) {
      cursor.setIdx(i)
      this.topMove[i] = cursor.topMove() | (cursor.getIdx() << 4)

      cursor.setIdx(i)
      this.bottomMove[i] = cursor.bottomMove() | (cursor.getIdx() << 4)

      cursor.setIdx(i)
      cursor.twistMove()
      this.twistMove[i] = cursor.getIdx()
    }

    this.shapePrun.fill(-1)
    this.shapePrunOpt.fill(-1)

    this.shapePrun[this.getShape2Idx(0x0db66db)] = 0
    this.shapePrun[this.getShape2Idx(0x1db6db6)] = 0
    this.shapePrun[this.getShape2Idx(0x16db6db)] = 0
    this.shapePrun[this.getShape2Idx(0x06dbdb6)] = 0
    this.shapePrunOpt[
      this.getShape2Idx(
        (encodeLayerShape(0x011233) << 18) |
        (encodeLayerShape(0x455677) << 12) |
        (encodeLayerShape(0x998bba) << 6) |
        encodeLayerShape(0xddcffe)
      )
    ] = 0

    initShapePruning(this.shapePrun, 4, FACE_TURN_METRIC)
    initShapePruning(this.shapePrunOpt, 1, SEARCH_METRIC)

    this.initialized = true
  },
}

const FACTORIAL = [1, 1, 2, 6, 24, 120, 720, 5040]

export class SquareState {
  edgeperm = 0
  cornperm = 0
  topEdgeFirst = false
  botEdgeFirst = false
  ml = 0
}

function set8Perm(target: Uint8Array, idx: number): void {
  let value = 0x76543210
  for (let i = 0; i < 7; i++) {
    const permutationBase = FACTORIAL[7 - i]
    let permutationIndex = Math.floor(idx / permutationBase)
    idx -= permutationIndex * permutationBase
    permutationIndex <<= 2
    target[i] = (value >> permutationIndex) & 0x7
    const mask = (1 << permutationIndex) - 1
    value = (value & mask) + ((value >> 4) & ~mask)
  }
  target[7] = value & 0xff
}

export function get8Perm(values: Uint8Array): number {
  let idx = 0
  let value = 0x76543210
  for (let i = 0; i < 7; i++) {
    const permutationIndex = values[i] << 2
    idx = (8 - i) * idx + ((value >> permutationIndex) & 0x7)
    value -= 0x11111110 << permutationIndex
  }
  return idx
}

export const SquareTables = {
  squarePrun: new Int8Array(SQUARE_STATE_COUNT),
  twistMove: new Uint16Array(SQUARE_PERMUTATION_COUNT),
  topMove: new Uint16Array(SQUARE_PERMUTATION_COUNT),
  bottomMove: new Uint16Array(SQUARE_PERMUTATION_COUNT),
  initialized: false,

  init(): void {
    if (this.initialized) return

    const positions = new Uint8Array(8)

    for (let i = 0; i < SQUARE_PERMUTATION_COUNT; i++) {
      set8Perm(positions, i)
      let temp = positions[2]
      positions[2] = positions[4]
      positions[4] = temp
      temp = positions[3]
      positions[3] = positions[5]
      positions[5] = temp
      this.twistMove[i] = get8Perm(positions)

      set8Perm(positions, i)
      temp = positions[0]
      positions[0] = positions[1]
      positions[1] = positions[2]
      positions[2] = positions[3]
      positions[3] = temp
      this.topMove[i] = get8Perm(positions)

      set8Perm(positions, i)
      temp = positions[4]
      positions[4] = positions[5]
      positions[5] = positions[6]
      positions[6] = positions[7]
      positions[7] = temp
      this.bottomMove[i] = get8Perm(positions)
    }

    this.squarePrun.fill(-1)
    this.squarePrun[0] = 0

    let depth = 0
    let done = 1
    while (done < SQUARE_STATE_COUNT) {
      const invertSearch = depth >= 11
      const find = invertSearch ? -1 : depth
      const check = invertSearch ? depth : -1
      depth += 1

      for (let i = 0; i < SQUARE_STATE_COUNT; i++) {
        if (this.squarePrun[i] !== find) continue

        let perm = i >> 1
        const ml = i & 1

        let idx = (this.twistMove[perm] << 1) | (1 - ml)
        if (this.squarePrun[idx] === check) {
          done += 1
          this.squarePrun[invertSearch ? i : idx] = depth
          if (invertSearch) continue
        }

        for (let move = 0; move < 4; move++) {
          perm = this.topMove[perm]
          idx = (perm << 1) | ml
          if (this.squarePrun[idx] === check) {
            done += 1
            this.squarePrun[invertSearch ? i : idx] = depth
            if (invertSearch) continue
          }
        }

        for (let move = 0; move < 4; move++) {
          perm = this.bottomMove[perm]
          idx = (perm << 1) | ml
          if (this.squarePrun[idx] === check) {
            done += 1
            this.squarePrun[invertSearch ? i : idx] = depth
            if (invertSearch) continue
          }
        }
      }
    }

    this.initialized = true
  },
}

export function initSquare1Tables(): void {
  ShapeTables.init()
  SquareTables.init()
}
