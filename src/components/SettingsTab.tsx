/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { signOut, updateProfile } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile } from '../types';
import { 
  LogOut, 
  Settings, 
  User, 
  FileText, 
  Check, 
  Image, 
  Key, 
  AlertCircle 
} from 'lucide-react';
import { motion } from 'motion/react';

interface SettingsTabProps {
  currentUserProfile: UserProfile;
  onProfileUpdate: (updated: UserProfile) => void;
  onLogout: () => void;
}

export default function SettingsTab({ currentUserProfile, onProfileUpdate, onLogout }: SettingsTabProps) {
  const [displayName, setDisplayName] = useState(currentUserProfile.displayName);
  const [username, setUsername] = useState(currentUserProfile.username);
  const [bio, setBio] = useState(currentUserProfile.bio);
  const [photoURL, setPhotoURL] = useState(currentUserProfile.photoURL);
  const [coverURL, setCoverURL] = useState(currentUserProfile.coverURL);
  
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const cleanUsername = username.trim().toLowerCase();
      if (cleanUsername.length < 3 || cleanUsername.length > 20) {
        throw new Error('Username must be between 3 and 20 characters.');
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
        throw new Error('Username can only contain alphanumeric characters, underscores, or dashes.');
      }

      if (!displayName.trim()) {
        throw new Error('Display Name is required.');
      }

      if (!auth.currentUser) return;

      // Update auth profile
      await updateProfile(auth.currentUser, {
        displayName: displayName.trim(),
        photoURL: photoURL.trim() || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`
      });

      // Update Firestore user document
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      const updatedProfile = {
        displayName: displayName.trim(),
        username: cleanUsername,
        bio: bio.trim(),
        photoURL: photoURL.trim() || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`,
        coverURL: coverURL.trim() || 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=600&auto=format&fit=crop',
        updatedAt: serverTimestamp()
      };

      try {
        await updateDoc(userDocRef, updatedProfile);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
      }

      // Lift state
      onProfileUpdate({
        ...currentUserProfile,
        displayName: displayName.trim(),
        username: cleanUsername,
        bio: bio.trim(),
        photoURL: photoURL.trim(),
        coverURL: coverURL.trim()
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to update profile info.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      onLogout();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div id="settings-tab" className="bg-[#FAF9F6] h-full overflow-y-auto">
      {/* Header static card */}
      <div id="settings-header" className="bg-[#FAF9F6] border-b border-[#121212] p-5 shrink-0 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-[#121212] text-xl font-serif italic leading-none">Settings</h2>
          <p className="text-[10px] uppercase tracking-widest text-[#888] font-bold mt-1.5">Manage your digital profile & nodes</p>
        </div>
        <button 
          onClick={handleSignOut}
          className="flex items-center gap-1.5 px-3 py-2 border border-[#121212] hover:bg-[#121212] hover:text-white rounded-none text-[9px] font-bold uppercase tracking-widest text-[#121212] transition cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Log out</span>
        </button>
      </div>

      <div className="px-4 py-4 space-y-4 pb-24">
        {/* Profile Details Edit Card */}
        <div className="bg-white border border-[#E8E6E1] rounded-none p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#E8E6E1]">
            <User className="w-4 h-4 text-[#121212]" />
            <h3 className="font-bold text-[10px] uppercase tracking-[0.18em] text-[#121212] mb-0.5">Edit Profile</h3>
          </div>

          {success && (
            <div className="p-3 border border-[#121212] bg-white text-xs font-mono text-[#121212] flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>Nodes updated successfully!</span>
            </div>
          )}

          {error && (
            <div className="p-3 border border-red-600 text-xs font-mono text-red-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-widest text-neutral-400 mb-1">Display Name</label>
                <input 
                  type="text" 
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-[#121212] rounded-none bg-white focus:outline-none transition-all text-[#121212]"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase tracking-widest text-neutral-400 mb-1">Username</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-[#121212] rounded-none bg-white focus:outline-none transition-all text-[#121212]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-bold uppercase tracking-widest text-neutral-400 mb-1">Biography</label>
              <textarea 
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={160}
                className="w-full text-xs px-3.5 py-2.5 border border-[#121212] rounded-none bg-white focus:outline-none transition-all h-20 resize-none text-[#121212] font-serif font-light"
              />
              <span className="text-[9px] font-mono font-semibold text-neutral-400 block text-right mt-1">{bio.length}/160 CHARACTERS</span>
            </div>

            <div>
              <label className="block text-[9px] font-bold uppercase tracking-widest text-neutral-400 mb-1">Avatar Image URL</label>
              <input 
                type="url" 
                value={photoURL}
                onChange={(e) => setPhotoURL(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-[#121212] rounded-none bg-white focus:outline-none transition-all text-[#121212] font-mono"
              />
            </div>

            <div>
              <label className="block text-[9px] font-bold uppercase tracking-widest text-neutral-400 mb-1">Cover Wallpaper URL</label>
              <input 
                type="url" 
                value={coverURL}
                onChange={(e) => setCoverURL(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-[#121212] rounded-none bg-white focus:outline-none transition-all text-[#121212] font-mono"
              />
            </div>

            <button 
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-[#121212] hover:bg-transparent border border-[#121212] hover:text-[#121212] font-bold text-white disabled:bg-neutral-300 rounded-none text-xs uppercase tracking-widest transition-all cursor-pointer"
            >
              {saving ? 'Saving changes...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Security / Privacy details */}
        <div className="bg-white border border-[#E8E6E1] rounded-none p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#E8E6E1]">
            <Key className="w-4 h-4 text-[#121212]" />
            <h3 className="font-bold text-[10px] uppercase tracking-[0.18em] text-[#121212] mb-0.5">Security & Credentials</h3>
          </div>

          <div className="space-y-2 text-xs text-neutral-700 relative leading-relaxed font-mono">
            <div className="flex justify-between items-center py-2 border-b border-neutral-100">
              <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold">Sign in ID</span>
              <span className="text-neutral-500 select-all shrink-0 text-[11px]">{currentUserProfile.uid.slice(0, 10)}...</span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-neutral-100">
              <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold">Verified Email</span>
              <span className="text-neutral-500 select-all shrink-0 text-[11px] font-sans font-medium">{currentUserProfile.email}</span>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold">Session</span>
              <span className="text-emerald-700 font-bold flex items-center gap-1.5 shrink-0 text-[10px] uppercase tracking-widest">
                <span className="w-2 h-2 rounded-none bg-emerald-600"></span>
                ACTIVE
              </span>
            </div>
          </div>
        </div>

        {/* Informational Disclaimer Card */}
        <div className="bg-white border border-[#E8E6E1] rounded-none p-5 space-y-2">
          <div className="flex items-center gap-2 pb-2 border-b border-[#E8E6E1]">
            <FileText className="w-4 h-4 text-[#121212]" />
            <h3 className="font-bold text-[10px] uppercase tracking-[0.18em] text-[#121212] mb-0.5">About fleo social</h3>
          </div>
          <p className="text-[11px] text-neutral-500 leading-relaxed font-serif font-light">
            Fleo Social operates on a minimalist cloud node network. All journal activities, reactions, distributed comments, and instant notifications are synchronizing securely across ABAC policies.
          </p>
        </div>
      </div>
    </div>
  );
}
