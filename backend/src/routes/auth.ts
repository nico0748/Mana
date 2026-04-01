import { Router } from 'express';
import admin from 'firebase-admin';

// Firebase Admin is already initialized in middleware/auth.ts
// This router is registered BEFORE the authenticate middleware

const router = Router();

const LINE_TOKEN_URL = 'https://api.line.me/oauth2/v2.1/token';
const LINE_VERIFY_URL = 'https://api.line.me/oauth2/v2.1/verify';

router.get('/line/callback', async (req, res) => {
  const { code, error } = req.query as Record<string, string>;

  const frontendOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173';

  if (error || !code) {
    res.redirect(`${frontendOrigin}/line-callback?error=access_denied`);
    return;
  }

  const channelId = process.env.LINE_CHANNEL_ID;
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  const callbackUrl = process.env.LINE_CALLBACK_URL;

  if (!channelId || !channelSecret || !callbackUrl) {
    console.error('LINE env vars not configured');
    res.redirect(`${frontendOrigin}/line-callback?error=config_error`);
    return;
  }

  try {
    // 1. Exchange authorization code for tokens
    const tokenRes = await fetch(LINE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: callbackUrl,
        client_id: channelId,
        client_secret: channelSecret,
      }),
    });

    if (!tokenRes.ok) {
      throw new Error(`LINE token exchange failed: ${tokenRes.status}`);
    }

    const tokenData = await tokenRes.json() as { access_token: string; id_token?: string };

    // 2. Verify ID token and get LINE user ID
    const verifyRes = await fetch(`${LINE_VERIFY_URL}?id_token=${encodeURIComponent(tokenData.id_token ?? '')}&client_id=${encodeURIComponent(channelId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        id_token: tokenData.id_token ?? '',
        client_id: channelId,
      }),
    });

    if (!verifyRes.ok) {
      throw new Error(`LINE ID token verification failed: ${verifyRes.status}`);
    }

    const profile = await verifyRes.json() as { sub: string; name?: string; picture?: string };
    const lineUid = `line:${profile.sub}`;

    // 3. Create Firebase custom token
    const customToken = await admin.auth().createCustomToken(lineUid, {
      provider: 'line',
      displayName: profile.name ?? '',
      photoURL: profile.picture ?? '',
    });

    // 4. Redirect to frontend with custom token
    res.redirect(`${frontendOrigin}/line-callback?token=${encodeURIComponent(customToken)}`);
  } catch (err) {
    console.error('LINE callback error:', err);
    res.redirect(`${frontendOrigin}/line-callback?error=internal_error`);
  }
});

export default router;
