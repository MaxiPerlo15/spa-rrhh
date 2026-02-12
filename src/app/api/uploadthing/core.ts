import { createUploadthing, type FileRouter} from 'uploadthing/next';
import { logger } from '@/lib/logger';
import {
  RESUME_MAX_FILE_COUNT,
  RESUME_MAX_FILE_SIZE_MB
} from '@/lib/uploadPolicy';

const f = createUploadthing();

export const ourFileRouter = {
    resumeUploader: f({ pdf: {
        maxFileSize: `${RESUME_MAX_FILE_SIZE_MB}MB`, maxFileCount: RESUME_MAX_FILE_COUNT }})
        .onUploadComplete(async({file}) => {
            logger.info('CV subido en UploadThing', {
                fileKey: file.key,
                fileSize: file.size,
                fileType: file.type
            });
            return {url: file.ufsUrl};
        }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
