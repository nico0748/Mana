import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { booksApi } from '../lib/api';
import { type Book } from '../types';

export type SortField = 'createdAt' | 'title' | 'author' | 'ndcCode';
export type SortDirection = 'asc' | 'desc';

export const useBooks = (sortField: SortField = 'createdAt', sortDirection: SortDirection = 'desc') => {
  const queryClient = useQueryClient();

  const { data: rawBooks = [], isLoading: loading, error: queryError } = useQuery({
    queryKey: ['books'],
    queryFn: booksApi.list,
  });

  const books = useMemo(() => {
    return [...rawBooks].sort((a, b) => {
      if (sortField === 'ndcCode') {
        const aCode = a.ndcCode ?? '';
        const bCode = b.ndcCode ?? '';
        if (!aCode && !bCode) return 0;
        if (!aCode) return 1;
        if (!bCode) return -1;
        const aNum = parseFloat(aCode);
        const bNum = parseFloat(bCode);
        const cmp = isNaN(aNum) || isNaN(bNum) ? aCode.localeCompare(bCode) : aNum - bNum;
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      let aVal: string | number = a[sortField] as string | number;
      let bVal: string | number = b[sortField] as string | number;
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [rawBooks, sortField, sortDirection]);

  const error = queryError ? (queryError as Error).message : null;

  const addMutation = useMutation({
    mutationFn: booksApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['books'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Omit<Book, 'id' | 'createdAt'>> }) =>
      booksApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['books'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: booksApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['books'] }),
  });

  const addBook = (data: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>) =>
    addMutation.mutateAsync(data);

  const updateBook = (id: string, data: Partial<Omit<Book, 'id' | 'createdAt'>>) =>
    updateMutation.mutateAsync({ id, data });

  const deleteBook = (id: string) => deleteMutation.mutateAsync(id);

  const uploadImage = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });

  return { books, loading, error, addBook, updateBook, deleteBook, uploadImage };
};
