import { toPng } from "html-to-image"

/**
 * Captures a DOM element as a PNG blob using html-to-image.
 * The element should be the share card container ref.
 */
export async function captureCardAsBlob(
  element: HTMLElement
): Promise<Blob | null> {
  try {
    const dataUrl = await toPng(element, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: "#0A0A0F",
    })
    const res = await fetch(dataUrl)
    return await res.blob()
  } catch {
    return null
  }
}

/**
 * Downloads a blob as a PNG file with the given filename.
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Shares an image blob using the Web Share API (mobile), or falls back to download.
 * Returns true if shared via Web Share, false if it fell back to download.
 */
export async function shareOrDownload(
  blob: Blob,
  filename: string,
  title: string
): Promise<boolean> {
  if (navigator.share && navigator.canShare) {
    const file = new File([blob], filename, { type: "image/png" })
    const shareData = { title, files: [file] }
    if (navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData)
        return true
      } catch {
        // User cancelled or share failed — fall back to download
      }
    }
  }
  downloadBlob(blob, filename)
  return false
}
