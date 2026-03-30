/**
 * Generate placeholder PWA icons.
 * Creates blue (#2563eb) rounded squares with white "Y" letter.
 *
 * Usage: node scripts/generate-icons.mjs
 *
 * Uses sharp if available, otherwise falls back to writing raw SVG
 * and converting via resvg-js or similar.
 */

import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'public', 'icons')
mkdirSync(outDir, { recursive: true })

function createSvg(size) {
  const fontSize = Math.round(size * 0.55)
  const radius = Math.round(size * 0.15)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#2563eb"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
        font-family="system-ui, -apple-system, sans-serif" font-weight="700"
        font-size="${fontSize}" fill="white">Y</text>
</svg>`
}

// Try sharp first, fall back to SVG files
async function main() {
  let sharp
  try {
    sharp = (await import('sharp')).default
  } catch {
    // sharp not available — write SVG files and provide instructions
  }

  for (const size of [192, 512]) {
    const svg = createSvg(size)
    const pngPath = join(outDir, `icon-${size}x${size}.png`)
    const svgPath = join(outDir, `icon-${size}x${size}.svg`)

    if (sharp) {
      await sharp(Buffer.from(svg)).png().toFile(pngPath)
      console.log(`Created ${pngPath}`)
    } else {
      writeFileSync(svgPath, svg)
      console.log(`Created ${svgPath} (sharp not available — convert to PNG manually or install sharp)`)
    }
  }
}

main().catch(console.error)
