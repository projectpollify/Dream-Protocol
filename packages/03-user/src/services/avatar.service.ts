/**
 * Module 03: User - Avatar Service
 *
 * Handles avatar upload, processing, and storage
 */

import sharp from 'sharp';
import { ProfileAvatar, UploadAvatarDTO, AvatarUrls, IdentityMode } from '../types/user.types';
import * as db from '../utils/database';

// ============================================================================
// CONFIGURATION
// ============================================================================

const AVATAR_SIZES = {
  thumbnail: 150,
  medium: 400,
  large: 1000,
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// ============================================================================
// UPLOAD AVATAR
// ============================================================================

/**
 * Upload and process avatar image
 */
export async function uploadAvatar(data: UploadAvatarDTO): Promise<AvatarUrls> {
  const { user_id, identity_mode, file } = data;

  // Validate file
  validateFile(file);

  // Process image into multiple sizes
  const processedImages = await processImage(file.buffer);

  // Upload to storage (placeholder - would use S3/Cloudflare R2/etc.)
  const urls = await uploadToStorage(user_id, identity_mode, processedImages);

  // Mark existing avatars as not current
  await db.query(
    `UPDATE profile_avatars
     SET is_current = false
     WHERE user_id = $1 AND identity_mode = $2`,
    [user_id, identity_mode]
  );

  // Save avatar record
  await db.insertOne<ProfileAvatar>('profile_avatars', {
    user_id,
    identity_mode,
    original_url: urls.original,
    thumbnail_url: urls.thumbnail,
    medium_url: urls.medium,
    large_url: urls.large,
    file_size_bytes: file.size,
    mime_type: file.mimetype,
    width: processedImages.metadata.width,
    height: processedImages.metadata.height,
    is_current: true,
  });

  // Update profile avatar_url
  await db.updateOne(
    'user_profiles',
    { user_id, identity_mode },
    { avatar_url: urls.medium }
  );

  return urls;
}

/**
 * Validate uploaded file
 */
function validateFile(file: Express.Multer.File): void {
  if (!file) {
    throw new Error('No file provided');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
  }

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new Error(`Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`);
  }
}

// ============================================================================
// IMAGE PROCESSING
// ============================================================================

/**
 * Process image into multiple sizes
 */
async function processImage(buffer: Buffer): Promise<{
  original: Buffer;
  thumbnail: Buffer;
  medium: Buffer;
  large: Buffer;
  metadata: { width: number; height: number };
}> {
  // Get original metadata
  const image = sharp(buffer);
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('Invalid image metadata');
  }

  // Create different sizes
  const [original, thumbnail, medium, large] = await Promise.all([
    // Original (optimized)
    sharp(buffer)
      .jpeg({ quality: 90, progressive: true })
      .toBuffer(),

    // Thumbnail (150x150)
    sharp(buffer)
      .resize(AVATAR_SIZES.thumbnail, AVATAR_SIZES.thumbnail, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 85 })
      .toBuffer(),

    // Medium (400x400)
    sharp(buffer)
      .resize(AVATAR_SIZES.medium, AVATAR_SIZES.medium, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 90 })
      .toBuffer(),

    // Large (1000x1000)
    sharp(buffer)
      .resize(AVATAR_SIZES.large, AVATAR_SIZES.large, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 90 })
      .toBuffer(),
  ]);

  return {
    original,
    thumbnail,
    medium,
    large,
    metadata: {
      width: metadata.width,
      height: metadata.height,
    },
  };
}

// ============================================================================
// STORAGE (Placeholder Implementation)
// ============================================================================

/**
 * Upload processed images to storage
 *
 * NOTE: This is a placeholder implementation.
 * In production, you would upload to:
 * - AWS S3
 * - Cloudflare R2
 * - Google Cloud Storage
 * - Azure Blob Storage
 *
 * For now, we'll simulate storage with local file paths
 */
async function uploadToStorage(
  user_id: string,
  identity_mode: IdentityMode,
  images: {
    original: Buffer;
    thumbnail: Buffer;
    medium: Buffer;
    large: Buffer;
  }
): Promise<AvatarUrls> {
  // Generate unique filename
  const timestamp = Date.now();
  const baseFilename = `${user_id}_${identity_mode}_${timestamp}`;

  // Simulate storage URLs (in production, use actual CDN URLs)
  const baseUrl = process.env.CDN_BASE_URL || 'https://cdn.dreamprotocol.com/avatars';

  const urls: AvatarUrls = {
    original: `${baseUrl}/${baseFilename}_original.jpg`,
    thumbnail: `${baseUrl}/${baseFilename}_thumbnail.jpg`,
    medium: `${baseUrl}/${baseFilename}_medium.jpg`,
    large: `${baseUrl}/${baseFilename}_large.jpg`,
  };

  // TODO: Actual upload implementation
  /*
  // Example S3 upload:
  const s3 = new AWS.S3();

  await Promise.all([
    s3.putObject({
      Bucket: process.env.S3_BUCKET!,
      Key: `avatars/${baseFilename}_original.jpg`,
      Body: images.original,
      ContentType: 'image/jpeg',
      ACL: 'public-read',
    }).promise(),

    s3.putObject({
      Bucket: process.env.S3_BUCKET!,
      Key: `avatars/${baseFilename}_thumbnail.jpg`,
      Body: images.thumbnail,
      ContentType: 'image/jpeg',
      ACL: 'public-read',
    }).promise(),

    // ... repeat for medium and large
  ]);
  */

  return urls;
}

// ============================================================================
// GET AVATAR
// ============================================================================

/**
 * Get current avatar for user and identity mode
 */
export async function getCurrentAvatar(
  user_id: string,
  identity_mode: IdentityMode
): Promise<AvatarUrls | null> {
  const avatar = await db.findOne<ProfileAvatar>('profile_avatars', {
    user_id,
    identity_mode,
    is_current: true,
  });

  if (!avatar) {
    return null;
  }

  return {
    original: avatar.original_url,
    thumbnail: avatar.thumbnail_url || avatar.original_url,
    medium: avatar.medium_url || avatar.original_url,
    large: avatar.large_url || avatar.original_url,
  };
}

/**
 * Get avatar history for user
 */
export async function getAvatarHistory(
  user_id: string,
  identity_mode: IdentityMode,
  limit: number = 10
): Promise<ProfileAvatar[]> {
  const avatars = await db.findMany<ProfileAvatar>(
    'profile_avatars',
    { user_id, identity_mode },
    {
      orderBy: 'uploaded_at DESC',
      limit,
    }
  );

  return avatars;
}

// ============================================================================
// DELETE AVATAR
// ============================================================================

/**
 * Delete avatar (mark as not current)
 */
export async function deleteAvatar(
  user_id: string,
  identity_mode: IdentityMode,
  avatar_id: string
): Promise<boolean> {
  // Mark avatar as not current
  const updated = await db.updateOne<ProfileAvatar>(
    'profile_avatars',
    { id: avatar_id, user_id, identity_mode },
    { is_current: false }
  );

  if (!updated) {
    return false;
  }

  // Clear avatar_url from profile
  await db.updateOne('user_profiles', { user_id, identity_mode }, { avatar_url: null });

  // TODO: Delete from storage (S3, etc.)

  return true;
}

/**
 * Restore previous avatar
 */
export async function restorePreviousAvatar(
  user_id: string,
  identity_mode: IdentityMode,
  avatar_id: string
): Promise<AvatarUrls> {
  // Mark all avatars as not current
  await db.query(
    `UPDATE profile_avatars
     SET is_current = false
     WHERE user_id = $1 AND identity_mode = $2`,
    [user_id, identity_mode]
  );

  // Mark selected avatar as current
  const avatar = await db.updateOne<ProfileAvatar>(
    'profile_avatars',
    { id: avatar_id, user_id, identity_mode },
    { is_current: true }
  );

  if (!avatar) {
    throw new Error('Avatar not found');
  }

  // Update profile avatar_url
  await db.updateOne(
    'user_profiles',
    { user_id, identity_mode },
    { avatar_url: avatar.medium_url }
  );

  return {
    original: avatar.original_url,
    thumbnail: avatar.thumbnail_url || avatar.original_url,
    medium: avatar.medium_url || avatar.original_url,
    large: avatar.large_url || avatar.original_url,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate default avatar URL (for users without custom avatars)
 */
export function getDefaultAvatarUrl(user_id: string, identity_mode: IdentityMode): string {
  // Use a service like DiceBear or UI Avatars to generate default avatars
  const baseUrl = 'https://api.dicebear.com/7.x';

  if (identity_mode === IdentityMode.SHADOW) {
    // Shadow identities get anonymous-looking avatars
    return `${baseUrl}/bottts/svg?seed=${user_id}`;
  } else {
    // True Self identities get more personalized avatars
    return `${baseUrl}/avataaars/svg?seed=${user_id}`;
  }
}

/**
 * Get avatar stats (total size, count)
 */
export async function getAvatarStats(user_id: string): Promise<{
  total_avatars: number;
  total_size_bytes: number;
}> {
  const result = await db.query<{
    count: string;
    total_size: string;
  }>(
    `SELECT COUNT(*) as count, SUM(file_size_bytes) as total_size
     FROM profile_avatars
     WHERE user_id = $1`,
    [user_id]
  );

  const row = result.rows[0];

  return {
    total_avatars: parseInt(row.count) || 0,
    total_size_bytes: parseInt(row.total_size) || 0,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  uploadAvatar,
  getCurrentAvatar,
  getAvatarHistory,
  deleteAvatar,
  restorePreviousAvatar,
  getDefaultAvatarUrl,
  getAvatarStats,
};
