import { motion, AnimatePresence } from 'motion/react';
import { ListTodo, Folder, MessageSquare, ChevronUp, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useDatabase } from '../database';
import { Slide, getSlides } from '../db/slides';
import { DynamicSlide } from '../components/DynamicSlide';
import { Comments } from '../components/Comments';
import { ProfileSidebar } from '../components/ProfileSidebar';

interface MainProps {
  isAdmin: boolean;
}

export default function Main({ isAdmin }: MainProps) {
  const { currentUser } = useDatabase();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'main' | 'slides'>('main');

  const pfpUrl = currentUser?.pfpUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${currentUser?.uid || 'guest'}`;

  useEffect(() => {
    const unsubscribe = getSlides(isAdmin, (loaded) => {
      setSlides(loaded);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  const totalSlides = slides.length;
  const currentSlideData = slides[currentSlide];

  const handleNext = () => {
    if (currentSlide < totalSlides - 1) setCurrentSlide(prev => prev + 1);
  };

  const handlePrev = () => {
    if (currentSlide > 0) setCurrentSlide(prev => prev - 1);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      className="relative h-screen w-full bg-black text-white font-sans overflow-hidden"
    >
      <AnimatePresence mode="wait">
        {activeTab === 'main' ? (
          <motion.div
            key="main-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full absolute inset-0"
          >
            <motion.div 
              className="w-full"
              animate={{ y: `-${currentSlide * 100}vh` }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            >
              {slides.length === 0 ? (
                 <div className="h-screen w-full flex items-center justify-center">
                   <h1 className="text-4xl font-serif text-white/30">No Slides Available</h1>
                 </div>
              ) : (
                slides.map((slide) => (
                   <div key={slide.id} className="h-screen w-full overflow-y-auto overflow-x-hidden scrollbar-hide">
                     <div className="min-h-full w-full flex items-center justify-center">
                       {slide.code ? (
                          <DynamicSlide code={slide.code} />
                       ) : (
                          <h1 className="text-4xl font-serif text-white/30">{slide.name || 'Untitled'}</h1>
                       )}
                     </div>
                   </div>
                ))
              )}
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="slides-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full absolute inset-0 flex flex-col items-center p-8 overflow-y-auto pb-32 scrollbar-hide"
          >
            <div className="absolute top-8 right-8 z-50">
              <button 
                onClick={() => setIsProfileOpen(true)}
                className="w-14 h-14 bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-md border border-white/10 border-t-white/30 border-l-white/20 rounded-full shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.2),inset_0_-2px_4px_rgba(255,255,255,0.05)] transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center overflow-hidden p-1"
                title="Profile"
              >
                <div className="w-full h-full rounded-full overflow-hidden bg-black">
                  <img src={pfpUrl} alt="pfp" className="w-full h-full object-cover" />
                </div>
              </button>
            </div>
            <h1 className="text-2xl font-serif text-white/50 tracking-widest mb-12">All Slides</h1>
            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
              {slides.map((slide, i) => (
                <button
                  key={slide.id}
                  onClick={() => {
                    setCurrentSlide(i);
                    setActiveTab('main');
                  }}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-6 text-left transition-all duration-300 backdrop-blur-md group"
                >
                  <h3 className="text-lg font-medium text-white mb-2">{slide.name || `Slide ${i + 1}`}</h3>
                  <p className="text-white/50 text-sm">Type: {slide.type}</p>
                </button>
              ))}
              {slides.length === 0 && (
                <p className="text-white/30 col-span-full text-center py-12">No slides created yet.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {currentSlideData && activeTab === 'main' && (
        <Comments 
          slideId={currentSlideData.id} 
          isOpen={isCommentsOpen} 
          onClose={() => setIsCommentsOpen(false)} 
        />
      )}

      <div className="fixed bottom-8 left-0 right-0 z-50 flex justify-center items-center gap-2 pointer-events-none px-4">
        <AnimatePresence>
          {currentSlideData?.commentsEnabled && !isCommentsOpen && activeTab === 'main' && (
            <motion.div
               initial={{ opacity: 0, scale: 0.8 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.8 }}
               className="md:fixed md:left-10 md:top-1/2 md:-translate-y-1/2 flex-shrink-0"
            >
              <button 
                onClick={() => setIsCommentsOpen(true)}
                className="pointer-events-auto w-[60px] h-[60px] md:w-auto md:h-auto md:p-4 flex items-center justify-center bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-md border border-white/10 border-t-white/30 border-l-white/20 rounded-full shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.2),inset_0_-2px_4px_rgba(255,255,255,0.05)] transition-all duration-300 hover:bg-white/20 hover:scale-105 active:scale-95 group relative"
              >
                <MessageSquare className="w-4 h-4 md:w-6 md:h-6 text-white relative z-10" strokeWidth={1.5} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="pointer-events-auto flex items-center p-1.5 bg-white-[0.02] backdrop-blur-xl border border-white/10 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex-shrink-0">
          <button 
            onClick={() => setActiveTab('main')}
            className={`relative p-3 w-12 h-12 rounded-full transition-colors duration-500 flex items-center justify-center ${activeTab === 'main' ? 'text-white' : 'text-white/40 hover:text-white/80'}`}
          >
            {activeTab === 'main' && (
              <motion.div
                layoutId="nav-pill"
                className="absolute inset-0 bg-white/20 rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]"
                transition={{ type: "spring", stiffness: 300, damping: 30, duration: 0.5 }}
              />
            )}
            <ListTodo size={20} strokeWidth={1.5} className="relative z-10" />
          </button>
          
          <button 
            onClick={() => setActiveTab('slides')}
            className={`relative p-3 w-12 h-12 rounded-full transition-colors duration-500 flex items-center justify-center ${activeTab === 'slides' ? 'text-white' : 'text-white/40 hover:text-white/80'}`}
          >
            {activeTab === 'slides' && (
              <motion.div
                layoutId="nav-pill"
                className="absolute inset-0 bg-white/20 rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]"
                transition={{ type: "spring", stiffness: 300, damping: 30, duration: 0.5 }}
              />
            )}
            <Folder size={20} strokeWidth={1.5} className="relative z-10" />
          </button>
        </div>

        <AnimatePresence>
          {activeTab === 'main' && (
            <motion.div 
               initial={{ opacity: 0, scale: 0.8 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.8 }}
               className="flex gap-2 md:fixed md:right-10 md:top-1/2 md:-translate-y-1/2 md:flex-col md:gap-4 pointer-events-none flex-shrink-0"
            >
              <button 
                onClick={handlePrev}
                disabled={currentSlide === 0}
                className={`pointer-events-auto w-[60px] h-[60px] md:w-auto md:h-auto md:p-4 flex items-center justify-center bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-md border border-white/10 border-t-white/30 border-l-white/20 rounded-full shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.2),inset_0_-2px_4px_rgba(255,255,255,0.05)] transition-all duration-300 ${currentSlide === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/20 active:scale-95 group relative'}`}
              >
                <ChevronUp className="w-4 h-4 md:w-6 md:h-6 text-white relative z-10" strokeWidth={1.5} />
              </button>
              <button 
                onClick={handleNext}
                disabled={currentSlide === totalSlides - 1}
                className={`pointer-events-auto w-[60px] h-[60px] md:w-auto md:h-auto md:p-4 flex items-center justify-center bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-md border border-white/10 border-t-white/30 border-l-white/20 rounded-full shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.2),inset_0_-2px_4px_rgba(255,255,255,0.05)] transition-all duration-300 ${currentSlide === totalSlides - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/20 active:scale-95 group relative'}`}
              >
                <ChevronDown className="w-4 h-4 md:w-6 md:h-6 text-white relative z-10" strokeWidth={1.5} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="fixed bottom-3 w-full text-center font-mono text-[10px] uppercase tracking-[4px] opacity-30 pointer-events-none z-40">
        pages/{activeTab}
      </div>

      <ProfileSidebar isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </motion.div>
  );
}
