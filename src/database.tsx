import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  query, 
  onSnapshot, 
  runTransaction 
} from 'firebase/firestore';
import { db } from './firebase';

export interface LocalUser {
  email: string;
  username: string;
  password?: string;
  pfpUrl?: string;
  uid: string;
}

export interface LocalComment {
  id: string;
  slideId: string;
  parentId: string | null;
  text: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  likes: number;
  dislikes: number;
  likedBy: string[];
  dislikedBy: string[];
  createdAt: number;
}

interface DatabaseContextType {
  currentUser: LocalUser | null;
  users: LocalUser[];
  comments: LocalComment[];
  loginOrRegister: (email: string, password: string) => Promise<LocalUser>;
  customLogout: () => void;
  updateUserBio: (username: string, pfpUrl: string, password?: string) => Promise<void>;
  getCommentsForSlide: (slideId: string) => LocalComment[];
  addComment: (slideId: string, parentId: string | null, text: string) => Promise<void>;
  editComment: (id: string, text: string) => Promise<void>;
  deleteComment: (id: string) => Promise<void>;
  voteComment: (id: string, type: 'like' | 'dislike') => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

enum OperationType {
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
    userId?: string | null;
    email?: string | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, userId?: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: userId || null,
      email: null,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<LocalUser | null>(null);
  const [users, setUsers] = useState<LocalUser[]>([]);
  const [comments, setComments] = useState<LocalComment[]>([]);

  // 1. Synchronize local credentials & accounts from localStorage
  useEffect(() => {
    const storedUsers = localStorage.getItem('local_db_users');
    const storedActiveUser = localStorage.getItem('local_db_active_user');

    if (storedUsers) {
      setUsers(JSON.parse(storedUsers));
    } else {
      const defaultUsers: LocalUser[] = [];
      localStorage.setItem('local_db_users', JSON.stringify(defaultUsers));
      setUsers(defaultUsers);
    }

    if (storedActiveUser) {
      setCurrentUser(JSON.parse(storedActiveUser));
    }
  }, []);

  // 2. Clear real-time comments synchronization from Firebase Firestore
  useEffect(() => {
    const q = query(collection(db, 'comments'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedComments = snapshot.docs.map(doc => {
        const data = doc.data();
        let createdAt = Date.now();
        if (data.createdAt) {
          if (typeof data.createdAt.toMillis === 'function') {
            createdAt = data.createdAt.toMillis();
          } else if (typeof data.createdAt === 'number') {
            createdAt = data.createdAt;
          } else if (data.createdAt.seconds) {
            createdAt = data.createdAt.seconds * 1000;
          }
        }
        return {
          id: doc.id,
          slideId: data.slideId || '',
          parentId: data.parentId || null,
          text: data.text || '',
          userId: data.userId || '',
          userName: data.userName || 'Anonymous',
          userPhoto: data.userPhoto || '',
          likes: data.likes || 0,
          dislikes: data.dislikes || 0,
          likedBy: data.likedBy || [],
          dislikedBy: data.dislikedBy || [],
          createdAt
        } as LocalComment;
      });
      setComments(fetchedComments);
    }, (error) => {
      console.error("Firestore comments onSnapshot Error:", error);
    });

    return () => unsubscribe();
  }, []);

  const persistUsers = (newUsers: LocalUser[]) => {
    setUsers(newUsers);
    localStorage.setItem('local_db_users', JSON.stringify(newUsers));
  };

  const persistCurrentUser = (user: LocalUser | null) => {
    setCurrentUser(user);
    if (user) {
      localStorage.setItem('local_db_active_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('local_db_active_user');
    }
  };

  const loginOrRegister = async (email: string, password: string): Promise<LocalUser> => {
    const loweredEmail = email.toLowerCase().trim();
    const existing = users.find(u => u.email.toLowerCase() === loweredEmail);

    if (existing) {
      if (existing.password === password) {
        persistCurrentUser(existing);
        return existing;
      } else {
        throw new Error("Invalid password for this account.");
      }
    } else {
      const display = loweredEmail.split('@')[0];
      const newUser: LocalUser = {
        email: loweredEmail,
        username: display,
        password: password,
        pfpUrl: `https://api.dicebear.com/7.x/shapes/svg?seed=${loweredEmail}`,
        uid: 'user_' + Math.random().toString(36).substr(2, 9)
      };
      
      const updated = [...users, newUser];
      persistUsers(updated);
      persistCurrentUser(newUser);
      return newUser;
    }
  };

  const customLogout = () => {
    persistCurrentUser(null);
  };

  const updateUserBio = async (username: string, pfpUrl: string, password?: string) => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, username, pfpUrl };
    if (password && password.trim() !== '') {
      updatedUser.password = password;
    }

    const updatedUsers = users.map(u => u.uid === currentUser.uid ? updatedUser : u);
    persistUsers(updatedUsers);
    persistCurrentUser(updatedUser);

    // Update their username and photo in Firestore comments where userId === currentUser.uid
    try {
      const userComments = comments.filter(c => c.userId === currentUser.uid);
      await Promise.all(userComments.map(async (c) => {
        try {
          await updateDoc(doc(db, 'comments', c.id), {
            userName: username,
            userPhoto: pfpUrl
          });
        } catch (e) {
          console.error(`Failed to update user details on comment ${c.id}:`, e);
        }
      }));
    } catch (err) {
      console.error("Error updating user bio in comments:", err);
    }
  };

  const getCommentsForSlide = (slideId: string): LocalComment[] => {
    return comments.filter(c => c.slideId === slideId).sort((a,b) => b.createdAt - a.createdAt);
  };

  const addComment = async (slideId: string, parentId: string | null, text: string) => {
    if (!currentUser) return;
    const commentId = 'comment_' + Math.random().toString(36).substr(2, 9);
    const newComment: Omit<LocalComment, 'id'> = {
      slideId,
      parentId,
      text,
      userId: currentUser.uid,
      userName: currentUser.username,
      userPhoto: currentUser.pfpUrl || '',
      likes: 0,
      dislikes: 0,
      likedBy: [],
      dislikedBy: [],
      createdAt: Date.now()
    };

    try {
      await setDoc(doc(db, 'comments', commentId), newComment);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `comments/${commentId}`, currentUser.uid);
    }
  };

  const editComment = async (id: string, text: string) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, 'comments', id), { text });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `comments/${id}`, currentUser.uid);
    }
  };

  const deleteComment = async (id: string) => {
    if (!currentUser) return;
    const filterOut = (parentId: string): string[] => {
      let ids = [parentId];
      const childs = comments.filter(c => c.parentId === parentId);
      for (const curr of childs) {
        ids = [...ids, ...filterOut(curr.id)];
      }
      return ids;
    };
    const idsToRemove = filterOut(id);
    try {
      await Promise.all(
        idsToRemove.map(cid => deleteDoc(doc(db, 'comments', cid)))
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `comments/${id}`, currentUser.uid);
    }
  };

  const voteComment = async (id: string, type: 'like' | 'dislike') => {
    if (!currentUser) return;
    try {
      const commentRef = doc(db, 'comments', id);
      await runTransaction(db, async (transaction) => {
        const docSnap = await transaction.get(commentRef);
        if (!docSnap.exists()) return;

        const data = docSnap.data() as LocalComment;
        let likes = data.likes || 0;
        let dislikes = data.dislikes || 0;
        let likedBy = data.likedBy || [];
        let dislikedBy = data.dislikedBy || [];

        const isLiked = likedBy.includes(currentUser.uid);
        const isDisliked = dislikedBy.includes(currentUser.uid);

        if (type === 'like') {
          if (isLiked) {
            likedBy = likedBy.filter(uid => uid !== currentUser.uid);
            likes = Math.max(0, likes - 1);
          } else {
            likedBy = [...likedBy, currentUser.uid];
            likes = likes + 1;
            if (isDisliked) {
              dislikedBy = dislikedBy.filter(uid => uid !== currentUser.uid);
              dislikes = Math.max(0, dislikes - 1);
            }
          }
        } else {
          if (isDisliked) {
            dislikedBy = dislikedBy.filter(uid => uid !== currentUser.uid);
            dislikes = Math.max(0, dislikes - 1);
          } else {
            dislikedBy = [...dislikedBy, currentUser.uid];
            dislikes = dislikes + 1;
            if (isLiked) {
              likedBy = likedBy.filter(uid => uid !== currentUser.uid);
              likes = Math.max(0, likes - 1);
            }
          }
        }

        transaction.update(commentRef, {
          likes,
          dislikes,
          likedBy,
          dislikedBy
        });
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `comments/${id}`, currentUser.uid);
    }
  };

  return (
    <DatabaseContext.Provider value={{
      currentUser,
      users,
      comments,
      loginOrRegister,
      customLogout,
      updateUserBio,
      getCommentsForSlide,
      addComment,
      editComment,
      deleteComment,
      voteComment
    }}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};
