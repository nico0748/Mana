import React from 'react';
import { useZxing } from 'react-zxing';
import { Button } from '../ui/Button';

interface BarcodeScannerProps {
  onResult: (result: string) => void;
  onCancel: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onResult, onCancel }) => {
  const { ref } = useZxing({
    onDecodeResult(result) {
      onResult(result.getText());
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
      <div className="bg-white rounded-lg p-4 w-full max-w-md relative">
        <h3 className="text-lg font-bold mb-4 text-center">Scan ISBN Barcode</h3>
        <div className="relative aspect-video bg-black rounded overflow-hidden mb-4">
          <video ref={ref} className="w-full h-full object-cover" />
        </div>
        <div className="flex justify-center">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};
