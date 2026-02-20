Mana Library Implementation Plan
Goal Description
Develop a personal book management web application "Mana Library" using React, TypeScript, Vite, and Firebase. The app will allow a single user (the owner) to manage their book collection, including commercial books and doujinshi.

User Review Required
IMPORTANT

Firebase Project Configuration: The user needs to provide Firebase configuration keys (API Key, Auth Domain, Project ID, etc.) to connect the app to their Firebase project.

Proposed Changes
Directory Structure
src/
  assets/
  components/
    ui/           # Reusable UI components (Button, Input, Card, etc.)
    layout/       # Layout components (Header, Sidebar, ProtectedRoute)
    books/        # Book-related components (BookList, BookForm, BookItem)
  context/        # React Context (AuthContext)
  hooks/          # Custom hooks (useAuth, useBooks, etc.)
  lib/            # Library configurations (firebase.ts, utils.ts)
  pages/          # Page components (Login, Home, AddBook, EditBook, Settings)
  types/          # TypeScript type definitions
  App.tsx
  main.tsx
Firestore Data Design
Collection: users

uid (string): User ID
email (string): Email
createdAt (timestamp)
Collection: books

uid (string): Owner User ID (Foreign Key to users)
title (string): Book title
author (string): Author or Circle name
isbn (string, optional): ISBN
type (string): 'commercial' | 'doujin'
category (string): Category name
status (string): 'owned' | 'lending' | 'wishlist'
memo (string): Memos
createdAt (timestamp)
Authentication
Use Firebase Authentication (Email/Password).
Implement AuthContext to manage user state globally.
ProtectedRoute component to redirect unauthenticated users to /login.
Security Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /books/{bookId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.uid;
      allow create: if request.auth != null && request.resource.data.uid == request.auth.uid;
    }
  }
}
Note: The rule request.auth.uid == resource.data.uid ensures users can only access their own books.

Verification Plan
Automated Tests
None planned for MVP (as per request).
Manual Verification
Auth:
Try accessing / without login -> Redirect to /login.
Login with valid credentials -> Redirect to /.
Logout -> Redirect to /login.
Books:
Add a book (Commercial & Doujin).
View book list.
Edit a book.
Delete a book.
Verify data in Firestore Console (if possible) or via UI persistence.