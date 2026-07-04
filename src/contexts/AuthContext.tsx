import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  logout: () => Promise<void>;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, logout: async () => {}, loading: true, isAdmin: false });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          
          if (!userDoc.exists()) {
            // Document doesn't exist yet, try creating as 'admin' first to see if firestore rules allow it.
            try {
              const adminProfile: UserProfile = {
                email: user.email || '',
                role: 'admin',
                wishlist: []
              };
              await setDoc(userDocRef, adminProfile);
            } catch (err) {
              // Try as customer fallback
              const customerProfile: UserProfile = {
                email: user.email || '',
                role: 'customer',
                wishlist: []
              };
              await setDoc(userDocRef, customerProfile);
            }
          } else {
            const data = userDoc.data() as UserProfile;
            if (data.role !== 'admin') {
              // Try to promote to admin. This will succeed ONLY if firestore rules allow it.
              try {
                const updatedData = { ...data, role: 'admin' as const };
                await setDoc(userDocRef, updatedData, { merge: true });
              } catch (err) {
                // Not an admin, which is normal for regular customers.
              }
            }
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        }

        // Set up real-time listener on the user profile document
        unsubscribeProfile = onSnapshot(userDocRef, (snapshot) => {
          if (snapshot.exists()) {
            setProfile(snapshot.data() as UserProfile);
          }
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
          setLoading(false);
        });

      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  const logout = () => auth.signOut();

  return (
    <AuthContext.Provider value={{ user, profile, logout, loading, isAdmin: profile?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
