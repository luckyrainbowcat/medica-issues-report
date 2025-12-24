import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export interface UploadResult {
  url: string;
  key: string;
  mime: string;
  size: number;
}

export async function uploadBuffer(
  buffer: Buffer,
  mimeType: string,
  originalName?: string
): Promise<UploadResult> {
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

  return {
    url: publicUrl,
    key: filename,
    mime: mimeType,
    size: buffer.length,
  };
}

