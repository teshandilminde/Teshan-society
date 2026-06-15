/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { saveUserToFirestore } from './db/users';
import Entry from './pages/Entry';
import Main from './pages/Main';
import Admin from './pages/Admin';

export type Page = 'entry' | 'main' | 'admin';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('entry');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        saveUserToFirestore(user).catch(console.error);
        if (user.email === 'teshandilminde@gmail.com') {
          setIsAdmin(true);
          setCurrentPage('admin');
        } else {
          setIsAdmin(false);
          setCurrentPage('main');
        }
      } else {
        setCurrentPage('entry');
        setIsAdmin(false);
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = (email: string) => {
    if (email === 'teshandilminde@gmail.com') {
      setIsAdmin(true);
      setCurrentPage('admin');
    } else {
      setIsAdmin(false);
      setCurrentPage('main');
    }
  };

  if (isAuthLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black">
        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      </div>
    );
  }

  return (
    <>
      {currentPage === 'entry' && <Entry onLogin={handleLogin} />}
      {currentPage === 'main' && <Main isAdmin={isAdmin} />}
      {currentPage === 'admin' && <Admin />}
    </>
  );
}
