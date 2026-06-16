import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Hexagon, Camera, ArrowRight, Loader2, Pen } from 'lucide-react';
import { auth, storage, db, signInWithGoogle } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { setDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';

export default function Entry({ onLogin }: { onLogin: (email: string, asAdmin?: boolean) => void }) {
  const [displayedText, setDisplayedText] = useState("");
  type UIMode = 'hidden' | 'button' | 'login' | 'admin_input' | 'admin_ready';
  const [uiMode, setUiMode] = useState<UIMode>('hidden');
  
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pfpFile, setPfpFile] = useState<File | null>(null);
  const [pfpPreview, setPfpPreview] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Admin backdoor state
  const [tClicks, setTClicks] = useState(0);
  const [lastTClick, setLastTClick] = useState(0);
  const [passcodeInput, setPasscodeInput] = useState('');

  const fullText = "Teshan society";
  const TYPING_DURATION = 3000;

  useEffect(() => {
    let currentIndex = 0;
    const intervalTime = TYPING_DURATION / fullText.length;

    const interval = setInterval(() => {
      currentIndex++;
      setDisplayedText(fullText.slice(0, currentIndex));
      if (currentIndex >= fullText.length) {
        clearInterval(interval);
      }
    }, intervalTime);

    const loginTimeout = setTimeout(() => {
      setUiMode('button');
    }, TYPING_DURATION + 500);

    return () => {
      clearInterval(interval);
      clearTimeout(loginTimeout);
    };
  }, []);

  const handleTClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    if (now - lastTClick > 3000) {
      setTClicks(1);
    } else {
      const next = tClicks + 1;
      setTClicks(next);
      if (next >= 4) {
        setUiMode('admin_input');
        setTClicks(0);
        setPasscodeInput('');
      }
    }
    setLastTClick(now);
  };

  const handlePasscodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
    setPasscodeInput(val);
    if (val === '1248') {
      setUiMode('admin_ready');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setPfpFile(file);
      const url = URL.createObjectURL(file);
      setPfpPreview(url);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setErrorMsg('');
    try {
      const result = await signInWithGoogle();
      if (result?.user) {
        onLogin(result.user.email || '');
      }
    } catch (error: any) {
      console.error("Google login failed", error);
      setErrorMsg(error.message || "Failed to log in with Google.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGuestLogin = () => {
    setIsLoggingIn(true);
    setErrorMsg('');
    setTimeout(() => {
      onLogin('guest@teshansociety.com');
      setIsLoggingIn(false);
    }, 600);
  };

  const handleUserLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    
    setIsLoggingIn(true);
    setErrorMsg('');
    const hexPassword = password.split('').map(c => c.charCodeAt(0).toString(16)).join('');
    // Ensure email is not empty and conforms to basic structure
    const mockEmail = `user_${hexPassword || 'default'}@teshansociety.com`;
    const mockPassword = password + "teshan123";

    try {
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, mockEmail, mockPassword);
      } catch (err: any) {
        if (
          err.code === 'auth/user-not-found' || 
          err.code === 'auth/invalid-credential' ||
          err.code === 'auth/invalid-login-credentials' ||
          err.code === 'auth/wrong-password' ||
          err.code === 'auth/invalid-email'
        ) {
          try {
            userCredential = await createUserWithEmailAndPassword(auth, mockEmail, mockPassword);
          } catch (createErr: any) {
            if (createErr.code === 'auth/email-already-in-use') {
              // Try to log in again, maybe someone else created it?
              userCredential = await signInWithEmailAndPassword(auth, mockEmail, mockPassword);
            } else if (createErr.code === 'auth/operation-not-allowed') {
                throw new Error("Email/Password Auth is disabled in Firebase console. Use Sign in with Google or Continue as Guest.");
            } else {
              throw createErr;
            }
          }
        } else if (err.code === 'auth/operation-not-allowed') {
            throw new Error("Email/Password Auth is disabled in Firebase console. Use Sign in with Google or Continue as Guest.");
        } else {
          throw err;
        }
      }

      const user = userCredential.user;
      let finalPfpUrl = user.photoURL;

      // Upload new PFP if provided
      if (pfpFile) {
        const pfpRef = ref(storage, `pfps/${user.uid}_${Date.now()}`);
        await uploadBytes(pfpRef, pfpFile);
        finalPfpUrl = await getDownloadURL(pfpRef);
      } else if (!finalPfpUrl) {
         // check if returning user has a pfp
         const docSnap = await getDoc(doc(db, 'users', user.uid));
         if (docSnap.exists() && docSnap.data().photoURL) {
            finalPfpUrl = docSnap.data().photoURL;
         } else {
            finalPfpUrl = `https://api.dicebear.com/7.x/shapes/svg?seed=${user.uid}`;
         }
      }
      
      const docSnap = await getDoc(doc(db, 'users', user.uid));
      const existingData = docSnap.exists() ? docSnap.data() : {};
      const newUsername = username || existingData.displayName || `user_${password.slice(0,4)}`;

      // Update auth profile
      await updateProfile(user, {
        displayName: newUsername,
        photoURL: finalPfpUrl || ""
      });

      // Update users collection
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        displayName: newUsername,
        photoURL: finalPfpUrl || null,
        uid: user.uid,
        lastLogin: serverTimestamp(),
        createdAt: existingData.createdAt || serverTimestamp()
      }, { merge: true });

      onLogin(user.email || '');

    } catch (error: any) {
      console.error("Login Error:", error);
      setErrorMsg(error.message || "Error logging in. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const renderText = () => {
    const t = displayedText.slice(0, 1);
    const eshan = displayedText.slice(1, 6);
    const space = displayedText.slice(6, 7);
    const society = displayedText.slice(7);

    return (
      <div className="flex items-baseline whitespace-nowrap overflow-hidden">
        <span className="font-serif text-5xl md:text-[72px] uppercase tracking-[0.15em] mr-2 md:mr-5 pointer-events-auto">
          <span onClick={handleTClick} className="cursor-pointer select-none">{t}</span>
          {eshan}
        </span>
        <span className="font-mono text-4xl md:text-[60px] font-normal">{society}</span>
      </div>
    );
  };

  return (
    <div 
      className="flex flex-col relative min-h-screen w-full bg-black font-sans text-white overflow-hidden items-center justify-start pt-[12vh] md:pt-[15vh]"
      onClick={() => {
        if (uiMode !== 'hidden' && uiMode !== 'button') {
          setUiMode('button');
          setPasscodeInput('');
          setErrorMsg('');
        }
      }}
    >
      
      <div className="w-full flex justify-center items-center z-10 pointer-events-none px-4 mb-20 md:mb-28 shrink-0">
        <h1 className="flex items-center text-white m-0 p-0">
          {renderText()}
          <motion.span
            animate={{ opacity: [1, 1, 0, 0] }}
            transition={{ repeat: Infinity, duration: 1, times: [0, 0.5, 0.5, 1], ease: "linear" }}
            className="inline-block w-[15px] h-[30px] md:w-[30px] md:h-[55px] bg-white ml-2 md:ml-[15px] rounded-sm align-middle"
          />
        </h1>
      </div>

      <div className="left-0 right-0 flex justify-center z-20 items-start w-full relative">
        <div className="relative w-[200px] h-[52px]">
          <AnimatePresence>
            {uiMode === 'button' && (
              <motion.button
                key="admin-button"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.5 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setUiMode('admin_input');
                }}
                className="absolute right-full mr-8 top-0 w-[52px] h-[52px] rounded-full bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer z-10 shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
                title="Admin Passcode Entry"
              >
                <Pen className="w-5 h-5" />
              </motion.button>
            )}
            
            {uiMode !== 'hidden' && (
              <motion.div 
                key="main-container"
                layout
                style={{ originY: 0 }}
                initial={{ opacity: 0, y: 0 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, type: "spring", bounce: 0.05 }}
                className={`
                  absolute top-0 left-1/2 -translate-x-1/2
                  bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-md 
                  border border-white/10 border-t-white/30 border-l-white/20 
                  shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.2),inset_0_-2px_4px_rgba(255,255,255,0.05)] 
                  text-white z-20
                  ${uiMode === 'login' ? 'rounded-[32px] w-[90vw] md:w-[400px] p-8 pt-16 pb-10 flex flex-col' : 'rounded-[18px] cursor-pointer w-full h-[52px] flex items-center justify-center overflow-hidden'}
                `}
                onClick={(e) => {
                    e.stopPropagation();
                    if (uiMode === 'button') setUiMode('login');
                }}
              >
                
                {uiMode === 'login' && (
                    <motion.div 
                      className="w-full flex flex-col"
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1, duration: 0.4 }}
                    >
                       <motion.span layoutId="continue-text" className="absolute top-6 left-1/2 -translate-x-1/2 font-mono text-sm tracking-widest uppercase opacity-50 whitespace-nowrap">
                         Continue
                       </motion.span>
                       
                       <form onSubmit={handleUserLogin} className="w-full flex md:block flex-col gap-6 relative mt-4">
                          <div className="flex flex-col md:flex-row gap-6 md:items-center w-full">
                             <div className="flex flex-col items-center gap-2 md:shrink-0 relative">
                                <motion.div 
                                   layoutId="icon-container"
                                   onClick={() => fileInputRef.current?.click()}
                                   className="w-20 h-20 md:w-20 md:h-20 rounded-full border border-white/20 flex items-center justify-center bg-white/5 cursor-pointer overflow-hidden relative group shrink-0"
                                >
                                   {pfpPreview ? (
                                      <img src={pfpPreview} alt="pfp" className="w-full h-full object-cover" />
                                   ) : (
                                      <Camera className="w-6 h-6 text-white/50 group-hover:text-white transition-colors" />
                                   )}
                                   <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                      <Camera className="w-5 h-5 text-white" />
                                   </div>
                                </motion.div>
                                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                             </div>

                             <div className="flex flex-col flex-1 gap-2 w-full mt-2">
                                <div className="w-full flex flex-col items-start relative group">
                                   <label className="text-[10px] uppercase tracking-widest text-white/50 mb-1 transition-colors group-focus-within:text-white/80">Username (Optional)</label>
                                   <input 
                                      type="text" 
                                      value={username}
                                      onChange={(e) => setUsername(e.target.value)}
                                      className="w-full bg-transparent border-b border-white/20 py-2 outline-none focus:border-white/60 text-sm transition-colors text-white"
                                   />
                                </div>
                                <div className="w-full flex flex-col items-start relative group mt-2">
                                   <label className="text-[10px] uppercase tracking-widest text-white/50 mb-1 transition-colors group-focus-within:text-white/80">Password (Required)</label>
                                   <input 
                                      type="password" 
                                      value={password}
                                      required
                                      onChange={(e) => setPassword(e.target.value)}
                                      className="w-full bg-transparent border-b border-white/20 py-2 outline-none focus:border-white/60 text-sm font-mono tracking-widest transition-colors text-white"
                                   />
                                </div>
                             </div>
                          </div>

                          <div className="mt-8 flex justify-center w-full relative">
                             <button 
                                type="submit"
                                disabled={isLoggingIn || !password}
                                className="px-6 py-2 rounded-full bg-white text-black hover:bg-white/90 font-bold transition-all disabled:opacity-50 flex items-center justify-center text-xs uppercase tracking-widest gap-2 shadow-[0_0_20px_rgba(255,255,255,0.15)] mx-auto cursor-pointer"
                             >
                                {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
                             </button>
                          </div>
                       </form>

                       {errorMsg && (
                          <div id="login-error-display" className="mt-4 text-[10px] text-red-400 bg-red-500/10 border border-red-500/25 rounded-xl p-3 text-start leading-relaxed flex flex-col gap-1">
                             <span className="font-bold uppercase tracking-wider text-red-300">Firebase Auth status:</span>
                             <span className="opacity-90">{errorMsg}</span>
                          </div>
                       )}

                       <div className="relative flex items-center justify-center my-5">
                          <div className="absolute inset-0 flex items-center" aria-hidden="true">
                             <div className="w-full border-t border-white/10" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                             <span className="bg-[#151515] px-2.5 text-white/45 text-[9px] tracking-[3px] font-mono">or continue with</span>
                          </div>
                       </div>

                       <div className="flex flex-col gap-2.5 w-full">
                          <button 
                             type="button"
                             onClick={handleGoogleLogin}
                             disabled={isLoggingIn}
                             className="w-full px-4 py-2.5 rounded-full border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white font-medium transition-all text-xs tracking-wider flex items-center justify-center gap-2.5 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                          >
                             <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                             </svg>
                             Google Login
                          </button>

                          <button 
                             type="button"
                             onClick={handleGuestLogin}
                             disabled={isLoggingIn}
                             className="w-full px-4 py-2.5 rounded-full border border-white/5 hover:border-white/10 bg-transparent hover:bg-white/5 text-white/55 hover:text-white font-medium transition-all text-xs tracking-wider flex items-center justify-center gap-1 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                          >
                             Continue as Guest
                          </button>
                       </div>
                    </motion.div>
                )}

                {uiMode === 'button' && (
                    <div className="w-full h-full flex items-center justify-center gap-3 space-x-2">
                       <motion.div layoutId="icon-container" className="flex items-center justify-center">
                          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 10, ease: "linear" }}>
                            <Hexagon className="w-5 h-5 opacity-90" />
                          </motion.div>
                       </motion.div>
                       <motion.span layoutId="continue-text" className="font-mono text-sm tracking-widest uppercase mt-[2px] whitespace-nowrap">
                         Continue
                       </motion.span>
                    </div>
                )}

                {uiMode === 'admin_input' && (
                    <div className="w-full h-full flex items-center justify-center">
                       <input 
                          autoFocus
                          type="text"
                          value={passcodeInput}
                          onChange={handlePasscodeChange}
                          onBlur={() => setUiMode('button')}
                          className="w-full h-full text-center bg-transparent outline-none font-mono text-xl tracking-[0.4em] text-white"
                          maxLength={4}
                       />
                    </div>
                )}

                {uiMode === 'admin_ready' && (
                    <button 
                      onClick={() => onLogin('admin', true)}
                      className="w-full h-full flex items-center justify-center focus:outline-none"
                    >
                       <span className="font-mono text-xl tracking-[0.4em] text-white">{passcodeInput}</span>
                    </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="absolute bottom-10 w-full text-center font-mono text-[10px] uppercase tracking-[4px] opacity-30 pointer-events-none">
        pages/entry
      </div>
    </div>
  );
}
