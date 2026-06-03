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
  updateDoc, 
  doc, 
  writeBatch 
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { Notification } from '../types';
import { Bell, Heart, MessageSquare, Check, Trash2, MailOpen, Activity } from 'lucide-react';

export default function NotificationsTab() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Read user notifications: /users/{userId}/notifications/{notificationId}
    const notifRef = collection(db, 'users', auth.currentUser.uid, 'notifications');
    const q = query(notifRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Notification[] = [];
      snapshot.forEach((snap) => {
        const d = snap.data();
        list.push({
          id: snap.id,
          type: d.type,
          senderId: d.senderId,
          senderName: d.senderName || 'A social friend',
          senderPhotoURL: d.senderPhotoURL || '',
          postId: d.postId,
          postContent: d.postContent || '',
          read: d.read || false,
          createdAt: d.createdAt
        });
      });
      setNotifications(list);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `users/${auth.currentUser?.uid}/notifications`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleMarkAsRead = async (notifId: string) => {
    if (!auth.currentUser) return;
    const notifDocRef = doc(db, 'users', auth.currentUser.uid, 'notifications', notifId);
    try {
      await updateDoc(notifDocRef, { read: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser.uid}/notifications/${notifId}`);
    }
  };

  const handleMarkAllRead = async () => {
    if (!auth.currentUser) return;
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;

    const batch = writeBatch(db);
    unread.forEach((n) => {
      const notifDocRef = doc(db, 'users', auth.currentUser!.uid, 'notifications', n.id);
      batch.update(notifDocRef, { read: true });
    });

    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${auth.currentUser.uid}/notifications`);
    }
  };

  // Format notification content sentence
  const getNotificationTxt = (n: Notification) => {
    switch (n.type) {
      case 'like':
        return `liked your update "${n.postContent}"`;
      case 'comment':
        return `commented on your update "${n.postContent}"`;
      case 'share':
        return `distributed your post "${n.postContent}"`;
      default:
        return `interacted with you on fleo social`;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div id="notifications-tab" className="flex flex-col h-full bg-[#FAF9F6] overflow-y-auto">
      {/* Header bar */}
      <div id="notif-header" className="bg-[#FAF9F6] border-b border-[#121212] p-5 shrink-0 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-[#121212] text-xl font-serif italic leading-none">Notifications</h2>
          <p className="text-[10px] uppercase tracking-widest text-[#888] font-bold mt-1.5">Inbox indicators of your social vibe</p>
        </div>
        {unreadCount > 0 && (
          <button 
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 px-3 py-2 bg-transparent border border-[#121212] rounded-none text-[9px] font-bold uppercase tracking-widest text-[#121212] hover:bg-[#121212] hover:text-white transition cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Clear alerts</span>
          </button>
        )}
      </div>

      {/* Notifications list viewport */}
      <div id="notif-scroll-view" className="flex-1 px-4 py-4 space-y-2.5 pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <span className="w-8 h-8 border-2 border-[#121212] border-t-transparent rounded-full animate-spin"></span>
            <span className="text-[10px] text-[#888] uppercase tracking-widest font-bold">Reading alerts...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center text-[#121212] border border-[#E8E6E1] bg-white p-6">
            <Bell className="w-8 h-8 text-[#121212] mb-3" />
            <span className="text-md font-serif italic font-bold">Clear Horizon.</span>
            <p className="text-xs text-[#888] max-w-xs leading-relaxed mt-1">No new alerts. Keep checking back or inspire more threads to stay active.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div 
              id={`notif-${n.id}`}
              key={n.id}
              onClick={() => !n.read && handleMarkAsRead(n.id)}
              className={`p-4 border flex gap-3.5 items-start transition cursor-pointer rounded-none shadow-none ${
                n.read 
                  ? 'bg-white border-[#E8E6E1] opacity-75 hover:opacity-100' 
                  : 'bg-white border-[#121212] relative font-medium'
              }`}
            >
              <div className="relative shrink-0">
                <img 
                  src={n.senderPhotoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(n.senderName)}`} 
                  alt={n.senderName}
                  className="w-10 h-10 rounded-none object-cover border border-[#121212]"
                />
                <div className={`absolute -bottom-1 -right-1 p-1 rounded-none text-white shrink-0 ${
                  n.type === 'like' ? 'bg-black' : 'bg-black'
                }`}>
                  {n.type === 'like' ? (
                    <Heart className="w-2.5 h-2.5 fill-current text-white" />
                  ) : (
                    <MessageSquare className="w-2.5 h-2.5 fill-current text-white" />
                  )}
                </div>
              </div>

              <div className="flex-1 min-w-0 pr-4 space-y-1">
                <p className="text-xs text-[#121212] leading-normal font-sans">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-[#121212] mr-1">{n.senderName}</span>{' '}
                  <span className="font-serif italic font-light">{getNotificationTxt(n)}</span>
                </p>
                <span className="text-[9px] text-[#888] font-mono tracking-wider font-semibold uppercase block">
                  {n.createdAt ? new Date(n.createdAt.seconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'now'}
                </span>
              </div>

              {!n.read && (
                <div className="w-2.5 h-2.5 bg-black rounded-none shrink-0 self-center" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
