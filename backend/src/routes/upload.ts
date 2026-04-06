import { Router } from 'express';
import { createPresignedUploadUrl, isAllowedContentType } from '../lib/r2';

const router = Router();

/**
 * POST /api/upload/presign
 * R2への直接アップロード用の署名付きURLを発行する
 *
 * body: { contentType: string, folder: 'maps' | 'books' | 'circles' }
 * response: { uploadUrl, key, publicUrl }
 */
router.post('/presign', async (req, res) => {
  const { contentType, folder = 'misc' } = req.body as {
    contentType: string;
    folder?: string;
  };

  if (!contentType || !isAllowedContentType(contentType)) {
    res.status(400).json({ error: 'Invalid content type' });
    return;
  }

  const allowedFolders = ['maps', 'books', 'circles'];
  const safeFolder = allowedFolders.includes(folder) ? folder : 'misc';

  try {
    const result = await createPresignedUploadUrl(contentType, safeFolder);
    res.json(result);
  } catch (err) {
    console.error('Failed to create presigned URL:', err);
    res.status(500).json({ error: 'Failed to create upload URL' });
  }
});

export default router;
