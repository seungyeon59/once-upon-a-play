import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extractSketchLines, scanDrawing } from './scanDrawing.ts'

test('sketch mode keeps pencil lines and removes a broad shadow', () => {
  const width = 64
  const height = 64
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4
      const value = x < 32 ? 180 : x === 42 ? 40 : 235
      data[offset] = data[offset + 1] = data[offset + 2] = value
      data[offset + 3] = 255
    }
  }
  extractSketchLines(data, width, height)
  assert.equal(data[(20 * width + 12) * 4 + 3], 0, 'uniform shadow is transparent')
  assert.ok(data[(20 * width + 42) * 4 + 3] > 200, 'dark line remains visible')
})

test('finds white paper even when a dark table surrounds it', async () => {
  const width = 40
  const height = 40
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4
      const isPaper = x >= 2 && x < 38 && y >= 2 && y < 38
      const isDrawing = x >= 13 && x < 27 && y >= 13 && y < 27
      data[offset] = data[offset + 1] = data[offset + 2] = isPaper && !isDrawing ? 245 : 35
      data[offset + 3] = 255
    }
  }
  const source = {
    width,
    height,
    getContext: () => ({
      drawImage: () => {},
      getImageData: () => ({ data }),
      putImageData: () => {},
    }),
  }
  const output = {
    width: 0,
    height: 0,
    getContext: () => ({ drawImage: () => {} }),
    toDataURL: () => 'data:image/png;base64,test',
  }
  const oldDocument = globalThis.document
  const oldCreateImageBitmap = globalThis.createImageBitmap
  let canvases = 0
  Object.assign(globalThis, {
    document: { createElement: () => canvases++ === 0 ? source : output },
    createImageBitmap: async () => ({ width, height, close: () => {} }),
  })
  try {
    const result = await scanDrawing(new File(['image'], 'drawing.png', { type: 'image/png' }), 210)
    assert.match(result, /^data:image\/png/)
    assert.equal(data[(5 * width + 5) * 4 + 3], 0, 'paper is transparent')
    assert.equal(data[(20 * width + 20) * 4 + 3], 255, 'drawing remains opaque')
    assert.equal(data[(0 * width + 0) * 4 + 3], 0, 'table outside paper is removed')
  } finally {
    Object.assign(globalThis, { document: oldDocument, createImageBitmap: oldCreateImageBitmap })
  }
})
