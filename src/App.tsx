/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, getDoc, setDoc, serverTimestamp, collection, query, where } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { UserProfile } from './types';
import AuthScreen from './components/AuthScreen';
import FeedTab from './components/FeedTab';
import NotificationsTab from './components/NotificationsTab';
import ProfileTab from './components/ProfileTab';
import SettingsTab from './components/SettingsTab';
import { 
  Home, 
  Bell, 
  User, 
  Settings, 
  Flame, 
  Wifi, 
  Smartphone, 
  Clock,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'feed' | 'notifications' | 'profile' | 'settings'>('feed');
  const [unreadCount, setUnreadCount] = useState(0);

  // Connection validation at initial boot (mandated by firebase skill)
  useEffect(() => {
    async function testConnection() {
      try {
        const testRef = doc(db, 'test', 'connection');
        await getDoc(testRef);
      } catch (error: any) {
        if (error.message && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration: Client is offline.");
        }
      }
    }
    testConnection();
  }, []);

  // Listen for user authentication state changes
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Retrieve or sync their custom Firestore profile
        const userDocRef = doc(db, 'users', currentUser.uid);
        
        // Setup real-time profile listener
        const unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setProfile({
              uid: data.uid,
              email: data.email,
              username: data.username,
              displayName: data.displayName,
              bio: data.bio || 'Hello World!',
              photoURL: data.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.displayName)}`,
              coverURL: data.coverURL || 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=600&auto=format&fit=crop',
              createdAt: data.createdAt,
              updatedAt: data.updatedAt
            });
            setLoading(false);
          } else {
            // Document does not exist in Firestore! Under unusual situations (missing first creation), create a default user profile to maintain 100% availability
            const fallbackDisplayName = currentUser.displayName || 'Social Traveler';
            const generatedUsername = currentUser.email ? currentUser.email.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '') : `user_${currentUser.uid.slice(0, 5)}`;
            const defaultProfile = {
              uid: currentUser.uid,
              email: currentUser.email || '',
              username: generatedUsername.toLowerCase().slice(0, 20),
              displayName: fallbackDisplayName,
              bio: 'Active Social traveler using fleo social.',
              photoURL: currentUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fallbackDisplayName)}`,
              coverURL: 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=600&auto=format&fit=crop',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            };
            
            setDoc(userDocRef, defaultProfile).then(() => {
              setProfile(defaultProfile as any);
              setLoading(false);
            }).catch((err) => {
              handleFirestoreError(err, OperationType.CREATE, `users/${currentUser.uid}`);
              setLoading(false);
            });
          }
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}`);
          setLoading(false);
        });

        // Listen for unread notification badge count in real-time
        const notifCollectionRef = collection(db, 'users', currentUser.uid, 'notifications');
        const qUnread = query(notifCollectionRef, where('read', '==', false));
        const unsubscribeNotifications = onSnapshot(qUnread, (snapshot) => {
          setUnreadCount(snapshot.size);
        }, (err) => {
          console.warn("Could not read live notifications badge:", err.message);
        });

        return () => {
          unsubscribeProfile();
          unsubscribeNotifications();
        };
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handleProfileSynced = (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
  };

  const handleSuccessfulAuth = () => {
    // Redirect cleanly to Home feed
    setActiveTab('feed');
  };

  return (
    <div id="fleo-app-canvases" className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-0 sm:p-5 font-sans">
      {/* Outer Mobile Phone Bezel Frame mock to present this gorgeous social mobile app beautifully on desktop */}
      <div 
        id="phone-mockup-frame" 
        className="w-full h-full sm:w-[400px] sm:h-[840px] sm:max-h-[92vh] bg-[#FAF9F6] sm:rounded-none sm:shadow-none sm:border border-[#121212] overflow-hidden flex flex-col relative select-none"
      >
        {/* Dynamic Hardware Notch / Status line spacer */}
        <div id="phone-notch-header" className="hidden sm:flex bg-[#FAF9F6] text-[#121212] border-b border-[#E8E6E1] px-5 py-2 shrink-0 justify-between items-center text-[10px] font-medium font-mono tracking-wider z-20">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-[#121212]" />
            <span>02:16</span>
          </div>
          <div className="px-2 py-0.5 border border-[#121212] text-[8px] font-bold tracking-widest uppercase bg-[#121212] text-white">fleo.</div>
          <div className="flex items-center gap-2 text-[#121212]">
            <Wifi className="w-3.5 h-3.5" />
            <span>5G</span>
          </div>
        </div>

        {/* Dynamic App Content Body */}
        <div id="fleo-stage" className="flex-1 flex flex-col overflow-hidden relative select-text bg-[#FAF9F6]">
          {loading ? (
            <div id="loader-bezel" className="flex-1 flex flex-col items-center justify-center bg-[#FAF9F6] gap-4">
              <div className="flex items-center justify-center w-12 h-12 border-2 border-[#121212] text-[#121212] text-xl font-serif italic">
                f
              </div>
              <h3 className="font-bold text-[#121212] tracking-tighter text-2xl font-serif italic">fleo<span className="text-[#888]">.</span></h3>
              <p className="text-[9px] text-[#888] font-mono tracking-widest uppercase">Connecting Nodes...</p>
            </div>
          ) : !profile ? (
            // User authentication requested
            <AuthScreen onSuccess={handleSuccessfulAuth} />
          ) : (
            // Full logged-in main application content view
            <div id="authorized-app-layout" className="flex-1 flex flex-col overflow-hidden h-full relative p-0">
              {/* App Level Brand Header (Clean elegant, with Logo badge) */}
              <header id="main-global-header" className="bg-[#FAF9F6] border-b border-[#121212] px-6 py-4.5 shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold tracking-tighter text-[#121212] select-none">
                    fleo<span className="text-[#555]">.</span>
                  </h1>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-bold text-[#121212] font-mono flex items-center gap-1.5 border border-[#121212] px-2.5 py-0.5 select-none transition">
                    <span className="w-1.5 h-1.5 bg-black rounded-full"></span>
                    LIVE
                  </span>
                </div>
              </header>

              {/* Central Switchable Navigation Views Pane */}
              <main id="fleo-scrollable-views" className="flex-1 overflow-hidden relative">
                {activeTab === 'feed' && (
                  <FeedTab currentUserProfile={profile} />
                )}
                {activeTab === 'notifications' && (
                  <NotificationsTab />
                )}
                {activeTab === 'profile' && (
                  <ProfileTab 
                    currentUserProfile={profile} 
                    onNavigateToSettings={() => setActiveTab('settings')} 
                  />
                )}
                {activeTab === 'settings' && (
                  <SettingsTab 
                    currentUserProfile={profile} 
                    onProfileUpdate={handleProfileSynced} 
                    onLogout={() => {
                      setProfile(null);
                      setUser(null);
                    }} 
                  />
                )}
              </main>

              {/* Premium Floating bottom Tab bar navigation panel */}
              <nav id="bottom-navigation-dock" className="absolute bottom-4 left-4 right-4 bg-[#FAF9F6]/95 backdrop-blur-md border border-[#121212] h-14 px-1 flex items-center justify-between z-15 shadow-none rounded-none">
                <button 
                  onClick={() => setActiveTab('feed')}
                  className={`flex-1 flex flex-col items-center justify-center h-full transition cursor-pointer ${
                    activeTab === 'feed' ? 'text-[#121212] font-bold border-b border-[#121212]' : 'text-[#888] hover:text-[#121212]'
                  }`}
                >
                  <Home className="w-4 h-4 shrink-0" />
                  <span className="text-[8px] uppercase tracking-widest font-mono mt-0.5">Home</span>
                </button>

                <button 
                  onClick={() => setActiveTab('notifications')}
                  className={`flex-1 flex flex-col items-center justify-center relative h-full transition cursor-pointer ${
                    activeTab === 'notifications' ? 'text-[#121212] font-bold border-b border-[#121212]' : 'text-[#888] hover:text-[#121212]'
                  }`}
                >
                  <Bell className="w-4 h-4 shrink-0" />
                  <span className="text-[8px] uppercase tracking-widest font-mono mt-0.5">Alerts</span>
                  {unreadCount > 0 && (
                    <span className="absolute top-2 right-4 bg-[#121212] text-white font-mono text-[8px] w-4 h-4 flex items-center justify-center shrink-0">
                      {unreadCount}
                    </span>
                  )}
                </button>

                <button 
                  onClick={() => setActiveTab('profile')}
                  className={`flex-1 flex flex-col items-center justify-center h-full transition cursor-pointer ${
                    activeTab === 'profile' ? 'text-[#121212] font-bold border-b border-[#121212]' : 'text-[#888] hover:text-[#121212]'
                  }`}
                >
                  <User className="w-4 h-4 shrink-0" />
                  <span className="text-[8px] uppercase tracking-widest font-mono mt-0.5">Profile</span>
                </button>

                <button 
                  onClick={() => setActiveTab('settings')}
                  className={`flex-1 flex flex-col items-center justify-center h-full transition cursor-pointer ${
                    activeTab === 'settings' ? 'text-[#121212] font-bold border-b border-[#121212]' : 'text-[#888] hover:text-[#121212]'
                  }`}
                >
                  <Settings className="w-4 h-4 shrink-0" />
                  <span className="text-[8px] uppercase tracking-widest font-mono mt-0.5">Control</span>
                </button>
              </nav>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
