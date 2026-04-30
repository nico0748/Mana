import React from 'react';
import { motion } from 'framer-motion';
import { BookForm } from '../books/BookForm';
import { booksApi, circleItemsApi } from '../../lib/api';
import { useUpgradeModal, isPlanLimitError } from '../../contexts/UpgradeModalContext';
import type { Book, Circle, CircleItem } from '../../types';

interface Props {
  item: CircleItem;
  circle: Circle;
  existingBooks?: Book[];
  onClose: () => void;
  onAdded: (itemId: string, bookId: string) => void;
}

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

export const AddToLibraryFromItemModal: React.FC<Props> = ({
  item, circle, existingBooks = [], onClose, onAdded,
}) => {
  const { open: openUpgrade } = useUpgradeModal();

  const initialData: Partial<Book> = {
    title:      item.title,
    author:     circle.author || circle.name,
    type:       'doujin',
    status:     'owned',
    price:      item.price,
    coverUrl:   item.coverUrl,
    circleName: circle.name,
  };

  const handleSubmit = async (data: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const created = await booksApi.create(data);
      await circleItemsApi.update(item.id, { addedToLibraryBookId: created.id });
      onAdded(item.id, created.id);
    } catch (err) {
      if (isPlanLimitError(err)) {
        openUpgrade({ resource: 'books', limit: err.payload?.limit ?? null, current: err.payload?.current });
        return;
      }
      throw err;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto z-10"
      >
        <div className="px-1 pb-2">
          <h2 className="text-lg font-bold text-zinc-100">蔵書に追加</h2>
          <p className="text-xs text-zinc-500">
            必要に応じて詳細を編集してから蔵書登録できます
          </p>
        </div>
        <BookForm
          initialData={initialData}
          existingBooks={existingBooks}
          onSubmit={handleSubmit}
          onCancel={onClose}
          onUploadImage={fileToDataUrl}
        />
      </motion.div>
    </div>
  );
};
