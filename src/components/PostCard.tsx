/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  doc, 
  collection, 
  addDoc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  getDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp, 
  increment 
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { Post, Comment, UserProfile } from '../types';
import { Heart, MessageSquare, Share2, MoreHorizontal, Send, Trash2, Link as LinkIcon, BadgeHelp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PostCardProps {
  key?: string;
  post: Post;
  currentUserProfile: UserProfile;
}

export default function PostCard({ post, currentUserProfile }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);

  // Sync likes state
  useEffect(() => {
    if (!auth.currentUser) return;
    const pathLike = `posts/${post.id}/likes/${auth.currentUser.uid}`;
    const likeDocRef = doc(db, 'posts', post.id, 'likes', auth.currentUser.uid);
    
    const unsubscribe = onSnapshot(likeDocRef, (snap) => {
      setIsLiked(snap.exists());
    }, (err) => {
      // If we failed to read specifically because subcollection hasn't loaded, handle gracefully
      console.warn("Likes check failed:", err.message);
    });

    return () => unsubscribe();
  }, [post.id]);

  // Sync post reactions (likes and commentary) counters in real-time
  useEffect(() => {
    const postRef = doc(db, 'posts', post.id);
    const unsubscribe = onSnapshot(postRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setLikesCount(data.likesCount ?? 0);
        setCommentsCount(data.commentsCount ?? 0);
      }
    });
    return () => unsubscribe();
  }, [post.id]);

  // Read Comments in real-time when visible
  useEffect(() => {
    if (!showComments) return;

    const commentsRef = collection(db, 'posts', post.id, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Comment[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          id: docSnap.id,
          postId: d.postId,
          authorId: d.authorId,
          authorName: d.authorName,
          authorPhotoURL: d.authorPhotoURL || '',
          authorUsername: d.authorUsername || '',
          content: d.content,
          createdAt: d.createdAt
        });
      });
      setComments(list);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `posts/${post.id}/comments`);
    });

    return () => unsubscribe();
  }, [post.id, showComments]);

  const handleLikeToggle = async () => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const likeDocRef = doc(db, 'posts', post.id, 'likes', userId);
    const postDocRef = doc(db, 'posts', post.id);

    try {
      if (isLiked) {
        // Toggle Unlike
        await deleteDoc(likeDocRef);
        await updateDoc(postDocRef, {
          likesCount: increment(-1),
          updatedAt: serverTimestamp()
        });
      } else {
        // Toggle Like
        await setDoc(likeDocRef, {
          userId,
          createdAt: serverTimestamp()
        });
        await updateDoc(postDocRef, {
          likesCount: increment(1),
          updatedAt: serverTimestamp()
        });

        // Trigger Notification to Post Owner (only if post is not by current user)
        if (post.authorId !== userId) {
          const notificationId = `like_${post.id}_${userId}`;
          const notifRef = doc(db, 'users', post.authorId, 'notifications', notificationId);
          await setDoc(notifRef, {
            id: notificationId,
            type: 'like',
            senderId: userId,
            senderName: currentUserProfile.displayName,
            senderPhotoURL: currentUserProfile.photoURL,
            postId: post.id,
            postContent: post.content.slice(0, 50),
            read: false,
            createdAt: serverTimestamp()
          });
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `posts/${post.id}`);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !auth.currentUser) return;

    setSubmittingComment(true);
    const userId = auth.currentUser.uid;
    const commentId = `comment_${Date.now()}_${userId}`;
    const commentDocRef = doc(db, 'posts', post.id, 'comments', commentId);
    const postDocRef = doc(db, 'posts', post.id);

    try {
      // Add comment document
      await setDoc(commentDocRef, {
        id: commentId,
        postId: post.id,
        authorId: userId,
        authorName: currentUserProfile.displayName,
        authorPhotoURL: currentUserProfile.photoURL,
        authorUsername: currentUserProfile.username,
        content: newComment.trim(),
        createdAt: serverTimestamp()
      });

      // Increment Comment Counter on Post
      await updateDoc(postDocRef, {
        commentsCount: increment(1),
        updatedAt: serverTimestamp()
      });

      // Trigger Notification to Post Owner (only if post is not by current user)
      if (post.authorId !== userId) {
        const notificationId = `comment_${commentId}`;
        const notifRef = doc(db, 'users', post.authorId, 'notifications', notificationId);
        await setDoc(notifRef, {
          id: notificationId,
          type: 'comment',
          senderId: userId,
          senderName: currentUserProfile.displayName,
          senderPhotoURL: currentUserProfile.photoURL,
          postId: post.id,
          postContent: post.content.slice(0, 50),
          read: false,
          createdAt: serverTimestamp()
        });
      }

      setNewComment('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `posts/${post.id}/comments/${commentId}`);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeletePost = async () => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      try {
        await deleteDoc(doc(db, 'posts', post.id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `posts/${post.id}`);
      }
    }
  };

  const handleShareClick = async () => {
    setSharing(true);
    const postDocRef = doc(db, 'posts', post.id);
    try {
      await updateDoc(postDocRef, {
        sharesCount: increment(1),
        updatedAt: serverTimestamp()
      });
      navigator.clipboard.writeText(`${window.location.origin}/posts/${post.id}`);
      setTimeout(() => setSharing(false), 2000);
    } catch (err) {
      console.error(err);
      setSharing(false);
    }
  };

  // Humanize Timestamp
  const formatTime = (ts: any) => {
    if (!ts) return 'just now';
    const date = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'yesterday';
    return `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  };

  const isPostOwner = auth.currentUser?.uid === post.authorId;

  return (
    <div id={`post-${post.id}`} className="bg-white border border-[#E8E6E1] p-5 mb-4 transition-all">
      {/* Post Header */}
      <div id="post-header" className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <img 
            src={post.authorPhotoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(post.authorName)}`} 
            alt={post.authorName}
            referrerPolicy="no-referrer"
            className="w-9 h-9 rounded-none border border-[#121212] object-cover shrink-0"
          />
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#121212] leading-snug">{post.authorName}</h4>
            <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-[#888]">
              <span className="font-mono text-neutral-400">@{post.authorUsername}</span>
              <span>•</span>
              <span>{formatTime(post.createdAt)}</span>
            </div>
          </div>
        </div>
        
        {isPostOwner && (
          <button 
            onClick={handleDeletePost}
            className="text-[#888] hover:text-black hover:bg-neutral-50 p-1.5 rounded-none transition cursor-pointer"
            title="Delete Post"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Post Content */}
      <div id="post-body" className="space-y-4 mb-4">
        <p className="text-md text-[#121212] font-serif leading-relaxed whitespace-pre-wrap font-light">{post.content}</p>
        
        {post.mediaUrl && (
          <div className="rounded-none overflow-hidden border border-[#E8E6E1] max-h-80 bg-[#FAF9F6] flex items-center justify-center">
            <img 
              src={post.mediaUrl} 
              alt="Post content visualization" 
              className="w-full object-cover max-h-80 rounded-none"
              referrerPolicy="no-referrer"
              onError={(e) => {
                // If image fails, replace with a clean elegant UI banner
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=600&auto=format&fit=crop';
              }}
            />
          </div>
        )}

        {post.linkUrl && (
          <a 
            href={post.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 border border-[#121212] bg-[#FAF9F6] rounded-none text-xs text-[#121212] hover:bg-[#121212] hover:text-white transition-all"
          >
            <LinkIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate font-mono font-medium">{post.linkUrl}</span>
          </a>
        )}
      </div>

      {/* Stats row */}
      <div id="stats-row" className="flex items-center justify-between text-[9px] uppercase tracking-widest text-[#888] pb-3 border-b border-[#E8E6E1] font-bold">
        <span className="flex items-center gap-1">
          <Heart className="w-3 h-3 fill-current text-neutral-400" /> 
          {likesCount} Likes
        </span>
        <div className="flex gap-4">
          <span>{commentsCount} comments</span>
          <span>{post.sharesCount ?? 0} shares</span>
        </div>
      </div>

      {/* Post Actions Tab Bar */}
      <div id="post-interactions" className="flex items-center justify-between pt-2.5 mt-1 text-xs">
        <button 
          onClick={handleLikeToggle}
          className={`flex items-center gap-1.5 py-1 uppercase tracking-widest font-bold text-[10px] transition-all border-b border-transparent hover:border-[#121212] cursor-pointer ${
            isLiked ? 'text-black' : 'text-[#888] hover:text-black'
          }`}
        >
          <Heart className={`w-3.5 h-3.5 transition ${isLiked ? 'fill-black text-black' : ''}`} />
          <span>{isLiked ? 'Liked' : 'Like'}</span>
        </button>

        <button 
          onClick={() => setShowComments(!showComments)}
          className={`flex items-center gap-1.5 py-1 uppercase tracking-widest font-bold text-[10px] transition-all border-b border-transparent hover:border-[#121212] cursor-pointer ${
            showComments ? 'text-black' : 'text-[#888] hover:text-black'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Comment</span>
        </button>

        <button 
          onClick={handleShareClick}
          className="flex items-center gap-1.5 py-1 uppercase tracking-widest font-bold text-[10px] text-[#888] hover:text-black transition-all border-b border-transparent hover:border-black cursor-pointer"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>{sharing ? 'Copied Link!' : 'Share'}</span>
        </button>
      </div>

      {/* Comment Section Panel */}
      <AnimatePresence>
        {showComments && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div id="comments-container" className="pt-4 mt-3 border-t border-[#E8E6E1] space-y-4">
              {/* Write Comment Form */}
              <form id="comment-form" onSubmit={handleAddComment} className="flex gap-2">
                <img 
                  src={currentUserProfile.photoURL} 
                  alt={currentUserProfile.displayName}
                  className="w-7 h-7 rounded-none border border-[#E8E6E1] object-cover shrink-0"
                />
                <div className="flex-1 flex gap-1.5 border border-[#121212] rounded-none bg-[#FAF9F6] px-3 py-1.5 focus-within:ring-0 transition items-center">
                  <input 
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write an entry response..."
                    className="flex-1 text-xs bg-transparent focus:outline-none text-[#121212] placeholder-[#888] font-sans"
                    disabled={submittingComment}
                  />
                  <button 
                    type="submit"
                    disabled={!newComment.trim() || submittingComment}
                    className="text-[#888] hover:text-black disabled:text-neutral-300 transition cursor-pointer p-0.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>

              {/* Comments Feed List */}
              <div id="comments-list" className="space-y-4 max-h-60 overflow-y-auto pr-1">
                {comments.length === 0 ? (
                  <p className="text-center text-[10px] uppercase tracking-wider font-bold text-[#888] py-2">No response nodes yet.</p>
                ) : (
                  comments.map((comment) => (
                    <div id={`comment-${comment.id}`} key={comment.id} className="flex gap-2.5 text-xs border-b border-[#E8E6E1]/60 pb-3">
                      <img 
                        src={comment.authorPhotoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(comment.authorName)}`} 
                        alt={comment.authorName}
                        className="w-7 h-7 rounded-none border border-[#E8E6E1] object-cover shrink-0 mt-0.5"
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[10px] uppercase tracking-wider text-[#121212]">{comment.authorName}</span>
                          <span className="text-[9px] uppercase tracking-widest text-[#888] font-mono font-medium">{formatTime(comment.createdAt)}</span>
                        </div>
                        <p className="text-[#333] font-serif font-light text-sm leading-relaxed">{comment.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
