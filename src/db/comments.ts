import { collection, doc, setDoc, deleteDoc, query, where, orderBy, onSnapshot, serverTimestamp, getDocs, updateDoc, increment, runTransaction, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';

export interface Comment {
  id: string;
  slideId: string;
  parentId: string | null;
  text: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  likes: number;
  dislikes: number;
  likedBy?: string[];
  dislikedBy?: string[];
  createdAt: any;
}

export const getCommentsForSlide = (slideId: string, callback: (comments: Comment[]) => void) => {
  const commentsRef = collection(db, 'comments');
  // Simple query without requiring compound index
  const q = query(commentsRef, where('slideId', '==', slideId));

  return onSnapshot(q, (snapshot) => {
    let comments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
    comments.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return timeB - timeA; // Descending order
    });
    callback(comments);
  }, (error) => {
    console.error("Firestore comments onSnapshot Error:", error);
  });
};

export const addComment = async (slideId: string, parentId: string | null, text: string, user: any) => {
  const newCommentRef = doc(collection(db, 'comments'));
  const commentData: Comment = {
    id: newCommentRef.id,
    slideId,
    parentId,
    text,
    userId: user.uid,
    userName: user.displayName || user.email,
    userPhoto: user.photoURL,
    likes: 0,
    dislikes: 0,
    likedBy: [],
    dislikedBy: [],
    createdAt: serverTimestamp()
  };
  await setDoc(newCommentRef, commentData);
};

export const deleteComment = async (id: string) => {
  await deleteDoc(doc(db, 'comments', id));
};

export const editComment = async (id: string, newText: string) => {
  await updateDoc(doc(db, 'comments', id), { text: newText });
};

export const voteComment = async (id: string, userId: string, type: 'like' | 'dislike') => {
  const commentRef = doc(db, 'comments', id);

  await runTransaction(db, async (transaction) => {
    const docSnap = await transaction.get(commentRef);
    if (!docSnap.exists()) return;

    const data = docSnap.data() as Comment;
    const likedBy = data.likedBy || [];
    const dislikedBy = data.dislikedBy || [];

    const isLiked = likedBy.includes(userId);
    const isDisliked = dislikedBy.includes(userId);

    let newLikes = data.likes || 0;
    let newDislikes = data.dislikes || 0;
    const updates: any = {};

    if (type === 'like') {
      if (isLiked) {
        updates.likedBy = arrayRemove(userId);
        updates.likes = Math.max(0, newLikes - 1);
      } else {
        updates.likedBy = arrayUnion(userId);
        updates.likes = newLikes + 1;
        if (isDisliked) {
          updates.dislikedBy = arrayRemove(userId);
          updates.dislikes = Math.max(0, newDislikes - 1);
        }
      }
    } else {
      if (isDisliked) {
        updates.dislikedBy = arrayRemove(userId);
        updates.dislikes = Math.max(0, newDislikes - 1);
      } else {
        updates.dislikedBy = arrayUnion(userId);
        updates.dislikes = newDislikes + 1;
        if (isLiked) {
          updates.likedBy = arrayRemove(userId);
          updates.likes = Math.max(0, newLikes - 1);
        }
      }
    }

    transaction.update(commentRef, updates);
  });
};
