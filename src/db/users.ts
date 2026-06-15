import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { OperationType, handleFirestoreError } from '../utils/firebaseErrors';
import type { User as FirebaseUser } from 'firebase/auth';

export const saveUserToFirestore = async (user: FirebaseUser) => {
  const userRef = doc(db, 'users', user.uid);
  try {
    const docSnap = await getDoc(userRef).catch(err => {
      handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
    });
    
    if (docSnap && !docSnap.exists()) {
      await setDoc(userRef, {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      });
    } else {
      await setDoc(userRef, {
        lastLogin: serverTimestamp(),
      }, { merge: true });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
  }
};
