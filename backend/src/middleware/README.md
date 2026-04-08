# backend/src/middleware/

Express ミドルウェアを格納するディレクトリ。

## ファイル

### `auth.ts`

Firebase Authentication の ID トークンを検証する認証ミドルウェア。

**処理フロー:**

```
リクエストヘッダー: Authorization: Bearer <Firebase ID Token>
  → admin.auth().verifyIdToken(token)
  → 検証成功: req.uid = decoded.uid → next()
  → トークンなし: 401 Unauthorized
  → 検証失敗: 401 Invalid token
```

**Firebase Admin SDK の初期化:**
- `FIREBASE_SERVICE_ACCOUNT_B64` 環境変数（Base64 エンコードされたサービスアカウント JSON）が設定されている場合はデコードして使用
- 未設定の場合は `GOOGLE_APPLICATION_CREDENTIALS` 環境変数に従う（ADC: Application Default Credentials）

**使用箇所:** `backend/src/index.ts`（`app.use('/api', authenticate)`）

**注意:** このミドルウェアは `/api/*` 全ルートに適用される。フロントエンドは `lib/firebase.ts` で `auth.currentUser.getIdToken()` を呼び出し、リクエストヘッダーに付与する。
