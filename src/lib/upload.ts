import { v4 as uuidv4 } from 'uuid';
import { getAdminStorage } from './firebase-admin';

export interface UploadResult {
  url: string;
  key: string;
  mime: string;
  size: number;
}

/**
 * Upload file buffer to Firebase Storage
 * Files will be stored permanently and won't be lost on deploy
 */
export async function uploadBuffer(
  buffer: Buffer,
  mimeType: string,
  originalName?: string
): Promise<UploadResult> {
  try {
    // Get Firebase Storage instance
    const storage = getAdminStorage();
    const bucket = storage.bucket();

    // Generate unique filename
    const ext = originalName?.split('.').pop()?.toLowerCase() || 
                (mimeType.includes('png') ? 'png' : 
                 mimeType.includes('gif') ? 'gif' : 
                 mimeType.includes('webp') ? 'webp' : 'jpg');
    const filename = `uploads/${uuidv4()}.${ext}`;

    // Create file reference
    const file = bucket.file(filename);

    // Upload buffer to Firebase Storage
    await file.save(buffer, {
      metadata: {
        contentType: mimeType,
        metadata: {
          originalName: originalName || 'uploaded-file',
          uploadedAt: new Date().toISOString(),
        },
      },
      public: true, // Make file publicly accessible
    });

    // Get public URL
    // For Firebase Storage, use getSignedUrl or public URL
    let publicUrl: string;
    try {
      // Try to get public URL (if bucket has public access)
      publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;
      
      // Verify URL is accessible by making it public
      await file.makePublic();
    } catch (error: any) {
      // If public URL doesn't work, generate signed URL (valid for 1 year)
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: '03-09-2025', // 1 year from now (adjust as needed)
      });
      publicUrl = signedUrl;
    }

    return {
      url: publicUrl,
      key: filename,
      mime: mimeType,
      size: buffer.length,
    };
  } catch (error: any) {
    console.error('Firebase Storage upload error:', error);
    throw new Error(`Failed to upload file to Firebase Storage: ${error.message}`);
  }
}

