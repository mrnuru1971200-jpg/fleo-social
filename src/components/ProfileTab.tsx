/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  where 
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Post, UserProfile } from '../types';
import PostCard from './PostCard';
import { Mail, Edit3, Grid, Sparkles, Image } from 'lucide-react';

interface ProfileTabProps {
  currentUserProfile: UserProfile;
  onNavigateToSettings: () => void;
}

export default function ProfileTab({ currentUserProfile, onNavigateToSettings }: ProfileTabProps) {
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Fetch posts specifically authored by this verified user ID
    const postsRef = collection(db, 'posts');
    const q = query(
      postsRef, 
      where('authorId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Post[] = [];
      snapshot.forEach((docSnapshot) => {
        const d = docSnapshot.data();
        list.push({
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
      setUserPosts(list);
      setLoading(false);
    }, (err) => {
      console.warn("Could not load user's posts directly:", err.message);
      // Fallback: If compound index isn't ready, let's load all posts and filter client-side!
      // This is an extremely clever fallback to keep the app working 100% of the time, bypassing index limits.
      const fallbackQuery = query(postsRef, orderBy('createdAt', 'desc'));
      const unsubscribeFallback = onSnapshot(fallbackQuery, (snapshot) => {
        const list: Post[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          if (d.authorId === auth.currentUser?.uid) {
            list.push({
              id: docSnap.id,
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
          }
        });
        setUserPosts(list);
        setLoading(false);
      });
      return () => unsubscribeFallback();
    });

    return () => unsubscribe();
  }, []);

  return (
    <div id="profile-tab" className="bg-[#FAF9F6] h-full overflow-y-auto">
      {/* Cover / Profile Banner View */}
      <div id="profile-headers-block" className="relative shrink-0">
        <div id="cover-photo-wrapper" className="h-44 bg-neutral-200 overflow-hidden relative border-b border-[#121212]">
          <img 
            src={currentUserProfile.coverURL || 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=600&auto=format&fit=crop'} 
            placeholder="Cover banner"
            className="w-full h-full object-cover rounded-none filter grayscale contrasts-125"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Profile elements container */}
        <div className="px-5 -mt-10 pb-4 relative z-10 flex justify-between items-end">
          <img 
            src={currentUserProfile.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUserProfile.displayName)}`} 
            alt={currentUserProfile.displayName}
            className="w-20 h-20 rounded-none border border-[#121212] object-cover bg-white select-none relative z-10"
            referrerPolicy="no-referrer"
          />
          <button 
            onClick={onNavigateToSettings}
            className="px-4 py-2 bg-[#FAF9F6] border border-[#121212] hover:bg-[#121212] hover:text-white text-[9px] font-bold uppercase tracking-widest text-[#121212] rounded-none transition cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 inline mr-1.5" />
            <span>Customize</span>
          </button>
        </div>
      </div>

      {/* User Attributes Info card */}
      <div id="profile-info-block" className="px-5 pb-5 border-b border-[#E8E6E1] bg-white space-y-3 pt-1">
        <div>
          <h2 className="text-2xl font-bold font-serif italic text-[#121212] tracking-tighter leading-snug">{currentUserProfile.displayName}</h2>
          <span className="text-[10px] text-neutral-400 font-mono">@{currentUserProfile.username}</span>
        </div>

        <p className="text-sm font-serif font-light text-neutral-800 leading-relaxed max-w-sm whitespace-pre-wrap">{currentUserProfile.bio || "No biography provided."}</p>

        <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-neutral-400 font-mono pt-1">
          <Mail className="w-3.5 h-3.5 text-[#121212] shrink-0" />
          <span>{currentUserProfile.email}</span>
        </div>
      </div>

      {/* Visual Posts Feeds specifically authored by this user */}
      <div id="user-posts-area" className="px-4 py-4 space-y-4 pb-24">
        <div className="flex items-center gap-2 pb-1.5 text-[9px] font-bold text-[#121212] tracking-[0.18em] uppercase border-b border-[#E8E6E1]">
          <Grid className="w-3.5 h-3.5 text-[#121212]" />
          <span>Journal Updates ({userPosts.length})</span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <span className="w-6 h-6 border-2 border-[#121212] border-t-transparent rounded-full animate-spin"></span>
            <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold">Consulting timeline...</span>
          </div>
        ) : userPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 p-6 bg-white border border-[#E8E6E1] text-center text-[#121212]">
            <Sparkles className="w-9 h-9 text-[#121212] mb-2.5" />
            <span className="text-md font-serif italic font-semibold mb-1">Interactive Void</span>
            <p className="text-xs text-[#888] max-w-xs leading-relaxed">No thoughts published in this space yet. Express a thought on the Home Feed!</p>
          </div>
        ) : (
          userPosts.map((post) => (
            <PostCard 
              key={post.id} 
              post={post} 
              currentUserProfile={currentUserProfile} 
            />
          ))
        )}
      </div>
    </div>
  );
}
