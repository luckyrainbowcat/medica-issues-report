import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export interface UploadResult {
  url: string;
  key: string;
  mime: string;
  size: number;
}

/**
 * Upload file buffer to Firebase Storage (or fallback to local storage)
 * Files will be stored permanently and won't be lost on deploy
 */
export async function uploadBuffer(
  buffer: Buffer,
  mimeType: string,
  originalName?: string
): Promise<UploadResult> {
  // Check if Firebase Service Account Key is available
  const hasFirebaseCredentials = !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (hasFirebaseCredentials) {
    // Use Firebase Storage
    try {
      const { getAdminStorage } = await import('./firebase-admin');
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
      console.error('Firebase Storage upload error, falling back to local storage:', error.message);
      // Fall through to local storage fallback
    }
  }

  // Fallback to local file storage (for local development)
  try {
    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (error: any) {
      if (error.code !== 'EEXIST') {
        throw new Error(`Failed to create uploads directory: ${error.message}`);
      }
    }

    // Generate unique filename
    const ext = originalName?.split('.').pop()?.toLowerCase() || 
                (mimeType.includes('png') ? 'png' : 
                 mimeType.includes('gif') ? 'gif' : 
                 mimeType.includes('webp') ? 'webp' : 'jpg');
    const filename = `${uuidv4()}.${ext}`;
    const filepath = join(uploadsDir, filename);

    // Write file to disk
    await writeFile(filepath, buffer);

    // Return public URL (Next.js serves files from public folder)
    const publicUrl = `/uploads/${filename}`;

    if (!hasFirebaseCredentials) {
      console.warn('⚠️ Firebase credentials not found. Using local file storage. Files will be lost on deploy. See FIREBASE_STORAGE_SETUP.md for setup instructions.');
    }

    return {
      url: publicUrl,
      key: filename,
      mime: mimeType,
      size: buffer.length,
    };
  } catch (error: any) {
    console.error('Local storage upload error:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
}

