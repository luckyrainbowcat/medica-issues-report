import * as Minio from 'minio';

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

const BUCKET_NAME = process.env.MINIO_BUCKET || 'issue-uploads';

export async function ensureBucket(): Promise<void> {
  try {
    const exists = await minioClient.bucketExists(BUCKET_NAME);
    if (!exists) {
      await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
      // Set bucket policy to public read
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`],
          },
        ],
      };
      try {
        await minioClient.setBucketPolicy(BUCKET_NAME, JSON.stringify(policy));
      } catch (policyError) {
        // Policy setting might fail, but bucket creation is more important
        console.warn('Failed to set bucket policy:', policyError);
      }
    }
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED' || error.message?.includes('connect')) {
      throw new Error(`Cannot connect to MinIO server at ${process.env.MINIO_ENDPOINT || 'localhost'}:${process.env.MINIO_PORT || '9000'}. Please ensure MinIO is running.`);
    }
    throw error;
  }
}

export { minioClient, BUCKET_NAME };

