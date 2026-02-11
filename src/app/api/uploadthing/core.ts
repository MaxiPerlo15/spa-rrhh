import { createUploadthing, type FileRouter} from 'uploadthing/next';
import { logger } from '@/lib/logger';

const f = createUploadthing();

export const ourFileRouter = {
    resumeUploader: f({ pdf: {
        maxFileSize: '4MB', maxFileCount: 1 }})
        .onUploadComplete(async({file}) => {
            logger.info('CV subido en UploadThing', { fileUrl: file.ufsUrl });
            return {url: file.ufsUrl};
        }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
