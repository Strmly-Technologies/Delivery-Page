import { S3Client, PutObjectCommand, ObjectCannedACL } from '@aws-sdk/client-s3';

// Create an S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export async function uploadFileToS3(file: Buffer, fileName: string, mimeType: string): Promise<string> {
  // Determine folder based on file type
  const isVideo = mimeType.startsWith('video/');
  const folder = isVideo ? 'videos' : 'products';
  
  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME || '',
    Key: `${folder}/${Date.now()}-${fileName}`,
    Body: file,
    ContentType: mimeType,
  };

  await s3Client.send(new PutObjectCommand(params));

  return `https://${params.Bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${params.Key}`;
}


export default s3Client;
