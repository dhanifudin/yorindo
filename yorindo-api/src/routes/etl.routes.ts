import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { queueService } from '../container.js'
import * as path from 'path'
import { randomUUID } from 'crypto'
import { validateOpenApiResponse } from '../lib/openapi-contract.js'
import { requireAuth, requireAdmin, type JwtPayload } from '../middleware/auth.js'
import { saveFile } from '../lib/storage.js'

export async function etlRoutes(fastify: FastifyInstance): Promise<void> {

  fastify.post('/api/etl/upload', {
    preHandler: [requireAuth, requireAdmin],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      // Get the uploaded file
      const data = await request.file()

      if (!data) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'No file uploaded',
            details: []
          }
        })
      }

      const extension = path.extname(data.filename).toLowerCase()
      if (extension !== '.xlsx' && extension !== '.csv') {
        return reply.status(400).send({
          error: {
            code: 'INVALID_FILE_TYPE',
            message: 'Only .xlsx and .csv files are supported',
            details: []
          }
        })
      }

      // Check for file size limits using fastify multipart's field
      if (data.file.truncated) {
        return reply.status(400).send({
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'File size exceeds 10MB limit',
            details: []
          }
        })
      }

      // Save the file to uploads
      const buffer = await data.toBuffer()
      const uniqueFilename = `${randomUUID()}${extension}`
      const targetPath = await saveFile(buffer, uniqueFilename)

      const eventIdRaw = (data.fields.eventId as any)?.value
      const uploadSourceRaw = (data.fields.uploadSource as any)?.value

      const eventId = typeof eventIdRaw === 'string' && eventIdRaw.trim() !== '' ? eventIdRaw : null
      const uploadSource = typeof uploadSourceRaw === 'string' && uploadSourceRaw.trim() !== '' ? uploadSourceRaw : 'etl_import'

      // Enqueue job to 'etl'
      const payload = request.user as JwtPayload
      const jobId = await queueService.enqueue('etl', {
        filePath: targetPath,
        originalFilename: data.filename,
        uploadedBy: payload.sub,
        eventId,
        uploadSource
      })

      const responseBody = {
        jobId,
        status: 'queued'
      }
      validateOpenApiResponse({ path: '/etl/upload', method: 'post', status: 202, body: responseBody })
      return reply.code(202).send(responseBody)
    }
  })

  fastify.get('/api/etl/jobs/:jobId', {
    preHandler: [requireAuth, requireAdmin],
    handler: async (request: FastifyRequest<{ Params: { jobId: string } }>, reply: FastifyReply) => {
      const { jobId } = request.params
      const jobInfo = await queueService.getStatus(jobId)

      if (!jobInfo || (jobInfo.status === 'failed' && !jobInfo.progress)) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Job not found', details: [] }
        })
      }

      validateOpenApiResponse({ path: '/etl/jobs/{jobId}', method: 'get', status: 200, body: jobInfo })
      return reply.status(200).send(jobInfo)
    }
  })
}
