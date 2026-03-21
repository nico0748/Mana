import React, { useState } from 'react';
import { useZxing } from 'react-zxing';
import { Button } from '../ui/Button';

interface BarcodeScannerProps {
  onResult: (result: string) => void;
  onCancel: () => void;
}

function getCameraErrorMessage(error: unknown): string {
  if (!window.isSecureContext) {
    return 'カメラ機能は HTTPS 接続でのみ利用できます。アドレスバーが https:// で始まっているか確認してください。';
  }
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') return 'カメラへのアクセスが拒否されました。ブラウザの設定でカメラの許可を確認してください。';
    if (error.name === 'NotFoundError') return 'カメラが見つかりません。端末にカメラが接続されているか確認してください。';
    if (error.name === 'NotReadableError') return 'カメラが他のアプリで使用中です。他のアプリを閉じてから再試行してください。';
  }
  return 'カメラを起動できませんでした。ページを再読み込みして再試行してください。';
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onResult, onCancel }) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(
    window.isSecureContext ? null : getCameraErrorMessage(null)
  );

  const { ref } = useZxing({
    onDecodeResult(result) {
      onResult(result.getText());
    },
    onError(error) {
      console.error('BarcodeScanner error:', error);
      setErrorMessage(getCameraErrorMessage(error));
    },
    constraints: {
      audio: false,
      video: { facingMode: 'environment' },
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
      <div className="bg-white rounded-lg p-4 w-full max-w-md relative">
        <h3 className="text-lg font-bold mb-4 text-center">Scan ISBN Barcode</h3>

        {errorMessage ? (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            <p className="font-semibold mb-1">カメラを起動できませんでした</p>
            <p>{errorMessage}</p>
          </div>
        ) : (
          <div className="relative aspect-video bg-black rounded overflow-hidden mb-4">
            <video ref={ref} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="flex justify-center">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};
