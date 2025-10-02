import { S3Client, PutObjectCommand, ObjectCannedACL } from '@aws-sdk/client-s3';

// Create an S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export async function uploadFileToS3(file: Buffer, fileName: string): Promise<string> {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME || '',
    Key: `products/${Date.now()}-${fileName}`,
    Body: file,
    ContentType: 'image/jpeg', // Adjust based on the file type
  };

  try {
    await s3Client.send(new PutObjectCommand(params));
    // Construct the URL to the uploaded file
    return `https://${params.Bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${params.Key}`;
  } catch (error) {
    console.error('Error uploading to S3:', error);
    throw new Error('Failed to upload file to S3');
  }
}

export default s3Client;
