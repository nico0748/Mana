import { auth } from './firebase';

/**
 * R2への直接アップロード
 * 1. バックエンドから署名付きURLを取得
 * 2. そのURLにファイルを直接PUT（バックエンドを経由しない）
 * 3. R2の公開URLを返す
 */
export async function uploadToR2(
  file: File,
  folder: 'maps' | 'books' | 'circles',
): Promise<string> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Not authenticated');

  // 署名付きURL取得
  const presignRes = await fetch('/api/upload/presign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ contentType: file.type, folder }),
  });

  if (!presignRes.ok) {
    throw new Error('Failed to get upload URL');
  }

  const { uploadUrl, publicUrl } = await presignRes.json() as {
    uploadUrl: string;
    key: string;
    publicUrl: string;
  };

  // R2に直接PUT
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error('Failed to upload to R2');
  }

  return publicUrl;
}

/**
 * DataURL(base64)をBlobに変換してR2にアップロードする
 * PDF→Canvas→DataURL のフローで生成された画像に使用
 */
export async function uploadDataUrlToR2(
  dataUrl: string,
  folder: 'maps' | 'books' | 'circles',
): Promise<string> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const file = new File([blob], 'image.png', { type: blob.type || 'image/png' });
  return uploadToR2(file, folder);
}
