export interface UploadResult {
  url: string;
  key: string;
  mime: string;
  size: number;
}

/**
 * Upload file buffer to ImgBB API (free image hosting)
 * Files will be stored permanently on ImgBB servers
 */
export async function uploadBuffer(
  buffer: Buffer,
  mimeType: string,
  originalName?: string
): Promise<UploadResult> {
  // Check if ImgBB API Key is available
  const imgbbApiKey = process.env.IMGBB_API_KEY;

  // Debug logging
  console.log('[uploadBuffer] Checking IMGBB_API_KEY...');
  console.log('[uploadBuffer] IMGBB_API_KEY exists:', !!imgbbApiKey);
  console.log('[uploadBuffer] IMGBB_API_KEY length:', imgbbApiKey?.length || 0);
  console.log('[uploadBuffer] All env vars with IMGBB:', Object.keys(process.env).filter(k => k.includes('IMGBB')));

  if (!imgbbApiKey) {
    console.error('[uploadBuffer] IMGBB_API_KEY is not set in process.env');
    throw new Error('IMGBB_API_KEY is not set. Please set IMGBB_API_KEY in .env.local and restart the server.');
  }

  try {
    // Convert buffer to base64 for ImgBB API
    const base64Image = buffer.toString('base64');

    // Create URL-encoded form data for ImgBB API
    const formData = new URLSearchParams();
    formData.append('key', imgbbApiKey);
    formData.append('image', base64Image);

    // Upload to ImgBB API
    const response = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData?.error?.message || `ImgBB API error: ${response.status} ${response.statusText}`;
      throw new Error(errorMessage);
    }

    const result = await response.json();

    if (!result.success || !result.data || !result.data.url) {
      throw new Error('ImgBB API did not return image URL');
    }

    // ImgBB returns the URL directly
    const publicUrl = result.data.url;
    const imageKey = result.data.id || result.data.url.split('/').pop() || 'unknown';

    return {
      url: publicUrl, // Full URL from ImgBB (e.g., https://i.ibb.co/xxxxx/image.jpg)
      key: imageKey,
      mime: mimeType,
      size: buffer.length,
    };
  } catch (error: any) {
    console.error('ImgBB upload error:', error);
    throw new Error(`Failed to upload file to ImgBB: ${error.message}`);
  }
}

