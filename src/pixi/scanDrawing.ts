/** Turn a drawing on light paper into a small, transparent PNG for the map. */
export interface ScanOptions {
  mode?: 'sketch' | 'color'
  /** Normalized rectangle selected around the drawing before extraction. */
  crop?: { x: number; y: number; width: number; height: number }
}

export async function scanDrawing(file: File, threshold = 210, options: ScanOptions = {}): Promise<string> {
  if (!file.type.startsWith('image/') || file.size > 12 * 1024 * 1024) {
    throw new Error('Choose an image smaller than 12 MB.')
  }

  const bitmap = await createImageBitmap(file)
  try {
    const selection = options.crop
    const sourceX = selection ? Math.round(selection.x * bitmap.width) : 0
    const sourceY = selection ? Math.round(selection.y * bitmap.height) : 0
    const sourceWidth = selection ? Math.round(selection.width * bitmap.width) : bitmap.width
    const sourceHeight = selection ? Math.round(selection.height * bitmap.height) : bitmap.height
    if (sourceWidth < 8 || sourceHeight < 8) throw new Error('Select a larger area around the drawing.')
    const scale = Math.min(1, 512 / Math.max(sourceWidth, sourceHeight))
    const width = Math.max(1, Math.round(sourceWidth * scale))
    const height = Math.max(1, Math.round(sourceHeight * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('Your browser could not process this image.')
    context.drawImage(bitmap, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height)
    const pixels = context.getImageData(0, 0, width, height)
    const data = pixels.data
    if (options.mode === 'sketch') {
      extractSketchLines(data, width, height)
    } else {
    const total = width * height
    const visited = new Uint8Array(total)
    const queue = new Int32Array(total)
    const isPaper = (index: number) => {
      const offset = index * 4
      const r = data[offset]
      const g = data[offset + 1]
      const b = data[offset + 2]
      return Math.min(r, g, b) >= threshold && Math.max(r, g, b) - Math.min(r, g, b) < 48
    }
    const flood = (seeds: number[]) => {
      let head = 0
      let tail = 0
      const component: number[] = []
      let left = width
      let top = height
      let right = -1
      let bottom = -1
      const enqueue = (index: number) => {
        if (visited[index] || !isPaper(index)) return
        visited[index] = 1
        queue[tail++] = index
      }
      for (const seed of seeds) enqueue(seed)
      while (head < tail) {
        const index = queue[head++]
        component.push(index)
        const x = index % width
        const y = Math.floor(index / width)
        left = Math.min(left, x)
        top = Math.min(top, y)
        right = Math.max(right, x)
        bottom = Math.max(bottom, y)
        if (x > 0) enqueue(index - 1)
        if (x < width - 1) enqueue(index + 1)
        if (y > 0) enqueue(index - width)
        if (y < height - 1) enqueue(index + width)
      }
      return { component, left, top, right, bottom }
    }
    const edgeSeeds: number[] = []
    for (let x = 0; x < width; x++) {
      edgeSeeds.push(x, (height - 1) * width + x)
    }
    for (let y = 0; y < height; y++) {
      edgeSeeds.push(y * width, y * width + width - 1)
    }
    const edgePaper = flood(edgeSeeds)
    let paper = edgePaper
    let cropToPaper = false
    // A photographed sheet may have a dark table or shadow around its edges.
    // In that case, find the largest bright region inside the image instead.
    if (edgePaper.component.length < total * 0.03) {
      let largest = edgePaper
      for (let index = 0; index < total; index++) {
        if (!visited[index] && isPaper(index)) {
          const candidate = flood([index])
          if (candidate.component.length > largest.component.length) largest = candidate
        }
      }
      if (largest.component.length >= total * 0.08 &&
        largest.right - largest.left >= width * 0.3 && largest.bottom - largest.top >= height * 0.3) {
        paper = largest
        cropToPaper = true
      }
    }

    const background = new Uint8Array(total)
    for (const index of paper.component) background[index] = 1
    const paperLeft = cropToPaper ? paper.left : 0
    const paperTop = cropToPaper ? paper.top : 0
    const paperRight = cropToPaper ? paper.right : width - 1
    const paperBottom = cropToPaper ? paper.bottom : height - 1

    let kept = 0
    for (let index = 0; index < total; index++) {
      const x = index % width
      const y = Math.floor(index / width)
      if (background[index] || x < paperLeft || x > paperRight || y < paperTop || y > paperBottom) {
        data[index * 4 + 3] = 0
      } else if (data[index * 4 + 3] > 0) {
        kept++
      }
    }
    if (kept < 80 || kept > total * 0.9 || paper.component.length < total * 0.03) {
      throw new Error('Could not find enough light paper. Lower Paper brightness, or retake the photo with the paper well lit.')
    }
    }
    // The two extraction modes both write alpha into the same pixel buffer.
    let minX = width
    let minY = height
    let maxX = -1
    let maxY = -1
    let visible = 0
    for (let index = 0; index < width * height; index++) {
      if (data[index * 4 + 3] < 24) continue
      const x = index % width
      const y = Math.floor(index / width)
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
      visible++
    }
    if (visible < 60) throw new Error('The drawing lines are too faint. Try a closer crop or the color mode.')
    context.putImageData(pixels, 0, 0)
    const padding = 8
    const cropX = Math.max(0, minX - padding)
    const cropY = Math.max(0, minY - padding)
    const cropWidth = Math.min(width - cropX, maxX - cropX + padding + 1)
    const cropHeight = Math.min(height - cropY, maxY - cropY + padding + 1)
    const output = document.createElement('canvas')
    const outputScale = Math.min(1, 384 / Math.max(cropWidth, cropHeight))
    output.width = Math.max(1, Math.round(cropWidth * outputScale))
    output.height = Math.max(1, Math.round(cropHeight * outputScale))
    const outputContext = output.getContext('2d')
    if (!outputContext) throw new Error('Your browser could not create the sprite.')
    outputContext.drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, output.width, output.height)
    return output.toDataURL('image/png')
  } finally {
    bitmap.close()
  }
}

/** Keep dark local strokes while discarding broad, slowly changing shadows. */
export function extractSketchLines(data: Uint8ClampedArray, width: number, height: number): void {
  const stride = width + 1
  const sums = new Float64Array((width + 1) * (height + 1))
  const luminance = new Float32Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x
      const offset = index * 4
      const value = data[offset] * 0.299 + data[offset + 1] * 0.587 + data[offset + 2] * 0.114
      luminance[index] = value
      sums[(y + 1) * stride + x + 1] = value + sums[y * stride + x + 1] + sums[(y + 1) * stride + x] - sums[y * stride + x]
    }
  }
  const radius = Math.max(8, Math.round(Math.min(width, height) * 0.035))
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - radius)
      const x1 = Math.min(width - 1, x + radius)
      const y0 = Math.max(0, y - radius)
      const y1 = Math.min(height - 1, y + radius)
      const total = sums[(y1 + 1) * stride + x1 + 1] - sums[y0 * stride + x1 + 1] - sums[(y1 + 1) * stride + x0] + sums[y0 * stride + x0]
      const mean = total / ((x1 - x0 + 1) * (y1 - y0 + 1))
      const contrast = mean - luminance[y * width + x]
      const alpha = Math.max(0, Math.min(255, Math.round((contrast - 10) * 8)))
      const offset = (y * width + x) * 4
      data[offset] = 43
      data[offset + 1] = 33
      data[offset + 2] = 25
      data[offset + 3] = alpha
    }
  }
}
