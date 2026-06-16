import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Pen, LogOut, Camera, X, Loader2 } from 'lucide-react';
import { useDatabase } from '../database';

interface ProfileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileSidebar: React.FC<ProfileSidebarProps> = ({ isOpen, onClose }) => {
  const { currentUser, updateUserBio, customLogout } = useDatabase();
  
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(currentUser?.username || '');
  const [password, setPassword] = useState('');
  const [pfpUrl, setPfpUrl] = useState(currentUser?.pfpUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=guest`);
  const [isSaving, setIsSaving] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentUser && !isEditing) {
      setUsername(currentUser.username);
      setPfpUrl(currentUser.pfpUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${currentUser.uid}`);
    }
  }, [currentUser, isEditing]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentUser) {
      setIsSaving(true);
      try {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const dataUrl = event.target?.result as string;
          if (dataUrl) {
            await updateUserBio(username, dataUrl);
            setPfpUrl(dataUrl);
            setIsSaving(false);
          }
        };
        reader.onerror = () => {
          setIsSaving(false);
        };
        reader.readAsDataURL(file);
      } catch (err) {
        console.error(err);
        setIsSaving(false);
      }
    }
  };

  const handleSave = async () => {
    if (!currentUser) return;
    setIsSaving(true);
    try {
      await updateUserBio(username, pfpUrl, password || undefined);
      setIsEditing(false);
      setPassword('');
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const displayId = currentUser?.uid ? String(currentUser.uid).replace(/\D/g, '').slice(0, 3).padEnd(3, '0') : '000';

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
             <button onClick={onClose} className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors cursor-pointer">
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
                            <button onClick={() => setIsEditing(true)} className="text-white/30 hover:text-white transition-colors cursor-pointer">
                               <Pen className="w-4 h-4" />
                            </button>
                         </div>
                      </div>
                      <div className="flex items-center justify-between px-4 py-1 border-b border-white/10">
                         <span className="text-white/50 text-sm">Password</span>
                         <div className="flex items-center gap-3">
                            <span className="text-white font-mono tracking-widest">********</span>
                            <button onClick={() => setIsEditing(true)} className="text-white/30 hover:text-white transition-colors cursor-pointer">
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
                         className="w-full flex items-center justify-center p-4 bg-white text-black hover:bg-white/90 rounded-2xl font-bold transition-all disabled:opacity-50 cursor-pointer"
                      >
                         {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Changes"}
                      </button>
                      <button 
                         onClick={() => {
                            setIsEditing(false);
                            setUsername(currentUser?.username || '');
                            setPassword('');
                         }}
                         className="w-full flex items-center justify-center p-4 bg-transparent text-white/50 hover:text-white hover:bg-white/5 rounded-2xl transition-all cursor-pointer"
                      >
                         Cancel
                      </button>
                   </>
                ) : (
                   <button 
                      onClick={customLogout}
                      className="w-full flex items-center justify-center gap-2 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white/80 hover:text-white transition-all shadow-sm cursor-pointer"
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
