/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  collection, 
  setDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { Post, UserProfile } from '../types';
import PostCard from './PostCard';
import { Image, Link2, Plus, Sparkles, X, Share } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FeedTabProps {
  currentUserProfile: UserProfile;
}

export default function FeedTab({ currentUserProfile }: FeedTabProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Create Post fields
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ready-to-use Unsplash preset wallpapers/images that align with Fleo Social aesthetics
  const PRESET_IMAGES = [
    { name: 'Tokyo Neon', url: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=700&auto=format&fit=crop' },
    { name: 'Calm Waves', url: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?q=80&w=700&auto=format&fit=crop' },
    { name: 'Sleek Setup', url: 'https://images.unsplash.com/photo-1618477388954-7852f32655ec?q=80&w=700&auto=format&fit=crop' },
    { name: 'Minimal Architecture', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=700&auto=format&fit=crop' }
  ];

  useEffect(() => {
    // Read the posts in real-time
    const postsRef = collection(db, 'posts');
    const q = query(postsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsList: Post[] = [];
      snapshot.forEach((docSnapshot) => {
        const d = docSnapshot.data();
        postsList.push({
          id: docSnapshot.id,
          authorId: d.authorId || '',
          authorName: d.authorName || 'Anonymous',
          authorPhotoURL: d.authorPhotoURL || '',
          authorUsername: d.authorUsername || 'anon',
          content: d.content || '',
          mediaUrl: d.mediaUrl,
          linkUrl: d.linkUrl,
          likesCount: d.likesCount || 0,
          commentsCount: d.commentsCount || 0,
          sharesCount: d.sharesCount || 0,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt
        });
      });
      setPosts(postsList);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'posts');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !auth.currentUser) return;

    setSubmitting(true);
    setError(null);

    const postId = `post_${Date.now()}_${auth.currentUser.uid}`;
    const postDocRef = doc(db, 'posts', postId);

    try {
      const newPostData = {
        id: postId,
        authorId: auth.currentUser.uid,
        authorName: currentUserProfile.displayName,
        authorPhotoURL: currentUserProfile.photoURL,
        authorUsername: currentUserProfile.username,
        content: content.trim(),
        mediaUrl: mediaUrl.trim() || null,
        linkUrl: linkUrl.trim() || null,
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(postDocRef, newPostData);

      // Reset Form fields
      setContent('');
      setMediaUrl('');
      setLinkUrl('');
      setShowCreateModal(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Could not verify post permission.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="feed-tab-container" className="flex flex-col h-full bg-[#FAF9F6] overflow-y-auto">
      {/* "What's on your mind" inline card */}
      <div id="quick-create-post-card" className="bg-[#FAF9F6] border-b border-[#E8E6E1] p-5 shrink-0">
        <div className="flex gap-3.5 items-center">
          <img 
            src={currentUserProfile.photoURL} 
            alt={currentUserProfile.displayName}
            className="w-9 h-9 rounded-none border border-[#121212] object-cover shrink-0" 
          />
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex-1 bg-white hover:bg-[#121212] hover:text-white transition-all text-left py-3 px-5 text-xs font-bold uppercase tracking-widest text-[#121212] border border-[#121212] flex items-center cursor-pointer rounded-none"
          >
            Express Thought, {currentUserProfile.displayName.split(' ')[0]}
          </button>
        </div>
      </div>

      {/* Posts List Scrolling container */}
      <div id="feed-posts-scroll-viewport" className="flex-1 px-4 py-4 space-y-4 pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <span className="w-8 h-8 border-2 border-[#121212] border-t-transparent rounded-full animate-spin"></span>
            <span className="text-[10px] text-[#888] uppercase tracking-widest font-bold">Curating your modern copy...</span>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-[#121212] border border-[#E8E6E1] bg-white p-6">
            <Sparkles className="w-8 h-8 text-[#121212] mb-3" />
            <span className="text-lg font-serif italic font-bold text-[#121212] mb-1">Welcome to fleo social.</span>
            <p className="text-xs text-[#888] max-w-xs leading-relaxed mb-4">Be the first to share an elegant update or inspire other minds with pristine type.</p>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-[#121212] text-white hover:bg-transparent hover:text-black border border-[#121212] font-semibold text-xs rounded-none uppercase tracking-widest transition-all cursor-pointer"
            >
              Share First Entry
            </button>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard 
              key={post.id} 
              post={post} 
              currentUserProfile={currentUserProfile} 
            />
          ))
        )}
      </div>

      {/* Overlay modal for Creating New Posts */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div 
            id="create-post-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#121212]/30 flex items-end justify-center z-50 p-0 sm:p-4 backdrop-blur-xs"
          >
            <motion.div 
              id="create-post-dialog"
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-[#FAF9F6] rounded-none w-full max-w-md p-6 space-y-4 border border-[#121212] flex flex-col max-h-[85vh] sm:max-h-none"
            >
              <div className="flex justify-between items-center pb-3 border-b border-[#E8E6E1]">
                <div className="flex items-center gap-1">
                  <h3 className="font-bold text-[#121212] text-xl font-serif italic mb-0.5">Publish Entry</h3>
                </div>
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 border border-[#121212] hover:bg-[#121212] hover:text-white rounded-none transition text-[#121212] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {error && (
                <div className="p-3 border border-[#121212] text-red-600 font-mono text-xs">
                  {error}
                </div>
              )}

              <form onSubmit={handleCreatePost} className="space-y-4 flex-1 flex flex-col">
                <div className="flex items-center gap-3">
                  <img 
                    src={currentUserProfile.photoURL} 
                    alt={currentUserProfile.displayName}
                    className="w-9 h-9 rounded-none border border-[#121212] object-cover shrink-0" 
                  />
                  <div>
                    <h5 className="text-xs font-bold text-[#121212] uppercase tracking-widest">{currentUserProfile.displayName}</h5>
                    <span className="text-[10px] text-neutral-400 font-mono">@{currentUserProfile.username}</span>
                  </div>
                </div>

                <textarea 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Share what is on your mind... (supports up to 5000 characters)"
                  className="w-full min-h-[140px] resize-none border border-[#E8E6E1] bg-white p-3 text-sm focus:border-[#121212] text-[#121212] placeholder-[#888] focus:outline-none rounded-none font-serif font-light"
                  maxLength={5000}
                  required
                />

                {/* Media Image input fields */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#888]">
                    <Image className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Attach Illustration URL</span>
                  </div>
                  <input 
                    type="url"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full text-xs px-3 py-2.5 border border-[#121212] bg-white rounded-none focus:outline-none transition font-mono"
                  />

                  {/* Preset images select carousel */}
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase tracking-widest text-[#888] block">Quick preset photos:</span>
                    <div className="flex gap-1.5 overflow-x-auto pb-1 resize-y-none scrollbar-none">
                      {PRESET_IMAGES.map((img) => (
                        <button 
                          key={img.name}
                          type="button"
                          onClick={() => setMediaUrl(img.url)}
                          className="shrink-0 text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 border border-[#E8E6E1] rounded-none bg-white hover:border-[#121212] text-[#121212] transition cursor-pointer"
                        >
                          {img.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* External URL links */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#888]">
                    <Link2 className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Embed External URL Link</span>
                  </div>
                  <input 
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://example.com/interesting-read"
                    className="w-full text-xs px-3 py-2.5 border border-[#121212] bg-white rounded-none focus:outline-none transition font-mono"
                  />
                </div>

                <div className="pt-2">
                  <button 
                    type="submit"
                    disabled={submitting || !content.trim()}
                    className="w-full py-3.5 bg-[#121212] text-white hover:bg-transparent hover:text-black border border-[#121212] font-semibold text-xs tracking-widest uppercase rounded-none transition-all cursor-pointer flex justify-center items-center gap-2"
                  >
                    {submitting ? (
                      <span className="w-5 h-5 border-2 border-white/45 border-t-[#121212] rounded-full animate-spin"></span>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Publish Entry</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
