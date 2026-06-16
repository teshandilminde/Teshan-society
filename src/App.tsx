import { useState, useEffect } from 'react';
import { useDatabase } from './database';
import Entry from './pages/Entry';
import Main from './pages/Main';
import Admin from './pages/Admin';

export type Page = 'entry' | 'main' | 'admin';

export default function App() {
  const { currentUser, customLogout } = useDatabase();
  const [currentPage, setCurrentPage] = useState<Page>('entry');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.email === 'teshandilminde@gmail.com' || isAdmin) {
        setIsAdmin(true);
        setCurrentPage('admin');
      } else {
        setIsAdmin(false);
        setCurrentPage('main');
      }
    } else {
      if (!isAdmin) {
        setCurrentPage('entry');
      }
    }
  }, [currentUser, isAdmin]);

  const handleLogin = (email: string, asAdmin: boolean = false) => {
    if (asAdmin || email === 'teshandilminde@gmail.com') {
      setIsAdmin(true);
      setCurrentPage('admin');
    } else {
      setIsAdmin(false);
      setCurrentPage('main');
    }
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    customLogout();
    setCurrentPage('entry');
  };

  return (
    <>
      {currentPage === 'entry' && <Entry onLogin={handleLogin} />}
      {currentPage === 'main' && <Main isAdmin={isAdmin} />}
      {currentPage === 'admin' && <Admin onLogout={handleAdminLogout} />}
    </>
  );
}
