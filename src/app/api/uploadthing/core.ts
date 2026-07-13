import { z } from 'zod'
import { createUploadthing, type FileRouter } from 'uploadthing/next'
import { logger } from '@/lib/logger'
import {
  RESUME_MAX_FILE_COUNT,
  RESUME_MAX_FILE_SIZE_MB
} from '@/lib/uploadPolicy'
import {
  guardPublicRequest,
  isPublicRequestGuardError,
  toUploadThingGuardError
} from '@/lib/publicRequestGuard'

const f = createUploadthing()
const uploadInputSchema = z.object({
  captchaToken: z.string().trim().optional()
})

export const ourFileRouter = {
  resumeUploader: f({
    pdf: {
      maxFileSize: `${RESUME_MAX_FILE_SIZE_MB}MB`,
      maxFileCount: RESUME_MAX_FILE_COUNT
    }
    })
    .input(uploadInputSchema)
    .middleware(async ({ req, input }) => {
      try {
        const { clientIp } = await guardPublicRequest({
          headers: req.headers,
          captchaToken: input.captchaToken,
          captchaAction: 'application_form',
          rateLimitKey: 'resume-upload',
          maxRequests: 8,
          rateLimitLog: {
            kind: 'security',
            message: 'upload.resume.rate_limited'
          },
          captchaLog: {
            kind: 'security',
            message: 'upload.resume.captcha_rejected'
          }
        })
        return { clientIp }
      } catch (error) {
        if (!isPublicRequestGuardError(error)) throw error
        throw toUploadThingGuardError(error)
      }
    })
    .onUploadComplete(async ({ file, metadata }) => {
      logger.info('CV subido en UploadThing', {
        fileKey: file.key,
        fileSize: file.size,
        fileType: file.type,
        ip: metadata.clientIp
      })
      return { url: file.ufsUrl }
    }),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter
