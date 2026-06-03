/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  updateProfile 
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { LogIn, UserPlus, Flame, AlertCircle } from 'lucide-react';

interface AuthScreenProps {
  onSuccess: () => void;
}

export default function AuthScreen({ onSuccess }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Quick info notification for email/password auth setup
  const [showFirebaseInfo, setShowFirebaseInfo] = useState(true);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        if (!username || !displayName) {
          throw new Error('Please fill in username and display name.');
        }
        
        const cleanUsername = username.trim().toLowerCase();
        if (cleanUsername.length < 3 || cleanUsername.length > 20) {
          throw new Error('Username must be between 3 and 20 characters.');
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
          throw new Error('Username can only contain letters, numbers, underscores, and dashes.');
        }

        // Create Firebase Auth user
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const user = userCredential.user;

        // Try setting displayName in auth profile
        await updateProfile(user, {
          displayName: displayName.trim(),
          photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`
        });

        // Set user document in Firestore users subcollection /users/{userId}
        const userProfile = {
          uid: user.uid,
          email: user.email || email.trim(),
          username: cleanUsername,
          displayName: displayName.trim(),
          bio: 'Hey there! I am using fleo social.',
          photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`,
          coverURL: 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=600&auto=format&fit=crop',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        const userDocRef = doc(db, 'users', user.uid);
        try {
          await setDoc(userDocRef, userProfile);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`);
        }

      } else {
        // Logging in
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }

      onSuccess();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/configuration-not-found') {
        setError('Email / Password sign-in is disabled in your Firebase Console. Please use Google Sign In or enable Email/Password provider.');
      } else {
        setError(err.message || 'An error occurred during authentication.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      // Check if user document already exists
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        const generatedUsername = user.email ? user.email.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '') : `user_${user.uid.slice(0, 5)}`;
        
        // Setup initial user document in Firestore /users/{userId}
        const userProfile = {
          uid: user.uid,
          email: user.email || '',
          username: generatedUsername.toLowerCase().slice(0, 20),
          displayName: user.displayName || 'Fleo Socialite',
          bio: 'Hey there! I am using fleo social.',
          photoURL: user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.displayName || 'FS')}`,
          coverURL: 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=600&auto=format&fit=crop',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        try {
          await setDoc(userDocRef, userProfile);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`);
        }
      }

      onSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-screen-container" className="flex flex-col justify-between h-full bg-[#FAF9F6] px-6 py-6 font-sans">
      <div id="auth-header" className="flex flex-col items-center mt-10">
        <div id="branding-badge" className="flex items-center justify-center w-12 h-12 border border-[#121212] bg-[#FAF9F6] text-[#121212] text-xl font-serif italic mb-4">
          f
        </div>
        <h1 id="brand-title" className="text-3xl font-bold tracking-tighter text-[#121212] font-serif">
          fleo<span className="text-[#888]">.</span>
        </h1>
        <p id="brand-subtitle" className="text-xs uppercase tracking-widest text-[#888] font-medium mt-1">Sleek, minimal social engine</p>
      </div>

      <div id="auth-form-card" className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        {error && (
          <div id="auth-error-msg" className="mb-4 p-3 border border-[#121212] text-xs text-red-600 font-mono flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form id="auth-form" onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#888] mb-1">Display Name</label>
                <input 
                  type="text" 
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Liam Vance"
                  className="w-full text-sm px-4 py-3 border border-[#121212] rounded-none bg-white focus:ring-0 focus:outline-none transition text-[#121212] placeholder-[#888]"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#888] mb-1">Username</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. liam_v"
                  className="w-full text-sm px-4 py-3 border border-[#121212] rounded-none bg-white focus:ring-0 focus:outline-none transition text-[#121212] placeholder-[#888]"
                  required
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[#888] mb-1">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full text-sm px-4 py-3 border border-[#121212] rounded-none bg-white focus:ring-0 focus:outline-none transition text-[#121212] placeholder-[#888]"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[#888] mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full text-sm px-4 py-3 border border-[#121212] rounded-none bg-white focus:ring-0 focus:outline-none transition text-[#121212]"
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 py-3.5 bg-[#121212] text-white hover:bg-transparent hover:text-[#121212] border border-[#121212] rounded-none text-xs font-bold uppercase tracking-widest transition-all cursor-pointer"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/45 border-t-[#121212] rounded-full animate-spin"></span>
            ) : isSignUp ? (
              <span>Create Account</span>
            ) : (
              <span>Log In</span>
            )}
          </button>
        </form>

        <div id="google-auth-divider" className="flex items-center my-5">
          <div className="flex-1 border-t border-[#E8E6E1]"></div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#888] mx-3">or</span>
          <div className="flex-1 border-t border-[#E8E6E1]"></div>
        </div>

        <button 
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3.5 py-3.5 border border-[#121212] hover:bg-[#121212] hover:text-white bg-transparent text-[#121212] rounded-none text-xs font-bold uppercase tracking-widest transition-all cursor-pointer"
        >
          <svg className="w-4.5 h-4.5 shrink-0 fill-current" viewBox="0 0 24 24">
            <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.73 0 3.32.63 4.56 1.68l2.44-2.44C17.24 1.34 14.88 0 12.24 0c-6.07 0-11 4.93-11 11s4.93 11 11 11c5.83 0 10.71-4.14 10.71-10.285 0-.615-.055-1.115-.17-1.715H12.24z" />
          </svg>
          Google Workspace
        </button>

        {showFirebaseInfo && (
          <div id="firebase-instructional-note" className="mt-6 p-4 border border-[#E8E6E1] bg-[#FAF9F6] text-[#555] text-[10px] leading-relaxed relative">
            <button 
              onClick={() => setShowFirebaseInfo(false)}
              className="absolute top-2 right-2 text-[#888] hover:text-[#121212] font-semibold cursor-pointer text-xs p-1"
            >
              ✕
            </button>
            <h5 className="font-bold text-[#121212] mb-0.5 uppercase tracking-wider text-[9px]">Firebase Registration Check</h5>
            <p>If you choose Email/Password, ensure that <strong>Email/Password</strong> authentication is active in your Firebase project console sub-panel.</p>
          </div>
        )}
      </div>

      <div id="auth-footer" className="text-center pt-4">
        <button 
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-xs font-bold border-b border-[#121212] pb-0.5 uppercase tracking-widest text-[#121212] hover:text-[#888] transition cursor-pointer"
        >
          {isSignUp ? 'Already registered? Log In' : "No account? Register"}
        </button>
      </div>
    </div>
  );
}
