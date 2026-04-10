/**
 * Image Upload Routes
 *
 * POST /api/uploads/image — upload an image file (event banners, etc.)
 * GET  /api/uploads/:filename — serve uploaded files via static file registration
 *
 * Registered in server.ts with @fastify/static for file serving.
 */
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import fs from 'fs'
import path from 'path'
import { createId } from '@paralleldrive/cuid2'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { config } from '../config/index.js'

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/avif',
])

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.avif'])

// Ensure uploads directory exists once at module load
const UPLOADS_DIR = config.uploadsDir || 'uploads'
fs.mkdirSync(UPLOADS_DIR, { recursive: true })

export const uploadsRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/uploads/image
  fastify.post('/api/uploads/image', { preHandler: [requireAuth, requireAdmin] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const file = await request.file({
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    })

    if (!file) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'No file provided',
          details: [],
        },
      })
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Unsupported image type. Allowed: JPEG, PNG, WebP, GIF, SVG, AVIF',
          details: [],
        },
      })
    }

    // Determine extension from original filename or fallback to mime
    const rawExt = file.filename ? path.extname(file.filename).toLowerCase() : ''
    const ext = rawExt || `.${file.mimetype.split('/')[1]}`
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Unsupported file extension',
          details: [],
        },
      })
    }

    const filename = `${createId()}${ext}`
    const filePath = path.join(UPLOADS_DIR, filename)

    // Pipe file to disk
    await new Promise<void>((resolve, reject) => {
      const stream = fs.createWriteStream(filePath)
      file.file.pipe(stream)
        .on('finish', () => resolve())
        .on('error', (err) => {
          // Clean up partial uploads on error
          fs.unlink(filePath, () => {})
          reject(err)
        })
    })

    const url = `/api/uploads/${filename}`

    fastify.log.info({ filename, mimetype: file.mimetype, uploadedBy: request.user?.sub }, 'Image uploaded')

    return reply.status(201).send({ url })
  })
}
