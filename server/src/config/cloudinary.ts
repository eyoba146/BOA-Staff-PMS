import { v2 as cloudinary } from 'cloudinary';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export async function uploadProfilePhoto(
  base64OrUrl: string,
  userId: string
): Promise<string> {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY) {
    logger.info('[CLOUDINARY DEV MODE] Cloudinary upload simulated (credentials not configured)', { userId });
    return base64OrUrl; // Fallback to storing raw data URL during local dev without Cloudinary
  }

  try {
    const res = await cloudinary.uploader.upload(base64OrUrl, {
      folder: 'boa_pms/avatars',
      public_id: `avatar_${userId}`,
      overwrite: true,
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' },
      ],
    });
    return res.secure_url;
  } catch (err) {
    logger.error('Cloudinary upload failed', { error: String(err) });
    throw new Error('Failed to upload image to media storage.');
  }
}

export { cloudinary };
