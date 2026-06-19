import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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
    return onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          
          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            if (data.role === 'admin') {
              setProfile(data);
            } else {
              // Try to promote to admin. This will succeed ONLY if firestore rules allow it (i.e. if user is actually in the admin list).
              try {
                const updatedData = { ...data, role: 'admin' as const };
                await setDoc(doc(db, 'users', user.uid), updatedData, { merge: true });
                setProfile(updatedData);
              } catch (err) {
                // Not an admin, which is normal for regular customers. Keep role 'customer'.
                setProfile(data);
              }
            }
          } else {
            // Document doesn't exist yet, try creating as 'admin' first to see if firestore rules allow it.
            try {
              const adminProfile: UserProfile = {
                email: user.email || '',
                role: 'admin',
                wishlist: []
              };
              await setDoc(doc(db, 'users', user.uid), adminProfile);
              setProfile(adminProfile);
            } catch (err) {
              // Try as customer fallback
              const customerProfile: UserProfile = {
                email: user.email || '',
                role: 'customer',
                wishlist: []
              };
              await setDoc(doc(db, 'users', user.uid), customerProfile);
              setProfile(customerProfile);
            }
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
  }, []);

  const logout = () => auth.signOut();

  return (
    <AuthContext.Provider value={{ user, profile, logout, loading, isAdmin: profile?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
