import { collection, doc, getDocs, setDoc, deleteDoc, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export interface Slide {
  id: string;
  order: number;
  type: string;
  name: string;
  privacy: string;
  commentsEnabled: boolean;
  commentsCount: number;
  code?: string;
}

export const getSlides = (isAdmin: boolean, callback: (slides: Slide[]) => void) => {
  const slidesRef = collection(db, 'slides');
  // Simple query without compound index requirements
  const q = query(slidesRef);

  return onSnapshot(q, (snapshot) => {
    let slides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Slide));
    
    // Sort client-side
    slides.sort((a, b) => a.order - b.order);
    
    // Filter client-side if not admin
    if (!isAdmin) {
      slides = slides.filter(s => s.privacy === 'public');
    }
    
    callback(slides);
  }, (error) => {
    console.error("Firestore onSnapshot Error:", error);
  });
};

export const saveSlide = async (slide: Slide) => {
  await setDoc(doc(db, 'slides', slide.id), slide);
};

export const saveSlides = async (slides: Slide[]) => {
  const promises = slides.map(slide => saveSlide(slide));
  await Promise.all(promises);
};

export const deleteSlide = async (id: string) => {
  await deleteDoc(doc(db, 'slides', id));
};
