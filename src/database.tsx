import React, { createContext, useContext, useState, useEffect } from 'react';

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

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<LocalUser | null>(null);
  const [users, setUsers] = useState<LocalUser[]>([]);
  const [comments, setComments] = useState<LocalComment[]>([]);

  useEffect(() => {
    const storedUsers = localStorage.getItem('local_db_users');
    const storedComments = localStorage.getItem('local_db_comments');
    const storedActiveUser = localStorage.getItem('local_db_active_user');

    if (storedUsers) {
      setUsers(JSON.parse(storedUsers));
    } else {
      const defaultUsers: LocalUser[] = [];
      localStorage.setItem('local_db_users', JSON.stringify(defaultUsers));
      setUsers(defaultUsers);
    }

    if (storedComments) {
      setComments(JSON.parse(storedComments));
    } else {
      localStorage.setItem('local_db_comments', JSON.stringify([]));
      setComments([]);
    }

    if (storedActiveUser) {
      setCurrentUser(JSON.parse(storedActiveUser));
    }
  }, []);

  const persistUsers = (newUsers: LocalUser[]) => {
    setUsers(newUsers);
    localStorage.setItem('local_db_users', JSON.stringify(newUsers));
  };

  const persistComments = (newComments: LocalComment[]) => {
    setComments(newComments);
    localStorage.setItem('local_db_comments', JSON.stringify(newComments));
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

    const updatedComments = comments.map(c => {
      if (c.userId === currentUser.uid) {
        return { ...c, userName: username, userPhoto: pfpUrl };
      }
      return c;
    });
    persistComments(updatedComments);
  };

  const getCommentsForSlide = (slideId: string): LocalComment[] => {
    return comments.filter(c => c.slideId === slideId).sort((a,b) => b.createdAt - a.createdAt);
  };

  const addComment = async (slideId: string, parentId: string | null, text: string) => {
    if (!currentUser) return;
    const newComment: LocalComment = {
      id: 'comment_' + Math.random().toString(36).substr(2, 9),
      slideId,
      parentId,
      text,
      userId: currentUser.uid,
      userName: currentUser.username,
      userPhoto: currentUser.pfpUrl,
      likes: 0,
      dislikes: 0,
      likedBy: [],
      dislikedBy: [],
      createdAt: Date.now()
    };
    persistComments([...comments, newComment]);
  };

  const editComment = async (id: string, text: string) => {
    const updated = comments.map(c => c.id === id ? { ...c, text } : c);
    persistComments(updated);
  };

  const deleteComment = async (id: string) => {
    const filterOut = (parentId: string): string[] => {
      let ids = [parentId];
      const childs = comments.filter(c => c.parentId === parentId);
      for (const curr of childs) {
        ids = [...ids, ...filterOut(curr.id)];
      }
      return ids;
    };
    const idsToRemove = filterOut(id);
    const updated = comments.filter(c => !idsToRemove.includes(c.id));
    persistComments(updated);
  };

  const voteComment = async (id: string, type: 'like' | 'dislike') => {
    if (!currentUser) return;
    const countLikes = comments.map(c => {
      if (c.id === id) {
        let likes = c.likes || 0;
        let dislikes = c.dislikes || 0;
        let likedBy = c.likedBy || [];
        let dislikedBy = c.dislikedBy || [];

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

        return { ...c, likes, dislikes, likedBy, dislikedBy };
      }
      return c;
    });
    persistComments(countLikes);
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
