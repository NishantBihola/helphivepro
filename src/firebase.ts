import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Store user info in Firestore
    const userPath = `users/${user.uid}`;
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        // Check if a user with this email already exists to preserve their plan
        let existingPlan = "Drone Plan";
        let existingLimits = { nodes: 1, requests: 12 };
        let existingFeatures = ["Basic AI avatars", "1 personal avatar", "Standard AI assistant"];
        let existingHoneyScore = 100;
        let existingReputation = 1;
        
        if (user.email) {
          const q = query(collection(db, 'users'), where('email', '==', user.email));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const existingData = querySnapshot.docs[0].data();
            existingPlan = existingData.plan || existingPlan;
            existingLimits = existingData.limits || existingLimits;
            existingFeatures = existingData.features || existingFeatures;
            existingHoneyScore = existingData.honeyScore || existingHoneyScore;
            existingReputation = existingData.reputation || existingReputation;
          }
        }

        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          displayName: user.displayName || "Anonymous",
          email: user.email,
          photoURL: user.photoURL || "",
          lastLogin: new Date().toISOString(),
          honeyScore: existingHoneyScore,
          reputation: existingReputation,
          plan: existingPlan,
          limits: existingLimits,
          features: existingFeatures
        }, { merge: true });
        
        await setDoc(doc(db, 'public_profiles', user.uid), {
          uid: user.uid,
          displayName: user.displayName || "Anonymous",
          photoURL: user.photoURL || "",
          honeyScore: existingHoneyScore,
          activeHelps: 0,
          reputation: existingReputation,
          bio: "A new member of the Hive."
        }, { merge: true });
      } else {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          lastLogin: new Date().toISOString(),
        }, { merge: true });
        
        await setDoc(doc(db, 'public_profiles', user.uid), {
          uid: user.uid,
          displayName: user.displayName || "Anonymous",
          photoURL: user.photoURL || "",
        }, { merge: true });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, userPath);
    }
    
    return user;
  } catch (error: any) {
    if (error.code === 'auth/popup-closed-by-user') {
      console.log("Sign-in popup was closed by the user.");
      return null;
    }
    console.error("Error signing in with Google:", error);
    throw error;
  }
}

export async function updatePlan(userId: string, plan: string) {
  const userPath = `users/${userId}`;
  
  const planData: Record<string, any> = {
    "Drone Plan": {
      limits: { nodes: 1, requests: 12 },
      features: ["Basic AI avatars", "1 personal avatar", "Standard AI assistant"]
    },
    "Worker Plan": {
      limits: { nodes: 5, requests: 120 },
      features: ["Selected industry avatars", "5 personal avatars", "Premium voices", "Custom fonts", "Branded share page"]
    },
    "Queen Plan": {
      limits: { nodes: 9999, requests: 9999 },
      features: ["All industry avatars", "Unlimited personal avatars", "Branded AI avatars", "Voice cloning", "Shared workspace"]
    }
  };

  const selectedPlan = planData[plan] || planData["Drone Plan"];

  try {
    await setDoc(doc(db, 'users', userId), {
      uid: userId,
      email: auth.currentUser?.email,
      plan: plan,
      limits: selectedPlan.limits,
      features: selectedPlan.features,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { user, loading, logout };
}
