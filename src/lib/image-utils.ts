/**
 * Crop and compress an image for use as an avatar.
 *
 * Takes the original image source and a crop area (from react-easy-crop),
 * draws the cropped region onto a canvas at the target size, and exports
 * as a compressed JPEG blob.
 *
 * @param imageSrc - URL or object URL of the source image
 * @param cropAreaPixels - The pixel coordinates of the crop region
 * @param outputSize - Final avatar dimensions in pixels (square)
 * @param quality - JPEG quality (0 to 1)
 * @returns A compressed JPEG Blob, typically 30-80KB for a 400x400 avatar
 */
export async function getCroppedAvatar(
  imageSrc: string,
  cropAreaPixels: { x: number; y: number; width: number; height: number },
  outputSize: number = 400,
  quality: number = 0.85
): Promise<Blob> {
  const image = await loadImage(imageSrc)

  const canvas = document.createElement("canvas")
  canvas.width = outputSize
  canvas.height = outputSize

  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Could not get canvas context")

  // Draw only the cropped region, scaled to fill the output canvas
  ctx.drawImage(
    image,
    cropAreaPixels.x,
    cropAreaPixels.y,
    cropAreaPixels.width,
    cropAreaPixels.height,
    0,
    0,
    outputSize,
    outputSize
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error("Canvas toBlob returned null"))
        }
      },
      "image/jpeg",
      quality
    )
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("Failed to load image"))
    img.src = src
  })
}
