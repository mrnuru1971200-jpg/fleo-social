/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserProfile {
  uid: string;
  email: string;
  username: string;
  displayName: string;
  bio: string;
  photoURL: string;
  coverURL: string;
  createdAt: any; // Timestamp
  updatedAt: any; // Timestamp
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorPhotoURL: string;
  authorUsername: string;
  content: string;
  mediaUrl?: string;
  linkUrl?: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  createdAt: any; // Timestamp
  updatedAt: any; // Timestamp
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorPhotoURL: string;
  authorUsername: string;
  content: string;
  createdAt: any; // Timestamp
}

export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'share';
  senderId: string;
  senderName: string;
  senderPhotoURL: string;
  postId?: string;
  postContent?: string;
  read: boolean;
  createdAt: any; // Timestamp
}
