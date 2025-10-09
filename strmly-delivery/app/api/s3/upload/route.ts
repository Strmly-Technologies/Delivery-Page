// app/api/s3/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { uploadFileToS3 } from '../../../../lib/s3Client'
import { verifyAuth } from "@/lib/serverAuth";

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const decodedToken = await verifyAuth(request);
    if (decodedToken.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }

    // Get the form data
    const formData = await request.formData();
    const file = formData.get('image') as File;
    console.log('Received file:', file);

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WEBP are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (2MB max)
    const maxSize = 2 * 1024 * 1024; // 2MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 2MB' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const mineType = file.type; 

    // Upload to S3
    const imageUrl = await uploadFileToS3(buffer, file.name,mineType);

    console.log('File uploaded to S3:', imageUrl);

    return NextResponse.json({
      success: true,
      url: imageUrl,
      message: 'Image uploaded successfully'
    }, { status: 200 });

  } catch (error: any) {
    console.error('S3 upload error:', error);
    
    // Handle specific S3 errors
    if (error.message?.includes('credentials')) {
      return NextResponse.json(
        { error: 'S3 configuration error. Please check AWS credentials.' },
        { status: 500 }
      );
    }
    
    if (error.message?.includes('bucket')) {
      return NextResponse.json(
        { error: 'S3 bucket not found. Please check bucket configuration.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to upload image' },
      { status: 500 }
    );
  }
}

// Optional: Add GET method to check if upload endpoint is working
export async function GET() {
  return NextResponse.json({
    message: 'S3 Upload endpoint is active',
    methods: ['POST'],
    maxFileSize: '2MB',
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
  });
}