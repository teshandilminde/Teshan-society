import { motion, AnimatePresence } from 'motion/react';
import { Plus, Folder as FolderIcon, Book, Star, MoreVertical, Globe, Lock, MessageSquare, ChevronUp, ChevronDown, Pen, Check, Upload, Trash2, LogOut, Loader2 } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';
import { Slide, getSlides, saveSlide, saveSlides, deleteSlide } from '../db/slides';
import { signOutUser, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

type SlideType = 'project' | 'skill' | 'animation' | 'other';
type Privacy = 'public' | 'private';

export default function Admin() {
  const [slides, setSlides] = useState<Slide[]>([]);

  useEffect(() => {
    const unsubscribe = getSlides(true, (loaded) => {
      setSlides(loaded);
    });
    return () => unsubscribe();
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState<Slide | null>(null);

  const [slideName, setSlideName] = useState('');
  const [slideType, setSlideType] = useState<SlideType>('project');
  const [slidePrivacy, setSlidePrivacy] = useState<Privacy>('public');
  const [commentsOn, setCommentsOn] = useState(true);
  const [fileUploaded, setFileUploaded] = useState(false);
  const [slideCode, setSlideCode] = useState<string>('');
  
  const [isUploadingFolder, setIsUploadingFolder] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const getTypeIcon = (type: SlideType, size = 16) => {
    switch(type) {
      case 'project': return <FolderIcon size={size} />;
      case 'skill': return <Book size={size} />;
      case 'animation': return <Star size={size} />;
      case 'other': return <MoreVertical size={size} />;
    }
  };

  const getPrivacyIcon = (privacy: Privacy, size = 16) => {
    return privacy === 'public' ? <Globe size={size} /> : <Lock size={size} />;
  };

  const handleOpenAdd = () => {
    setEditingSlide(null);
    setSlideName('');
    setSlideType('project');
    setSlidePrivacy('public');
    setCommentsOn(true);
    setFileUploaded(false);
    setSlideCode('');
    setUploadProgress(0);
    setIsUploadingFolder(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (slide: Slide) => {
    setEditingSlide(slide);
    setSlideName(slide.name);
    setSlideType(slide.type as SlideType);
    setSlidePrivacy(slide.privacy as Privacy);
    setCommentsOn(slide.commentsEnabled);
    if (slide.code) {
      setFileUploaded(true);
      setSlideCode(slide.code);
    } else {
      setFileUploaded(false);
      setSlideCode('');
    }
    setUploadProgress(0);
    setIsUploadingFolder(false);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingSlide) {
      const newSlide: Slide = {
        id: Date.now().toString(),
        order: slides.length + 1,
        type: slideType,
        name: slideName || 'Untitled Slide',
        privacy: slidePrivacy,
        commentsEnabled: commentsOn,
        commentsCount: 0,
        code: slideCode
      };
      await saveSlide(newSlide);
    } else {
      await saveSlide({
        ...editingSlide,
        name: slideName,
        type: slideType,
        privacy: slidePrivacy,
        commentsEnabled: commentsOn,
        code: slideCode
      });
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this slide?")) {
      await deleteSlide(id);
    }
  };

  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploadingFolder(true);
    setUploadProgress(0);
    
    const files = Array.from(e.target.files) as File[];
    let tsxFile: File | null = null;
    const assetFiles: File[] = [];

    for (const file of files) {
      if (file.name.endsWith('.tsx')) {
        if (!tsxFile) tsxFile = file; // Pick the first tsx file
      } else if (!file.name.endsWith('.DS_Store')) {
        assetFiles.push(file);
      }
    }

    if (!tsxFile) {
      alert("No .tsx file found in the selected folder.");
      setIsUploadingFolder(false);
      return;
    }

    const urlMapping: Record<string, string> = {};
    let uploadedCount = 0;
    
    for (const file of assetFiles) {
      const storageRef = ref(storage, `slide_assets/${Date.now()}_${file.name}`);
      try {
        await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(storageRef);
        urlMapping[file.name] = downloadUrl;
        
        // Also map relative path forms
        if (file.webkitRelativePath) {
            urlMapping[file.webkitRelativePath] = downloadUrl;
            // e.g. "./image.png"
            urlMapping[`./${file.name}`] = downloadUrl;
        }
      } catch (err) {
        console.error("Error uploading", file.name, err);
      }
      uploadedCount++;
      setUploadProgress(Math.round((uploadedCount / assetFiles.length) * 100));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      let code = event.target?.result as string;
      
      // Replace file names in code with firebase URLs
      for (const [originalPath, url] of Object.entries(urlMapping)) {
        code = code.split(`"${originalPath}"`).join(`"${url}"`);
        code = code.split(`'${originalPath}'`).join(`'${url}'`);
        
        const filename = originalPath.split('/').pop();
        if (filename && filename !== originalPath) {
            code = code.split(`"${filename}"`).join(`"${url}"`);
            code = code.split(`'${filename}'`).join(`'${url}'`);
        }
      }
      
      setSlideCode(code);
      if (!slideName) setSlideName(tsxFile!.name.replace('.tsx', ''));
      setFileUploaded(true);
      setIsUploadingFolder(false);
    };
    reader.readAsText(tsxFile);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      className="relative min-h-screen w-full bg-black text-white font-sans overflow-hidden"
    >
      <div className="max-w-4xl mx-auto px-8 py-16 h-screen overflow-y-auto w-full pb-32">
         <h1 className="text-2xl font-serif text-white/50 tracking-widest">I. Admin Page</h1>
         <div className="w-full h-[1px] bg-white/10 my-6"></div>

         <div className="flex justify-between items-center mb-10">
            <h2 className="text-3xl font-bold">Manage</h2>
            <div className="flex gap-4">
               <button 
                  onClick={handleOpenAdd}
                  className="p-3 bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-md border border-white/10 border-t-white/30 border-l-white/20 rounded-[18px] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.2),inset_0_-2px_4px_rgba(255,255,255,0.05)] transition-all duration-300 hover:bg-white/20 active:scale-95"
               >
                  <Plus size={20} className="text-white" />
               </button>
               <button 
                  onClick={() => signOutUser()}
                  className="p-3 bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-md border border-white/10 border-t-white/30 border-l-white/20 rounded-[18px] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.2),inset_0_-2px_4px_rgba(255,255,255,0.05)] transition-all duration-300 hover:bg-white/20 active:scale-95 text-white/50 hover:text-white"
                  title="Log Out"
               >
                  <LogOut size={20} />
               </button>
            </div>
         </div>

         <div className="flex flex-col gap-4">
            {slides.sort((a,b) => a.order - b.order).map((slide, index) => (
               <div key={slide.id} className="flex items-center justify-between p-4 bg-gradient-to-b from-white/5 to-white/[0.02] backdrop-blur-md border border-white/10 rounded-2xl">
                  <div className="flex items-center gap-6 flex-1">
                     <span className="font-mono text-white/30 w-6">{(index + 1).toString().padStart(2, '0')}</span>
                     <div className="text-white/50">{getTypeIcon(slide.type, 20)}</div>
                     <span className="font-medium text-lg min-w-[150px]">{slide.name}</span>
                     
                     <div className="flex items-center gap-2 text-white/40">
                        <MessageSquare size={16} />
                        <span className="font-mono text-sm">{slide.commentsCount}</span>
                     </div>
                  </div>

                  <div className="flex items-center gap-4">
                     <div className="flex flex-col gap-1 mr-4">
                        <button className="text-white/30 hover:text-white transition-colors"
                           onClick={async () => {
                              const newSlides = [...slides];
                              if (index > 0) {
                                 [newSlides[index].order, newSlides[index-1].order] = [newSlides[index-1].order, newSlides[index].order];
                                 await saveSlides([newSlides[index], newSlides[index-1]]);
                              }
                           }}>
                           <ChevronUp size={16} />
                        </button>
                        <button className="text-white/30 hover:text-white transition-colors"
                           onClick={async () => {
                              const newSlides = [...slides];
                              if (index < slides.length - 1) {
                                 [newSlides[index].order, newSlides[index+1].order] = [newSlides[index+1].order, newSlides[index].order];
                                 await saveSlides([newSlides[index], newSlides[index+1]]);
                              }
                           }}>
                           <ChevronDown size={16} />
                        </button>
                     </div>
                     <button onClick={() => handleDelete(slide.id)} className="p-2 text-white/50 hover:text-red-400 transition-colors bg-white/5 rounded-xl border border-white/10">
                        <Trash2 size={18} />
                     </button>
                     <button onClick={() => handleOpenEdit(slide)} className="p-2 text-white/50 hover:text-white transition-colors bg-white/5 rounded-xl border border-white/10">
                        <Pen size={18} />
                     </button>
                  </div>
               </div>
            ))}
         </div>
      </div>

      <AnimatePresence>
         {isModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
               <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto"
                  onClick={() => !isUploadingFolder && setIsModalOpen(false)}
               />
               <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-[32px] p-8 shadow-2xl flex flex-col gap-6 max-h-[90vh] overflow-y-auto scrollbar-hide"
               >
                  <h3 className="text-2xl font-bold">{editingSlide ? 'Edit Slide' : 'Add New Slide'}</h3>

                  <div className="flex flex-col gap-4">
                     <label className="text-xs font-mono text-white/50 uppercase tracking-wider">Slide Code (.tsx)</label>
                     <div className="grid grid-cols-2 gap-4">
                        <label className={`flex flex-col items-center justify-center text-center gap-2 p-4 rounded-2xl border transition-all duration-300 cursor-pointer ${fileUploaded && !isUploadingFolder ? 'bg-white/10 border-white/30 text-white' : 'border-white/10 border-dashed text-white/50 hover:bg-white/5 hover:text-white'}`}>
                           <input 
                              type="file" 
                              accept=".tsx" 
                              className="hidden"
                              disabled={isUploadingFolder}
                              onChange={(e) => {
                                 if (e.target.files && e.target.files.length > 0) {
                                    const file = e.target.files[0];
                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                       setSlideCode(event.target?.result as string);
                                       setFileUploaded(true);
                                    };
                                    reader.readAsText(file);
                                 }
                              }}
                           />
                           {fileUploaded && !isUploadingFolder ? <Check size={20} className="text-green-400" /> : <Upload size={20} />}
                           <span className="text-xs text-balance">Single .tsx File</span>
                        </label>

                        <label className={`flex flex-col items-center justify-center text-center gap-2 p-4 rounded-2xl border transition-all duration-300 cursor-pointer ${isUploadingFolder ? 'bg-white/10 border-white/30 text-white' : 'border-white/10 border-dashed text-white/50 hover:bg-white/5 hover:text-white'}`}>
                           <input 
                              type="file" 
                              /* @ts-ignore: Next line ignores standard types to allow folder upload */
                              webkitdirectory="true"
                              directory="true"
                              multiple
                              className="hidden"
                              disabled={isUploadingFolder}
                              onChange={handleFolderUpload}
                           />
                           {isUploadingFolder ? (
                              <Loader2 size={20} className="animate-spin text-white/70" />
                           ) : (
                              <FolderIcon size={20} />
                           )}
                           <span className="text-xs text-balance">
                              {isUploadingFolder ? `Uploading... ${uploadProgress}%` : 'Upload Folder (Assets + Code)'}
                           </span>
                        </label>
                     </div>
                  </div>

                  <div className="flex flex-col gap-2">
                     <label className="text-xs font-mono text-white/50 uppercase tracking-wider">Slide Name</label>
                     <input 
                        type="text" 
                        value={slideName}
                        onChange={(e) => setSlideName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-white/30 transition-colors"
                        placeholder="e.g. Hero Section"
                        disabled={isUploadingFolder}
                     />
                  </div>

                  <div className="flex gap-4">
                     <div className="flex flex-col gap-2 flex-1">
                        <label className="text-xs font-mono text-white/50 uppercase tracking-wider">Type</label>
                        <div className="relative">
                           <select 
                              value={slideType} 
                              onChange={(e) => setSlideType(e.target.value as SlideType)}
                              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-white/30 transition-colors appearance-none"
                              disabled={isUploadingFolder}
                           >
                              <option value="project" className="bg-black text-white">Project</option>
                              <option value="skill" className="bg-black text-white">Skill</option>
                              <option value="animation" className="bg-black text-white">Animation</option>
                              <option value="other" className="bg-black text-white">Other</option>
                           </select>
                           <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/50">
                              {getTypeIcon(slideType)}
                           </div>
                        </div>
                     </div>

                     <div className="flex flex-col gap-2 flex-1">
                        <label className="text-xs font-mono text-white/50 uppercase tracking-wider">Privacy</label>
                        <div className="relative">
                           <select 
                              value={slidePrivacy} 
                              onChange={(e) => setSlidePrivacy(e.target.value as Privacy)}
                              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-white/30 transition-colors appearance-none"
                              disabled={isUploadingFolder}
                           >
                              <option value="public" className="bg-black text-white">Public</option>
                              <option value="private" className="bg-black text-white">Private</option>
                           </select>
                           <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/50">
                              {getPrivacyIcon(slidePrivacy)}
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="flex items-center justify-between py-2 border-t border-white/10 mt-2">
                     <div className="flex flex-col">
                        <span className="font-medium">Enable Comments</span>
                        <span className="text-xs text-white/40">Allow users to comment on this slide</span>
                     </div>
                     <button 
                        onClick={() => setCommentsOn(!commentsOn)}
                        disabled={isUploadingFolder}
                        className={`w-12 h-6 rounded-full transition-colors relative ${commentsOn ? 'bg-white' : 'bg-white/20'}`}
                     >
                        <div className={`absolute top-1 w-4 h-4 rounded-full transition-all duration-300 ${commentsOn ? 'bg-black left-7' : 'bg-white left-1'}`}></div>
                     </button>
                  </div>

                  <button 
                     onClick={handleSave}
                     disabled={isUploadingFolder}
                     className={`w-full py-4 mt-2 bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-md border border-white/10 border-t-white/30 border-l-white/20 rounded-[18px] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.2),inset_0_-2px_4px_rgba(255,255,255,0.05)] transition-all duration-300 ${isUploadingFolder ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/20 active:scale-95'} font-medium tracking-wide`}
                  >
                     Save Slide
                  </button>
               </motion.div>
            </div>
         )}
      </AnimatePresence>
    </motion.div>
  );
}
