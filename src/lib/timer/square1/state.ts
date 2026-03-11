import { FullCube } from "./search"

export type Square1Move =
  | { kind: "turn"; top: number; bottom: number }
  | { kind: "slash" }

const SOLVED_PIECES = Int32Array.from([
  0, 0, 1, 2, 2, 3, 4, 4, 5, 6, 6, 7,
  8, 9, 9, 10, 11, 11, 12, 13, 13, 14, 15, 15,
])

const FACES = "LBRFUD"
const DEFAULT_COLOR_SCHEME = {
  B: "#ff8000",
  D: "#ffffff",
  F: "#ff0000",
  L: "#0000ff",
  R: "#00ff00",
  U: "#ffff00",
} as const

const RADIUS = 32
const RADIUS_MULTIPLIER = Math.sqrt(2) * Math.cos((15 * Math.PI) / 180)
const OUTER_MULTIPLIER = 1.4
const SQRT3 = Math.sqrt(3)

function formatNumber(value: number): string {
  return Number(value.toFixed(2)).toString()
}

function rotatePoint(x: number, y: number, angle: number): [number, number] {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return [x * cos - y * sin, x * sin + y * cos]
}

function polygonToSvg(
  points: Array<[number, number]>,
  fill: string,
  centerX: number,
  centerY: number,
  angle: number
): string {
  const data = points
    .map(([x, y]) => {
      const [rotatedX, rotatedY] = rotatePoint(x, y, angle)
      return `${formatNumber(rotatedX + centerX)},${formatNumber(rotatedY + centerY)}`
    })
    .join(" ")

  return `<polygon points="${data}" fill="${fill}" stroke="#000" stroke-width="1.4" stroke-linejoin="round" />`
}

function getWedgePolygons(): Array<Array<[number, number]>> {
  const tempX = (SQRT3 * RADIUS) / 2
  const tempY = RADIUS / 2
  return [
    [
      [0, 0],
      [RADIUS, 0],
      [tempX, tempY],
    ],
    [
      [RADIUS, 0],
      [OUTER_MULTIPLIER * RADIUS, 0],
      [OUTER_MULTIPLIER * tempX, OUTER_MULTIPLIER * tempY],
      [tempX, tempY],
    ],
  ]
}

function getCornerPolygons(): Array<Array<[number, number]>> {
  const tempX = RADIUS * (1 + Math.cos((75 * Math.PI) / 180) / Math.sqrt(2))
  const tempY = (RADIUS * Math.sin((75 * Math.PI) / 180)) / Math.sqrt(2)
  const innerX = RADIUS / 2
  const innerY = (SQRT3 * RADIUS) / 2

  return [
    [
      [0, 0],
      [RADIUS, 0],
      [tempX, tempY],
      [innerX, innerY],
    ],
    [
      [RADIUS, 0],
      [OUTER_MULTIPLIER * RADIUS, 0],
      [OUTER_MULTIPLIER * tempX, OUTER_MULTIPLIER * tempY],
      [tempX, tempY],
    ],
    [
      [OUTER_MULTIPLIER * tempX, OUTER_MULTIPLIER * tempY],
      [tempX, tempY],
      [innerX, innerY],
      [OUTER_MULTIPLIER * innerX, OUTER_MULTIPLIER * innerY],
    ],
  ]
}

function getWidth(radius: number): number {
  return Math.trunc(2 * RADIUS_MULTIPLIER * OUTER_MULTIPLIER * radius)
}

function getHeight(radius: number): number {
  return Math.trunc(4 * RADIUS_MULTIPLIER * OUTER_MULTIPLIER * radius)
}

function isCornerPiece(piece: number): boolean {
  return ((piece + (piece <= 7 ? 0 : 1)) % 2) === 0
}

function getPieceColors(piece: number): string[] {
  const colors = FACES.split("").map((face) => DEFAULT_COLOR_SCHEME[face as keyof typeof DEFAULT_COLOR_SCHEME])
  const isUpper = piece <= 7
  const top = isUpper ? colors[4] : colors[5]

  if (isCornerPiece(piece)) {
    let adjustedPiece = piece
    if (!isUpper) {
      adjustedPiece = 15 - adjustedPiece
    }

    let a = colors[(Math.floor(adjustedPiece / 2) + 3) % 4]
    let b = colors[Math.floor(adjustedPiece / 2)]
    if (!isUpper) {
      const temp = a
      a = b
      b = temp
    }

    return [top, a, b]
  }

  let adjustedPiece = piece
  if (!isUpper) {
    adjustedPiece = 14 - adjustedPiece
  }

  return [top, colors[Math.floor(adjustedPiece / 2)]]
}

function formatMove(move: Square1Move): string {
  return move.kind === "slash" ? "/" : `(${move.top},${move.bottom})`
}

function validateTurnAmount(amount: number, label: "top" | "bottom"): void {
  if (!Number.isInteger(amount) || amount < -5 || amount > 6) {
    throw new Error(`Square-1 ${label} turn must be between -5 and 6, got ${amount}.`)
  }
}

export class Square1State {
  readonly sliceSolved: boolean
  readonly pieces: Int32Array

  constructor(sliceSolved = true, pieces: Int32Array = SOLVED_PIECES) {
    this.sliceSolved = sliceSolved
    this.pieces = new Int32Array(pieces)
  }

  static solved(): Square1State {
    return new Square1State(true, SOLVED_PIECES)
  }

  clone(): Square1State {
    return new Square1State(this.sliceSolved, this.pieces)
  }

  canSlash(): boolean {
    return !(
      this.pieces[0] === this.pieces[11] ||
      this.pieces[6] === this.pieces[5] ||
      this.pieces[12] === this.pieces[23] ||
      this.pieces[18] === this.pieces[17]
    )
  }

  private doSlash(): Int32Array {
    const nextPieces = new Int32Array(this.pieces)
    for (let i = 0; i < 6; i++) {
      const piece = nextPieces[i + 12]
      nextPieces[i + 12] = nextPieces[i + 6]
      nextPieces[i + 6] = piece
    }
    return nextPieces
  }

  private doRotateTopAndBottom(top: number, bottom: number): Int32Array {
    const normalizedTop = ((-top % 12) + 12) % 12
    const normalizedBottom = ((-bottom % 12) + 12) % 12
    const nextPieces = new Int32Array(this.pieces)
    const temp = new Int32Array(12)

    temp.set(nextPieces.subarray(0, 12))
    for (let i = 0; i < 12; i++) {
      nextPieces[i] = temp[(normalizedTop + i) % 12]
    }

    temp.set(nextPieces.subarray(12, 24))
    for (let i = 0; i < 12; i++) {
      nextPieces[i + 12] = temp[(normalizedBottom + i) % 12]
    }

    return nextPieces
  }

  applyMove(move: Square1Move): Square1State {
    if (move.kind === "slash") {
      if (!this.canSlash()) {
        throw new Error("Square-1 slash move is illegal in the current shape.")
      }
      return new Square1State(!this.sliceSolved, this.doSlash())
    }

    validateTurnAmount(move.top, "top")
    validateTurnAmount(move.bottom, "bottom")
    if (move.top === 0 && move.bottom === 0) {
      throw new Error("Square-1 turn cannot be (0,0).")
    }

    return new Square1State(
      this.sliceSolved,
      this.doRotateTopAndBottom(move.top, move.bottom)
    )
  }

  applyAlgorithm(scramble: string): Square1State {
    return applySquare1Algorithm(scramble, this)
  }

  toFullCube(): FullCube {
    const map1 = [3, 2, 1, 0, 7, 6, 5, 4, 0xa, 0xb, 8, 9, 0xe, 0xf, 0xc, 0xd]
    const map2 = [5, 4, 3, 2, 1, 0, 11, 10, 9, 8, 7, 6, 17, 16, 15, 14, 13, 12, 23, 22, 21, 20, 19, 18]
    const cube = new FullCube()

    for (let i = 0; i < 24; i++) {
      cube.setPiece(map2[i], map1[this.pieces[i]])
    }
    cube.setPiece(24, this.sliceSolved ? 0 : 1)
    return cube
  }
}

export function parseSquare1Algorithm(scramble: string): Square1Move[] {
  const trimmed = scramble.trim()
  if (!trimmed) return []

  const pattern = /\s*(?:\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)|(\/))/gy
  const moves: Square1Move[] = []
  let index = 0

  while (index < scramble.length) {
    pattern.lastIndex = index
    const match = pattern.exec(scramble)
    if (!match) {
      if (/^\s*$/.test(scramble.slice(index))) break
      throw new Error(`Invalid Square-1 notation near "${scramble.slice(index).trim().slice(0, 16)}".`)
    }

    index = pattern.lastIndex
    if (match[3]) {
      moves.push({ kind: "slash" })
      continue
    }

    const top = Number(match[1])
    const bottom = Number(match[2])
    validateTurnAmount(top, "top")
    validateTurnAmount(bottom, "bottom")
    if (top === 0 && bottom === 0) {
      throw new Error("Square-1 turn cannot be (0,0).")
    }
    moves.push({ kind: "turn", top, bottom })
  }

  return moves
}

export function splitSquare1Tokens(scramble: string): string[] {
  return parseSquare1Algorithm(scramble).map(formatMove)
}

export function formatSquare1Algorithm(moves: Square1Move[]): string {
  return moves.map(formatMove).join(" ")
}

export function applySquare1Algorithm(
  scramble: string,
  startingState: Square1State = Square1State.solved()
): Square1State {
  let state = startingState
  for (const move of parseSquare1Algorithm(scramble)) {
    state = state.applyMove(move)
  }
  return state
}

function renderPiece(piece: number, centerX: number, centerY: number, angle: number): string {
  const colors = getPieceColors(piece)
  const polygons = isCornerPiece(piece) ? getCornerPolygons() : getWedgePolygons()
  const parts: string[] = []

  for (let i = polygons.length - 1; i >= 0; i--) {
    parts.push(polygonToSvg(polygons[i], colors[i], centerX, centerY, angle))
  }

  return parts.join("")
}

function renderFace(pieces: Int32Array, centerX: number, centerY: number, startAngle: number): string {
  let angle = startAngle
  let svg = ""

  for (let index = 0; index < 12; index++) {
    const piece = pieces[index]
    svg += renderPiece(piece, centerX, centerY, angle)
    angle += ((isCornerPiece(piece) ? 60 : 30) * Math.PI) / 180
    if (index < 11 && piece === pieces[index + 1]) {
      index += 1
    }
  }

  return svg
}

export function renderSquare1Svg(state: Square1State): string {
  const width = getWidth(RADIUS)
  const height = getHeight(RADIUS)
  const colors = FACES.split("").map((face) => DEFAULT_COLOR_SCHEME[face as keyof typeof DEFAULT_COLOR_SCHEME])
  const halfSquareWidth = (RADIUS * RADIUS_MULTIPLIER * OUTER_MULTIPLIER) / Math.sqrt(2)
  const edgeWidth = 2 * RADIUS * OUTER_MULTIPLIER * Math.sin((15 * Math.PI) / 180)
  const cornerWidth = halfSquareWidth - edgeWidth / 2
  const midY = height / 2 - (RADIUS * (OUTER_MULTIPLIER - 1)) / 2
  const midHeight = RADIUS * (OUTER_MULTIPLIER - 1)
  const midX = width / 2 - halfSquareWidth
  const rightWidth = state.sliceSolved ? 2 * cornerWidth + edgeWidth : cornerWidth + edgeWidth
  const rightFill = state.sliceSolved ? colors[3] : colors[1]
  const topCenterY = height / 4
  const bottomCenterY = topCenterY * 3

  const middleBand = [
    `<rect x="${formatNumber(midX)}" y="${formatNumber(midY)}" width="${formatNumber(rightWidth)}" height="${formatNumber(midHeight)}" fill="${rightFill}" />`,
    `<rect x="${formatNumber(midX)}" y="${formatNumber(midY)}" width="${formatNumber(cornerWidth)}" height="${formatNumber(midHeight)}" fill="${colors[3]}" />`,
    `<rect x="${formatNumber(midX)}" y="${formatNumber(midY)}" width="${formatNumber(rightWidth)}" height="${formatNumber(midHeight)}" fill="none" stroke="#000" stroke-width="1.4" />`,
    `<rect x="${formatNumber(midX)}" y="${formatNumber(midY)}" width="${formatNumber(cornerWidth)}" height="${formatNumber(midHeight)}" fill="none" stroke="#000" stroke-width="1.4" />`,
  ].join("")

  const topFace = renderFace(state.pieces.subarray(0, 12), width / 2, topCenterY, (105 * Math.PI) / 180)
  const bottomFace = renderFace(
    state.pieces.subarray(12, 24),
    width / 2,
    bottomCenterY,
    (-105 * Math.PI) / 180
  )

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`,
    middleBand,
    topFace,
    bottomFace,
    "</svg>",
  ].join("")
}

export function renderSquare1SvgFromScramble(scramble: string): string {
  return renderSquare1Svg(applySquare1Algorithm(scramble))
}
