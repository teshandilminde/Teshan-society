import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Pen, LogOut, Camera, X, Loader2 } from 'lucide-react';
import { auth, storage, db, signOutUser } from '../firebase';
import { updateProfile, updateEmail, updatePassword } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface ProfileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileSidebar: React.FC<ProfileSidebarProps> = ({ isOpen, onClose }) => {
  const user = auth.currentUser;
  
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(user?.displayName || '');
  const [password, setPassword] = useState('');
  const [pfpUrl, setPfpUrl] = useState(user?.photoURL || `https://api.dicebear.com/7.x/shapes/svg?seed=${user?.uid}`);
  const [isSaving, setIsSaving] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user && !isEditing) {
      setUsername(user.displayName || '');
      setPfpUrl(user.photoURL || `https://api.dicebear.com/7.x/shapes/svg?seed=${user.uid}`);
    }
  }, [user, isEditing]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
      try {
        setIsSaving(true);
        const pfpRef = ref(storage, `pfps/${user.uid}_${Date.now()}`);
        await uploadBytes(pfpRef, file);
        const url = await getDownloadURL(pfpRef);
        await updateProfile(user, { photoURL: url });
        await setDoc(doc(db, 'users', user.uid), { photoURL: url }, { merge: true });
        setPfpUrl(url);
      } catch (err) {
        console.error("Error updating image", err);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      // Update Username
      if (username !== user.displayName) {
        await updateProfile(user, { displayName: username });
        await setDoc(doc(db, 'users', user.uid), { displayName: username }, { merge: true });
      }
      
      // Update Password (mock email + mock password)
      if (password.trim() !== '') {
        const newEmail = `${password.toLowerCase().replace(/[^a-z0-9]/g, '') || 'default'}@teshan.society`;
        const newPassword = password + "teshan123";
        try {
          await updateEmail(user, newEmail);
          await updatePassword(user, newPassword);
          await setDoc(doc(db, 'users', user.uid), { email: newEmail }, { merge: true });
        } catch (authErr: any) {
           if (authErr.code === 'auth/requires-recent-login') {
             alert("Please logout and login again to change your password.");
           } else {
             console.error(authErr);
           }
        }
      }
      
      setIsEditing(false);
      setPassword('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const displayId = user?.uid ? String(user.uid).replace(/\D/g, '').slice(0, 3).padEnd(3, '0') : '000';

  return (
    <AnimatePresence>
      {isOpen && <motion.div 
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
          />}
      {isOpen && <motion.div
            key="sidebar"
            initial={{ y: window.innerWidth < 768 ? '100%' : 0, x: window.innerWidth >= 768 ? '100%' : 0 }}
            animate={{ y: 0, x: 0 }}
            exit={{ y: window.innerWidth < 768 ? '100%' : 0, x: window.innerWidth >= 768 ? '100%' : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed z-[70] bg-[#0a0a0a]/95 backdrop-blur-xl border-white/10 shadow-2xl flex flex-col items-center pt-8 md:pt-12 px-6 pb-12
              w-full h-auto bottom-0 rounded-t-[32px] border-t
              md:w-[400px] md:h-full md:top-0 md:bottom-auto md:right-0 md:rounded-tl-[32px] md:rounded-bl-[32px] md:rounded-tr-none md:border-t-0 md:border-l
            "
          >
             <button onClick={onClose} className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors">
               <X className="w-6 h-6" />
             </button>

             <h2 className="text-xl font-bold text-white mb-8">Your profile</h2>

             <div className="relative group mb-4">
                <div 
                   onClick={() => fileInputRef.current?.click()}
                   className="w-24 h-24 rounded-full border border-white/20 flex items-center justify-center bg-white/5 cursor-pointer overflow-hidden relative shadow-lg"
                >
                   {isSaving && !isEditing ? (
                      <Loader2 className="w-8 h-8 animate-spin text-white/50" />
                   ) : (
                      <img src={pfpUrl} alt="profile" className="w-full h-full object-cover" />
                   )}
                   <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Camera className="w-6 h-6 text-white" />
                   </div>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
             </div>

             <div className="text-white/40 font-mono text-sm tracking-widest mb-8">
               {displayId}
             </div>

             <div className="w-full flex-1 flex flex-col gap-6 mb-8">
                {isEditing ? (
                   <div className="w-full flex flex-col gap-4">
                      <input 
                         type="text"
                         value={username}
                         onChange={(e) => setUsername(e.target.value)}
                         placeholder="Username"
                         className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-white/30 text-white transition-colors text-center"
                      />
                      <input 
                         type="password"
                         value={password}
                         onChange={(e) => setPassword(e.target.value)}
                         placeholder="New Password (Optional)"
                         className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-white/30 text-white font-mono tracking-widest transition-colors text-center"
                      />
                   </div>
                ) : (
                   <div className="w-full flex flex-col gap-6">
                      <div className="flex items-center justify-between px-4 py-1 border-b border-white/10">
                         <span className="text-white/50 text-sm">Username</span>
                         <div className="flex items-center gap-3">
                            <span className="text-white">{username}</span>
                            <button onClick={() => setIsEditing(true)} className="text-white/30 hover:text-white transition-colors">
                               <Pen className="w-4 h-4" />
                            </button>
                         </div>
                      </div>
                      <div className="flex items-center justify-between px-4 py-1 border-b border-white/10">
                         <span className="text-white/50 text-sm">Password</span>
                         <div className="flex items-center gap-3">
                            <span className="text-white font-mono tracking-widest">********</span>
                            <button onClick={() => setIsEditing(true)} className="text-white/30 hover:text-white transition-colors">
                               <Pen className="w-4 h-4" />
                            </button>
                         </div>
                      </div>
                   </div>
                )}
             </div>

             <div className="w-full flex flex-col gap-3 mt-auto">
                {isEditing ? (
                   <>
                      <button 
                         onClick={handleSave}
                         disabled={isSaving}
                         className="w-full flex items-center justify-center p-4 bg-white text-black hover:bg-white/90 rounded-2xl font-bold transition-all disabled:opacity-50"
                      >
                         {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Changes"}
                      </button>
                      <button 
                         onClick={() => {
                            setIsEditing(false);
                            setUsername(user?.displayName || '');
                            setPassword('');
                         }}
                         className="w-full flex items-center justify-center p-4 bg-transparent text-white/50 hover:text-white hover:bg-white/5 rounded-2xl transition-all"
                      >
                         Cancel
                      </button>
                   </>
                ) : (
                   <button 
                      onClick={() => signOutUser()}
                      className="w-full flex items-center justify-center gap-2 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white/80 hover:text-white transition-all shadow-sm"
                   >
                      <LogOut className="w-5 h-5" />
                      <span>Log Out</span>
                   </button>
                )}
             </div>
          </motion.div>}
    </AnimatePresence>
  );
};

