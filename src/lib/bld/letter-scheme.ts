/**
 * Standard Speffz letter scheme for 3x3 BLD.
 * Each sticker on the cube is assigned a letter A-X.
 * Corners and edges use the same letter set but reference different pieces.
 */

/** Speffz corner stickers (24 stickers, 8 corners × 3 orientations) */
export const CORNER_STICKERS = [
  // UBL, UBR, UFR, UFL (clockwise from top-left of U face)
  { letter: "A", position: "UBL", face: "U" },
  { letter: "B", position: "UBR", face: "U" },
  { letter: "C", position: "UFR", face: "U" },
  { letter: "D", position: "UFL", face: "U" },
  // Left face corners
  { letter: "E", position: "LUB", face: "L" },
  { letter: "F", position: "LUF", face: "L" },
  { letter: "G", position: "LDF", face: "L" },
  { letter: "H", position: "LDB", face: "L" },
  // Front face corners
  { letter: "I", position: "FUL", face: "F" },
  { letter: "J", position: "FUR", face: "F" },
  { letter: "K", position: "FDR", face: "F" },
  { letter: "L", position: "FDL", face: "F" },
  // Right face corners
  { letter: "M", position: "RUF", face: "R" },
  { letter: "N", position: "RUB", face: "R" },
  { letter: "O", position: "RDB", face: "R" },
  { letter: "P", position: "RDF", face: "R" },
  // Back face corners
  { letter: "Q", position: "BUR", face: "B" },
  { letter: "R", position: "BUL", face: "B" },
  { letter: "S", position: "BDL", face: "B" },
  { letter: "T", position: "BDR", face: "B" },
  // Down face corners
  { letter: "U", position: "DFL", face: "D" },
  { letter: "V", position: "DFR", face: "D" },
  { letter: "W", position: "DBR", face: "D" },
  { letter: "X", position: "DBL", face: "D" },
]

/** Speffz edge stickers (24 stickers, 12 edges × 2 orientations) */
export const EDGE_STICKERS = [
  // U face edges
  { letter: "A", position: "UB", face: "U" },
  { letter: "B", position: "UR", face: "U" },
  { letter: "C", position: "UF", face: "U" },
  { letter: "D", position: "UL", face: "U" },
  // L face edges
  { letter: "E", position: "LU", face: "L" },
  { letter: "F", position: "LF", face: "L" },
  { letter: "G", position: "LD", face: "L" },
  { letter: "H", position: "LB", face: "L" },
  // F face edges
  { letter: "I", position: "FU", face: "F" },
  { letter: "J", position: "FR", face: "F" },
  { letter: "K", position: "FD", face: "F" },
  { letter: "L", position: "FL", face: "F" },
  // R face edges
  { letter: "M", position: "RU", face: "R" },
  { letter: "N", position: "RB", face: "R" },
  { letter: "O", position: "RD", face: "R" },
  { letter: "P", position: "RF", face: "R" },
  // B face edges
  { letter: "Q", position: "BU", face: "B" },
  { letter: "R", position: "BL", face: "B" },
  { letter: "S", position: "BD", face: "B" },
  { letter: "T", position: "BR", face: "B" },
  // D face edges
  { letter: "U", position: "DF", face: "D" },
  { letter: "V", position: "DR", face: "D" },
  { letter: "W", position: "DB", face: "D" },
  { letter: "X", position: "DL", face: "D" },
]

/** Common buffer positions */
export const BUFFER_OPTIONS = {
  corners: [
    { label: "UFR (Speffz C)", letter: "C", position: "UFR" },
    { label: "UBL (Speffz A)", letter: "A", position: "UBL" },
    { label: "UFL (Speffz D)", letter: "D", position: "UFL" },
  ],
  edges: [
    { label: "UF (Speffz C)", letter: "C", position: "UF" },
    { label: "UR (Speffz B)", letter: "B", position: "UR" },
    { label: "UB (Speffz A)", letter: "A", position: "UB" },
    { label: "DF (Speffz U)", letter: "U", position: "DF" },
  ],
}

/** Face colors for display */
export const FACE_COLORS: Record<string, string> = {
  U: "bg-white text-black",
  D: "bg-yellow-400 text-black",
  F: "bg-green-600 text-white",
  B: "bg-blue-600 text-white",
  L: "bg-orange-500 text-white",
  R: "bg-red-600 text-white",
}

/**
 * Check if a memo string has odd parity.
 * In BLD, if the number of edge targets (letters) is odd, you have parity.
 * Same logic applies to corners independently.
 */
export function hasParity(memoLetters: string): boolean {
  const cleaned = memoLetters.replace(/[^a-zA-Z]/g, "")
  return cleaned.length % 2 === 1
}

/**
 * Parse a memo string into letter pairs.
 * Input: "AB CD EF" or "ABCDEF" or "AB-CD-EF"
 * Output: ["AB", "CD", "EF"]
 */
export function parseMemo(memo: string): string[] {
  const cleaned = memo.replace(/[^a-zA-Z]/g, "").toUpperCase()
  const pairs: string[] = []
  for (let i = 0; i < cleaned.length; i += 2) {
    if (i + 1 < cleaned.length) {
      pairs.push(cleaned[i] + cleaned[i + 1])
    } else {
      pairs.push(cleaned[i]) // Odd letter out = parity indicator
    }
  }
  return pairs
}
