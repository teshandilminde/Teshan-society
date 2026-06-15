import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { signInWithGoogle } from '../firebase';

export default function Entry({ onLogin }: { onLogin: (email: string) => void }) {
  const [displayedText, setDisplayedText] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const fullText = "Teshan society";
  const TYPING_DURATION = 3000; // 3 seconds

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
      setShowLogin(true);
    }, TYPING_DURATION + 500);

    return () => {
      clearInterval(interval);
      clearTimeout(loginTimeout);
    };
  }, []);

  const handleGoogleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      const result = await signInWithGoogle();
      if (result && result.user) {
        onLogin(result.user.email || '');
      }
    } catch (error) {
      console.error("Login failed:", error);
      setIsLoggingIn(false);
    }
  };

  const renderText = () => {
    const teshan = displayedText.slice(0, 6);
    const space = displayedText.slice(6, 7);
    const society = displayedText.slice(7);

    return (
      <div className="flex items-baseline whitespace-nowrap overflow-hidden">
        <span className="font-serif text-5xl md:text-[72px] uppercase tracking-[0.15em] mr-2 md:mr-5">{teshan}</span>
        <span className="font-mono text-4xl md:text-[60px] font-normal">{society}</span>
      </div>
    );
  };

  return (
    <div className="flex relative min-h-screen w-full items-center justify-center bg-black p-4 font-sans text-white overflow-hidden">
      <div className="flex flex-col items-center justify-center z-10 w-full relative">
        <div className="flex items-center justify-center flex-row py-[20px] px-[20px] md:py-[40px] md:px-[80px] relative">
          <h1 className="flex items-center text-white m-0 p-0">
            {renderText()}
            {/* Square indicator blinking */}
            <motion.span
              animate={{ opacity: [1, 1, 0, 0] }}
              transition={{ repeat: Infinity, duration: 1, times: [0, 0.5, 0.5, 1], ease: "linear" }}
              className="inline-block w-[15px] h-[30px] md:w-[30px] md:h-[55px] bg-white ml-2 md:ml-[15px] rounded-sm align-middle"
            />
          </h1>
        </div>
        
        {/* Login Button */}
        {showLogin && (
          <motion.button 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            onClick={handleGoogleLogin}
            disabled={isLoggingIn}
            className={`mt-6 flex items-center gap-3 py-3 px-6 bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-md border border-white/10 border-t-white/30 border-l-white/20 rounded-[18px] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.2),inset_0_-2px_4px_rgba(255,255,255,0.05)] text-white transition-all duration-300 ${isLoggingIn ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/20'}`}
          >
            <svg className="w-5 h-5 opacity-90" viewBox="0 0 24 24">
              <path fill="currentColor" d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"/>
            </svg>
            <span className="font-mono text-sm tracking-widest uppercase mt-[2px]">{isLoggingIn ? 'Connecting...' : 'Continue with Google'}</span>
          </motion.button>
        )}
      </div>

      <div className="absolute bottom-10 w-full text-center font-mono text-[10px] uppercase tracking-[4px] opacity-30">
        pages/entry
      </div>
    </div>
  );
}
