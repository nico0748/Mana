import { useState, useEffect } from "react";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { type Book } from "../types";

export type SortField = 'createdAt' | 'title' | 'author';
export type SortDirection = 'asc' | 'desc';

export const useBooks = (sortField: SortField = 'createdAt', sortDirection: SortDirection = 'desc') => {
  const { currentUser } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setBooks([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "books"),
      where("uid", "==", currentUser.uid),
      orderBy(sortField, sortDirection)
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const booksData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Book[];
        setBooks(booksData);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching books:", err);
        setError("Failed to fetch books. If sorting by Title or Author, you may need to create a new index in Firebase Console.");
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [currentUser, sortField, sortDirection]);

  const addBook = async (bookData: Omit<Book, "id" | "uid" | "createdAt">) => {
    if (!currentUser) throw new Error("User not authenticated");
    
    try {
      await addDoc(collection(db, "books"), {
        ...bookData,
        uid: currentUser.uid,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Error adding book:", err);
      throw err;
    }
  };

  const updateBook = async (id: string, bookData: Partial<Omit<Book, "id" | "uid" | "createdAt">>) => {
    if (!currentUser) throw new Error("User not authenticated");

    try {
      const bookRef = doc(db, "books", id);
      await updateDoc(bookRef, bookData);
    } catch (err) {
      console.error("Error updating book:", err);
      throw err;
    }
  };

  const deleteBook = async (id: string) => {
    if (!currentUser) throw new Error("User not authenticated");

    try {
      await deleteDoc(doc(db, "books", id));
    } catch (err) {
      console.error("Error deleting book:", err);
      throw err;
    }
  };

  const uploadImage = async (file: File) => {
    if (!currentUser) throw new Error("User not authenticated");
    
    try {
      const storageRef = ref(storage, `covers/${currentUser.uid}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (err) {
      console.error("Error uploading image:", err);
      throw err;
    }
  };

  return { books, loading, error, addBook, updateBook, deleteBook, uploadImage };
};
