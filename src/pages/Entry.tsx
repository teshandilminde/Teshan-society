import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Hexagon, ArrowRight, Loader2, Pen } from 'lucide-react';
import { useDatabase } from '../database';

interface EntryProps {
  onLogin: (email: string, asAdmin?: boolean) => void;
}

export default function Entry({ onLogin }: EntryProps) {
  const { loginOrRegister } = useDatabase();
  const [displayedText, setDisplayedText] = useState("");
  const [uiMode, setUiMode] = useState<'hidden' | 'button' | 'login' | 'admin_input' | 'admin_ready'>('hidden');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
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

  const handleUserLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setIsLoggingIn(true);
    setErrorMsg('');

    try {
      const user = await loginOrRegister(email, password);
      onLogin(user.email);
    } catch (error: any) {
      setErrorMsg(error.message || "Error logging in.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const renderText = () => {
    const t = displayedText.slice(0, 1);
    const eshan = displayedText.slice(1, 6);
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
                       <div className="absolute top-5 left-1/2 -translate-x-1/2 flex items-center justify-center">
                          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 10, ease: "linear" }}>
                            <Hexagon className="w-6 h-6 opacity-80" />
                          </motion.div>
                       </div>
                       
                       <form onSubmit={handleUserLogin} className="w-full flex flex-col gap-6 relative mt-4">
                          <div className="flex flex-col gap-4 w-full mt-2">
                             <div className="w-full flex flex-col items-start relative group">
                                <label className="text-[10px] uppercase tracking-widest text-white/50 mb-1 transition-colors group-focus-within:text-white/80">Email</label>
                                <input 
                                   type="email" 
                                   required
                                   value={email}
                                   onChange={(e) => setEmail(e.target.value)}
                                   className="w-full bg-transparent border-b border-white/20 py-2 outline-none focus:border-white/60 text-sm transition-colors text-white"
                                />
                             </div>
                             <div className="w-full flex flex-col items-start relative group mt-2">
                                <label className="text-[10px] uppercase tracking-widest text-white/50 mb-1 transition-colors group-focus-within:text-white/80">Password</label>
                                <input 
                                   type="password" 
                                   value={password}
                                   required
                                   onChange={(e) => setPassword(e.target.value)}
                                   className="w-full bg-transparent border-b border-white/20 py-2 outline-none focus:border-white/60 text-sm font-mono tracking-widest transition-colors text-white"
                                />
                             </div>
                          </div>

                          <div className="mt-6 flex justify-center w-full relative">
                             <button 
                                type="submit"
                                disabled={isLoggingIn || !email || !password}
                                className="px-6 py-2.5 rounded-full bg-white text-black hover:bg-white/90 font-bold transition-all disabled:opacity-50 flex items-center justify-center text-xs uppercase tracking-widest gap-2 shadow-[0_0_20px_rgba(255,255,255,0.15)] mx-auto cursor-pointer"
                             >
                                {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
                             </button>
                          </div>
                       </form>

                       {errorMsg && (
                          <div className="mt-4 text-[10px] text-red-400 bg-red-500/10 border border-red-500/25 rounded-xl p-3 text-start leading-relaxed flex flex-col gap-1">
                             <span className="font-bold uppercase tracking-wider text-red-300">Auth status:</span>
                             <span className="opacity-90">{errorMsg}</span>
                          </div>
                       )}
                    </motion.div>
                )}

                {uiMode === 'button' && (
                    <div className="w-full h-full flex items-center justify-center gap-3">
                       <motion.div layoutId="icon-container" className="flex items-center justify-center">
                          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 10, ease: "linear" }}>
                            <Hexagon className="w-5 h-5 opacity-90" />
                          </motion.div>
                       </motion.div>
                       <motion.span layoutId="continue-text" className="font-mono text-sm tracking-widest uppercase mt-[2px] whitespace-nowrap">
                         Continue (Sign In / Log In)
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
