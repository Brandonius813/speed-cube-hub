import {
  PRUNING_INCREMENT,
  ShapeTables,
  SquareState,
  SquareTables,
  initSquare1Tables,
} from "./tables"

export type Square1Rng = () => number

function secureRandom(): number {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const values = new Uint32Array(1)
    crypto.getRandomValues(values)
    return values[0] / 4294967296
  }
  return Math.random()
}

function randomInt(rng: Square1Rng, max: number): number {
  return Math.floor(rng() * max)
}

export class FullCube {
  ul = 0x011233
  ur = 0x455677
  dl = 0x998bba
  dr = 0xddcffe
  ml = 0

  private parityBuffer = new Array<number>(16).fill(0)

  constructor() {
    initSquare1Tables()
  }

  copy(other: FullCube): void {
    this.ul = other.ul
    this.ur = other.ur
    this.dl = other.dl
    this.dr = other.dr
    this.ml = other.ml
  }

  isSolved(): boolean {
    return (
      this.ul === 0x011233 &&
      this.ur === 0x455677 &&
      this.dl === 0x998bba &&
      this.dr === 0xddcffe &&
      this.ml === 0
    )
  }

  static randomCube(rng: Square1Rng = secureRandom): FullCube {
    initSquare1Tables()

    const shape = ShapeTables.shapeIdx[randomInt(rng, 3678)]
    const cube = new FullCube()
    let corner = (0x01234567 << 1) | 0x11111111
    let edge = 0x01234567 << 1
    let remainingCorners = 8
    let remainingEdges = 8

    for (let i = 0; i < 24; i++) {
      if (((shape >> i) & 1) === 0) {
        const randomOffset = randomInt(rng, remainingEdges) << 2
        cube.setPiece(23 - i, (edge >> randomOffset) & 0xf)
        const mask = (1 << randomOffset) - 1
        edge = (edge & mask) + ((edge >> 4) & ~mask)
        remainingEdges -= 1
      } else {
        const randomOffset = randomInt(rng, remainingCorners) << 2
        const piece = (corner >> randomOffset) & 0xf
        cube.setPiece(23 - i, piece)
        cube.setPiece(22 - i, piece)
        const mask = (1 << randomOffset) - 1
        corner = (corner & mask) + ((corner >> 4) & ~mask)
        remainingCorners -= 1
        i += 1
      }
    }

    cube.ml = randomInt(rng, 2)
    return cube
  }

  doMove(move: number): void {
    let shiftedMove = move << 2
    if (shiftedMove > 24) {
      shiftedMove = 48 - shiftedMove
      const temp = this.ul
      this.ul = ((this.ul >> shiftedMove) | (this.ur << (24 - shiftedMove))) & 0xffffff
      this.ur = ((this.ur >> shiftedMove) | (temp << (24 - shiftedMove))) & 0xffffff
    } else if (shiftedMove > 0) {
      const temp = this.ul
      this.ul = ((this.ul << shiftedMove) | (this.ur >> (24 - shiftedMove))) & 0xffffff
      this.ur = ((this.ur << shiftedMove) | (temp >> (24 - shiftedMove))) & 0xffffff
    } else if (shiftedMove === 0) {
      const temp = this.ur
      this.ur = this.dl
      this.dl = temp
      this.ml = 1 - this.ml
    } else if (shiftedMove >= -24) {
      shiftedMove = -shiftedMove
      const temp = this.dl
      this.dl = ((this.dl << shiftedMove) | (this.dr >> (24 - shiftedMove))) & 0xffffff
      this.dr = ((this.dr << shiftedMove) | (temp >> (24 - shiftedMove))) & 0xffffff
    } else {
      shiftedMove = 48 + shiftedMove
      const temp = this.dl
      this.dl = ((this.dl >> shiftedMove) | (this.dr << (24 - shiftedMove))) & 0xffffff
      this.dr = ((this.dr >> shiftedMove) | (temp << (24 - shiftedMove))) & 0xffffff
    }
  }

  private pieceAt(idx: number): number {
    let result: number
    if (idx < 6) {
      result = this.ul >> ((5 - idx) << 2)
    } else if (idx < 12) {
      result = this.ur >> ((11 - idx) << 2)
    } else if (idx < 18) {
      result = this.dl >> ((17 - idx) << 2)
    } else {
      result = this.dr >> ((23 - idx) << 2)
    }
    return result & 0x0f
  }

  setPiece(idx: number, value: number): void {
    if (idx < 6) {
      this.ul &= ~(0xf << ((5 - idx) << 2))
      this.ul |= value << ((5 - idx) << 2)
      return
    }
    if (idx < 12) {
      this.ur &= ~(0xf << ((11 - idx) << 2))
      this.ur |= value << ((11 - idx) << 2)
      return
    }
    if (idx < 18) {
      this.dl &= ~(0xf << ((17 - idx) << 2))
      this.dl |= value << ((17 - idx) << 2)
      return
    }
    if (idx < 24) {
      this.dr &= ~(0xf << ((23 - idx) << 2))
      this.dr |= value << ((23 - idx) << 2)
      return
    }
    this.ml = value
  }

  private getParity(): number {
    let count = 0
    this.parityBuffer[0] = this.pieceAt(0)
    for (let i = 1; i < 24; i++) {
      const piece = this.pieceAt(i)
      if (piece !== this.parityBuffer[count]) {
        count += 1
        this.parityBuffer[count] = piece
      }
    }

    let parity = 0
    for (let a = 0; a < 16; a++) {
      for (let b = a + 1; b < 16; b++) {
        if (this.parityBuffer[a] > this.parityBuffer[b]) {
          parity ^= 1
        }
      }
    }
    return parity
  }

  getShapeIdx(): number {
    let urx = this.ur & 0x111111
    urx |= urx >> 3
    urx |= urx >> 6
    urx = (urx & 0xf) | ((urx >> 12) & 0x30)

    let ulx = this.ul & 0x111111
    ulx |= ulx >> 3
    ulx |= ulx >> 6
    ulx = (ulx & 0xf) | ((ulx >> 12) & 0x30)

    let drx = this.dr & 0x111111
    drx |= drx >> 3
    drx |= drx >> 6
    drx = (drx & 0xf) | ((drx >> 12) & 0x30)

    let dlx = this.dl & 0x111111
    dlx |= dlx >> 3
    dlx |= dlx >> 6
    dlx = (dlx & 0xf) | ((dlx >> 12) & 0x30)

    return ShapeTables.getShape2Idx(
      (this.getParity() << 24) | (ulx << 18) | (urx << 12) | (dlx << 6) | drx
    )
  }

  getSquare(square: SquareState): void {
    const permutation = new Uint8Array(8)

    for (let i = 0; i < 8; i++) {
      permutation[i] = this.pieceAt(i * 3 + 1) >> 1
    }
    square.cornperm = get8Perm(permutation)

    square.topEdgeFirst = this.pieceAt(0) === this.pieceAt(1)
    let sourceIndex = square.topEdgeFirst ? 2 : 0
    let targetIndex = 0
    for (; targetIndex < 4; sourceIndex += 3, targetIndex++) {
      permutation[targetIndex] = this.pieceAt(sourceIndex) >> 1
    }

    square.botEdgeFirst = this.pieceAt(12) === this.pieceAt(13)
    sourceIndex = square.botEdgeFirst ? 14 : 12
    for (; targetIndex < 8; sourceIndex += 3, targetIndex++) {
      permutation[targetIndex] = this.pieceAt(sourceIndex) >> 1
    }
    square.edgeperm = get8Perm(permutation)
    square.ml = this.ml
  }
}

function get8Perm(values: Uint8Array): number {
  let idx = 0
  let value = 0x76543210
  for (let i = 0; i < 7; i++) {
    const permutationIndex = values[i] << 2
    idx = (8 - i) * idx + ((value >> permutationIndex) & 0x7)
    value -= 0x11111110 << permutationIndex
  }
  return idx
}

export function initSquare1Search(): void {
  initSquare1Tables()
}

export class Search {
  static readonly INVERSE_SOLUTION = 0x2

  private readonly move = new Int32Array(100)
  private readonly scratchCube = new FullCube()
  private readonly square = new SquareState()

  private cube: FullCube | null = null
  private length1 = 0
  private moveLength1 = 0
  private maxLength2 = 0
  private verbose = 0
  private solutionString: string | null = null

  constructor() {
    initSquare1Search()
  }

  solution(cube: FullCube, verbose = 0): string | null {
    this.cube = cube
    this.verbose = verbose
    this.solutionString = null

    const shape = cube.getShapeIdx()
    for (this.length1 = ShapeTables.shapePrun[shape]; this.length1 < 100; this.length1++) {
      this.maxLength2 = Math.min(31 - this.length1, 17)
      if (this.idaPhase1(shape, ShapeTables.shapePrun[shape], this.length1, 0, -1)) {
        break
      }
    }

    const solution = (this.solutionString ?? "").trim()
    return solution || null
  }

  solutionOpt(cube: FullCube, maxLength: number, verbose = 0): string | null {
    this.cube = cube
    this.verbose = verbose
    this.solutionString = null

    const shape = cube.getShapeIdx()
    for (
      this.length1 = ShapeTables.shapePrunOpt[shape] * PRUNING_INCREMENT;
      this.length1 <= maxLength * PRUNING_INCREMENT;
      this.length1 += PRUNING_INCREMENT
    ) {
      if (this.phase1Opt(shape, ShapeTables.shapePrunOpt[shape], this.length1, 0, -1, 0)) {
        break
      }
    }

    const solution = (this.solutionString ?? "").trim()
    return solution || null
  }

  private static count0xf(value: number): number {
    let current = value & (value >> 1)
    current &= current >> 2
    return countBits(current & 0x11111111)
  }

  private phase1Opt(
    shape: number,
    _pruningValue: number,
    maxLength: number,
    depth: number,
    lastMove: number,
    lastTurns: number
  ): boolean {
    const turnDelta =
      Search.count0xf((lastTurns ^ ~0x000000) & 0xff00ff) -
      Search.count0xf((lastTurns ^ ~0x666666) & 0xff00ff)
    if (turnDelta < 0 || (turnDelta === 0 && ((lastTurns >>> 20) & 0xf) >= 6)) {
      return false
    }

    if (Math.floor(maxLength / PRUNING_INCREMENT) === 0) {
      this.moveLength1 = depth
      if (this.isSolvedInPhase1()) return true
      if (maxLength === 0) return false
    }

    if (lastMove !== 0) {
      const nextShape = ShapeTables.twistMove[shape]
      const pruning = ShapeTables.shapePrunOpt[nextShape]
      if (pruning < maxLength / PRUNING_INCREMENT) {
        this.move[depth] = 0
        const nextMaxLength = (Math.floor(maxLength / PRUNING_INCREMENT) - 1) * PRUNING_INCREMENT
        if (this.phase1Opt(nextShape, pruning, nextMaxLength, depth + 1, 0, lastTurns << 8)) {
          return true
        }
      }
    }

    let nextShape = shape
    if (lastMove <= 0) {
      let move = 0
      while (true) {
        move += ShapeTables.topMove[nextShape]
        nextShape = move >> 4
        move &= 0xf
        if (move >= 12) break

        const pruning = ShapeTables.shapePrunOpt[nextShape]
        if (pruning * PRUNING_INCREMENT > maxLength + PRUNING_INCREMENT - 1) {
          break
        }
        if (pruning * PRUNING_INCREMENT < maxLength + PRUNING_INCREMENT - 1) {
          this.move[depth] = move
          if (
            this.phase1Opt(nextShape, pruning, maxLength - 1, depth + 1, 1, lastTurns | (move << 4))
          ) {
            return true
          }
        }
      }
    }

    nextShape = shape
    if (lastMove <= 1) {
      let move = 0
      while (true) {
        move += ShapeTables.bottomMove[nextShape]
        nextShape = move >> 4
        move &= 0xf
        if (move >= 12) break

        const pruning = ShapeTables.shapePrunOpt[nextShape]
        if (pruning * PRUNING_INCREMENT > maxLength + PRUNING_INCREMENT - 1) {
          break
        }
        if (pruning * PRUNING_INCREMENT < maxLength + PRUNING_INCREMENT - 1) {
          this.move[depth] = -move
          if (this.phase1Opt(nextShape, pruning, maxLength - 1, depth + 1, 2, lastTurns | move)) {
            return true
          }
        }
      }
    }

    return false
  }

  private idaPhase1(
    shape: number,
    pruningValue: number,
    maxLength: number,
    depth: number,
    lastMove: number
  ): boolean {
    if (pruningValue === 0 && maxLength < 4) {
      this.moveLength1 = depth
      return maxLength === 0 && this.initPhase2()
    }

    if (lastMove !== 0) {
      const nextShape = ShapeTables.twistMove[shape]
      const pruning = ShapeTables.shapePrun[nextShape]
      if (pruning < maxLength) {
        this.move[depth] = 0
        if (this.idaPhase1(nextShape, pruning, maxLength - 1, depth + 1, 0)) {
          return true
        }
      }
    }

    if (lastMove <= 0) {
      let move = 0
      let nextShape = shape
      while (true) {
        move += ShapeTables.topMove[nextShape]
        nextShape = move >> 4
        move &= 0xf
        if (move >= 12) break

        const pruning = ShapeTables.shapePrun[nextShape]
        if (pruning > maxLength) {
          break
        }
        if (pruning < maxLength) {
          this.move[depth] = move
          if (this.idaPhase1(nextShape, pruning, maxLength - 1, depth + 1, 1)) {
            return true
          }
        }
      }
    }

    if (lastMove <= 1) {
      let move = 0
      let nextShape = shape
      while (true) {
        move += ShapeTables.bottomMove[nextShape]
        nextShape = move >> 4
        move &= 0xf
        if (move >= 6) break

        const pruning = ShapeTables.shapePrun[nextShape]
        if (pruning > maxLength) {
          break
        }
        if (pruning < maxLength) {
          this.move[depth] = -move
          if (this.idaPhase1(nextShape, pruning, maxLength - 1, depth + 1, 2)) {
            return true
          }
        }
      }
    }

    return false
  }

  private isSolvedInPhase1(): boolean {
    if (!this.cube) return false

    this.scratchCube.copy(this.cube)
    for (let i = 0; i < this.moveLength1; i++) {
      this.scratchCube.doMove(this.move[i])
    }

    if (!this.scratchCube.isSolved()) return false

    this.solutionString = this.moveToString(this.moveLength1)
    return true
  }

  private initPhase2(): boolean {
    if (!this.cube) return false

    this.scratchCube.copy(this.cube)
    for (let i = 0; i < this.moveLength1; i++) {
      this.scratchCube.doMove(this.move[i])
    }

    this.scratchCube.getSquare(this.square)
    const edge = this.square.edgeperm
    const corner = this.square.cornperm
    const middleLayer = this.square.ml
    const pruning = Math.max(
      SquareTables.squarePrun[(this.square.edgeperm << 1) | middleLayer],
      SquareTables.squarePrun[(this.square.cornperm << 1) | middleLayer]
    )

    for (let i = pruning; i < this.maxLength2; i++) {
      if (
        this.idaPhase2(
          edge,
          corner,
          this.square.topEdgeFirst,
          this.square.botEdgeFirst,
          middleLayer,
          i,
          this.moveLength1,
          0
        )
      ) {
        this.solutionString = this.moveToString(i + this.moveLength1)
        return true
      }
    }

    return false
  }

  private moveToString(length: number): string {
    const outputMoves = new Int32Array(length)
    if ((this.verbose & Search.INVERSE_SOLUTION) !== 0) {
      for (let i = length - 1; i >= 0; i--) {
        outputMoves[length - 1 - i] =
          this.move[i] > 0 ? 12 - this.move[i] : this.move[i] < 0 ? -12 - this.move[i] : this.move[i]
      }
    } else {
      for (let i = 0; i < length; i++) {
        outputMoves[i] = this.move[i]
      }
    }

    let top = 0
    let bottom = 0
    let output = ""
    for (let i = 0; i < length; i++) {
      const value = outputMoves[i]
      if (value > 0) {
        top = value > 6 ? value - 12 : value
      } else if (value < 0) {
        bottom = -value > 6 ? -value - 12 : -value
      } else {
        output += top === 0 && bottom === 0 ? " / " : `(${top},${bottom}) / `
        top = 0
        bottom = 0
      }
    }

    if (top !== 0 || bottom !== 0) {
      output += `(${top},${bottom})`
    }
    return output.trim()
  }

  private idaPhase2(
    edge: number,
    corner: number,
    topEdgeFirst: boolean,
    botEdgeFirst: boolean,
    middleLayer: number,
    maxLength: number,
    depth: number,
    lastMove: number
  ): boolean {
    if (maxLength === 0 && !topEdgeFirst && botEdgeFirst) {
      return edge === 0 && corner === 0 && middleLayer === 0
    }

    if (lastMove !== 0 && topEdgeFirst === botEdgeFirst) {
      const nextEdge = SquareTables.twistMove[edge]
      const nextCorner = SquareTables.twistMove[corner]

      if (
        SquareTables.squarePrun[(nextEdge << 1) | (1 - middleLayer)] < maxLength &&
        SquareTables.squarePrun[(nextCorner << 1) | (1 - middleLayer)] < maxLength
      ) {
        this.move[depth] = 0
        if (
          this.idaPhase2(
            nextEdge,
            nextCorner,
            topEdgeFirst,
            botEdgeFirst,
            1 - middleLayer,
            maxLength - 1,
            depth + 1,
            0
          )
        ) {
          return true
        }
      }
    }

    if (lastMove <= 0) {
      let nextTopEdgeFirst = !topEdgeFirst
      let nextEdge = nextTopEdgeFirst ? SquareTables.topMove[edge] : edge
      let nextCorner = nextTopEdgeFirst ? corner : SquareTables.topMove[corner]
      let move = nextTopEdgeFirst ? 1 : 2
      let pruning1 = SquareTables.squarePrun[(nextEdge << 1) | middleLayer]
      let pruning2 = SquareTables.squarePrun[(nextCorner << 1) | middleLayer]
      while (move < 12 && pruning1 <= maxLength && pruning1 <= maxLength) {
        if (pruning1 < maxLength && pruning2 < maxLength) {
          this.move[depth] = move
          if (
            this.idaPhase2(
              nextEdge,
              nextCorner,
              nextTopEdgeFirst,
              botEdgeFirst,
              middleLayer,
              maxLength - 1,
              depth + 1,
              1
            )
          ) {
            return true
          }
        }
        nextTopEdgeFirst = !nextTopEdgeFirst
        if (nextTopEdgeFirst) {
          nextEdge = SquareTables.topMove[nextEdge]
          pruning1 = SquareTables.squarePrun[(nextEdge << 1) | middleLayer]
          move += 1
        } else {
          nextCorner = SquareTables.topMove[nextCorner]
          pruning2 = SquareTables.squarePrun[(nextCorner << 1) | middleLayer]
          move += 2
        }
      }
    }

    if (lastMove <= 1) {
      let nextBotEdgeFirst = !botEdgeFirst
      let nextEdge = nextBotEdgeFirst ? SquareTables.bottomMove[edge] : edge
      let nextCorner = nextBotEdgeFirst ? corner : SquareTables.bottomMove[corner]
      let move = nextBotEdgeFirst ? 1 : 2
      let pruning1 = SquareTables.squarePrun[(nextEdge << 1) | middleLayer]
      let pruning2 = SquareTables.squarePrun[(nextCorner << 1) | middleLayer]
      while (move < (maxLength > 6 ? 6 : 12) && pruning1 <= maxLength && pruning1 <= maxLength) {
        if (pruning1 < maxLength && pruning2 < maxLength) {
          this.move[depth] = -move
          if (
            this.idaPhase2(
              nextEdge,
              nextCorner,
              topEdgeFirst,
              nextBotEdgeFirst,
              middleLayer,
              maxLength - 1,
              depth + 1,
              2
            )
          ) {
            return true
          }
        }
        nextBotEdgeFirst = !nextBotEdgeFirst
        if (nextBotEdgeFirst) {
          nextEdge = SquareTables.bottomMove[nextEdge]
          pruning1 = SquareTables.squarePrun[(nextEdge << 1) | middleLayer]
          move += 1
        } else {
          nextCorner = SquareTables.bottomMove[nextCorner]
          pruning2 = SquareTables.squarePrun[(nextCorner << 1) | middleLayer]
          move += 2
        }
      }
    }

    return false
  }
}

function countBits(value: number): number {
  let count = 0
  let current = value >>> 0
  while (current !== 0) {
    current &= current - 1
    count += 1
  }
  return count
}
