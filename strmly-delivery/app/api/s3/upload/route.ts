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

    // Validate file type - accept both images and videos
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const validVideoTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm', 'video/x-msvideo'];
    const validTypes = [...validImageTypes, ...validVideoTypes];
    
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images (JPEG, PNG, WEBP, GIF) and videos (MP4, MOV, WEBM, AVI) are allowed' },
        { status: 400 }
      );
    }

    // Validate file size - 2MB for images, 10MB for videos
    const isVideo = validVideoTypes.includes(file.type);
    const maxSize = isVideo ? 10 * 1024 * 1024 : 2 * 1024 * 1024; // 10MB for videos, 2MB for images
    
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File size must be less than ${isVideo ? '10MB' : '2MB'}` },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const mimeType = file.type; 

    // Upload to S3
    const imageUrl = await uploadFileToS3(buffer, file.name, mimeType);

    console.log('File uploaded to S3:', imageUrl);

    return NextResponse.json({
      success: true,
      url: imageUrl,
      message: `${isVideo ? 'Video' : 'Image'} uploaded successfully`
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
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}

// Optional: Add GET method to check if upload endpoint is working
export async function GET() {
  return NextResponse.json({
    message: 'S3 Upload endpoint is active',
    methods: ['POST'],
    maxFileSize: {
      images: '2MB',
      videos: '10MB'
    },
    allowedTypes: {
      images: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      videos: ['video/mp4', 'video/mov', 'video/webm', 'video/avi']
    }
  });
}