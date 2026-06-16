import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, MessageSquare, ThumbsUp, ThumbsDown, Send, Pencil, Trash2 } from 'lucide-react';
import { useDatabase, LocalComment } from '../database';

interface CommentsProps {
  slideId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function Comments({ slideId, isOpen, onClose }: CommentsProps) {
  const { currentUser, getCommentsForSlide, addComment, editComment, deleteComment, voteComment } = useDatabase();
  const [newComment, setNewComment] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const comments = getCommentsForSlide(slideId);

  const handlePostComment = async () => {
    if (!newComment.trim() || !currentUser) return;
    await addComment(slideId, null, newComment);
    setNewComment('');
  };

  const handlePostReply = async (parentId: string) => {
    if (!replyText.trim() || !currentUser) return;
    await addComment(slideId, parentId, replyText);
    setReplyText('');
    setReplyingTo(null);
    setExpandedReplies(prev => ({ ...prev, [parentId]: true }));
  };

  const handleEditComment = async (id: string) => {
    if (!editingText.trim()) return;
    await editComment(id, editingText);
    setEditingCommentId(null);
    setEditingText('');
  };

  const handleDeleteComment = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this comment?")) {
      await deleteComment(id);
    }
  };

  const mainComments = comments.filter(c => !c.parentId);
  const repliesByParent = comments.filter(c => c.parentId).reduce((acc, c) => {
    if (!acc[c.parentId!]) acc[c.parentId!] = [];
    acc[c.parentId!].push(c);
    return acc;
  }, {} as Record<string, LocalComment[]>);

  const toggleReplies = (id: string) => {
    setExpandedReplies(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getAllReplies = (id: string): LocalComment[] => {
    const direct = repliesByParent[id] || [];
    let all = [...direct];
    for (const r of direct) {
      all = [...all, ...getAllReplies(r.id)];
    }
    return all.sort((a, b) => a.createdAt - b.createdAt);
  };

  const renderComment = (comment: LocalComment, isReply = false) => {
    const allDescendantReplies = getAllReplies(comment.id);
    const isExpanded = expandedReplies[comment.id];
    const isReplying = replyingTo === comment.id;
    
    return (
      <div key={comment.id} className={`flex gap-3 w-full ${isReply ? 'mt-3' : 'mt-6'}`}>
        <img 
           src={comment.userPhoto || `https://api.dicebear.com/7.x/shapes/svg?seed=${comment.userId}`} 
           className="w-10 h-10 rounded-full bg-white/10" 
           alt="profile" 
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-white/90 text-sm">{comment.userName}</span>
            <span className="text-white/40 text-[10px]">
              {new Date(comment.createdAt).toLocaleDateString()}
            </span>
            {currentUser && currentUser.uid === comment.userId && (
              <div className="ml-auto flex items-center gap-2 text-white/30">
                <button onClick={() => { setEditingCommentId(comment.id); setEditingText(comment.text); }} className="hover:text-white transition-colors cursor-pointer">
                  <Pencil size={12} />
                </button>
                <button onClick={() => handleDeleteComment(comment.id)} className="hover:text-red-400 transition-colors cursor-pointer">
                  <Trash2 size={12} />
                </button>
              </div>
            )}
          </div>
          {editingCommentId === comment.id ? (
            <div className="mt-2 flex gap-2">
              <input 
                type="text" 
                value={editingText} 
                onChange={(e) => setEditingText(e.target.value)} 
                autoFocus
                className="flex-1 bg-white/5 border border-white/20 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-white/40"
                onKeyDown={(e) => e.key === 'Enter' && handleEditComment(comment.id)}
              />
              <button onClick={() => handleEditComment(comment.id)} className="text-xs bg-white/10 px-2 rounded hover:bg-white/20 cursor-pointer">Save</button>
              <button onClick={() => setEditingCommentId(null)} className="text-xs text-white/50 hover:text-white cursor-pointer">Cancel</button>
            </div>
          ) : (
            <p className="text-white/70 text-sm mt-1">{comment.text}</p>
          )}
          
          <div className="flex items-center gap-4 mt-2 text-white/40 text-[10px] md:text-xs">
            <button onClick={() => voteComment(comment.id, 'like')} className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer">
              <ThumbsUp className={`w-3 h-3 md:w-[14px] md:h-[14px] ${currentUser && comment.likedBy?.includes(currentUser.uid) ? 'text-blue-400 fill-blue-400' : ''}`} /> {comment.likes}
            </button>
            <button onClick={() => voteComment(comment.id, 'dislike')} className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer">
              <ThumbsDown className={`w-3 h-3 md:w-[14px] md:h-[14px] ${currentUser && comment.dislikedBy?.includes(currentUser.uid) ? 'text-blue-400 fill-blue-400' : ''}`} /> {comment.dislikes}
            </button>
            <button 
               onClick={() => {
                 if (isReplying) {
                   setReplyingTo(null);
                 } else {
                   setReplyingTo(comment.id);
                   setReplyText(`@${comment.userName} `);
                 }
               }} 
               className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
            >
              <MessageSquare className="w-3 h-3 md:w-[14px] md:h-[14px]" /> Reply
            </button>
          </div>

          {isReplying && (
            <div className="mt-3 flex gap-2 w-full">
              <input
                type="text"
                ref={(el) => el?.focus()}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Reply to ${comment.userName}...`}
                className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handlePostReply(comment.id);
                  }
                }}
              />
              <button 
                onClick={() => handlePostReply(comment.id)} 
                className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
              >
                <Send size={16} />
              </button>
            </div>
          )}

          {!isReply && allDescendantReplies.length > 0 && (
            <button 
              onClick={() => toggleReplies(comment.id)}
              className="text-white/50 text-xs mt-3 font-semibold hover:text-white transition-colors flex items-center gap-2 cursor-pointer"
            >
              <div className="h-px w-6 bg-white/20" />
              {isExpanded ? 'Hide replies' : `${allDescendantReplies.length} replies`}
            </button>
          )}

          <AnimatePresence>
            {!isReply && isExpanded && allDescendantReplies.length > 0 && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 1, ease: 'easeInOut' }}
                className="mt-1 overflow-hidden"
              >
                {allDescendantReplies.map(reply => renderComment(reply, true))}
              </motion.div>
            )}
          </AnimatePresence>

          {!isReply && <div className="h-px bg-white/10 w-full mt-6" />}
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && <motion.div 
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 md:hidden backdrop-blur-sm"
            onClick={onClose}
          />}
      {isOpen && <motion.div
            key="modal"
            initial={{ y: '100%', x: 0 }}
            animate={{ y: 0, x: 0 }}
            exit={{ y: '100%', x: 0 }}
            transition={{ duration: 1, ease: "easeInOut" }}
            className="fixed bottom-0 left-0 right-0 h-[80vh] bg-neutral-900 border-t border-white/10 rounded-t-3xl z-[60] flex flex-col md:hidden"
          >
             <div className="flex justify-between items-center p-6 border-b border-white/10">
                <h2 className="text-xl font-bold text-white">Comments</h2>
                <button onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-white/10 cursor-pointer">
                   <ArrowRight size={20} className="rotate-90 text-white/50" />
                </button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-6 pt-0">
                {mainComments.map(c => renderComment(c))}
                {mainComments.length === 0 && <p className="text-white/30 text-center mt-10">No comments yet</p>}
             </div>
             
             <div className="p-4 border-t border-white/10 bg-neutral-900/50 backdrop-blur-md pb-8">
               <div className="flex gap-2 relative">
                 <input
                   type="text"
                   value={newComment}
                   onChange={e => setNewComment(e.target.value)}
                   placeholder="Add a comment..."
                   className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30"
                   onKeyDown={e => e.key === 'Enter' && handlePostComment()}
                 />
                 <button onClick={handlePostComment} className="bg-white/10 p-3 rounded-full hover:bg-white/20 transition-colors cursor-pointer">
                   <Send size={18} />
                 </button>
               </div>
             </div>
          </motion.div>}

      {isOpen && <motion.div
            key="desktop-modal"
            initial={{ x: '-100%', y: 0 }}
            animate={{ x: 0, y: 0 }}
            exit={{ x: '-100%', y: 0 }}
            transition={{ duration: 1, ease: "easeInOut" }}
            className="hidden md:flex fixed top-0 bottom-0 left-0 w-[400px] bg-neutral-900 border-r border-white/10 z-[60] flex-col"
          >
             <div className="flex justify-between items-center p-6 border-b border-white/10">
                <h2 className="text-xl font-bold text-white">Comments</h2>
                <button onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-white/10 cursor-pointer">
                   <ArrowRight size={20} className="text-white/50 rotate-180" />
                </button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-6 pt-0">
                {mainComments.map(c => renderComment(c))}
                {mainComments.length === 0 && <p className="text-white/30 text-center mt-10">No comments yet</p>}
             </div>
             
             <div className="p-4 border-t border-white/10 bg-neutral-900/50 backdrop-blur-md">
               <div className="flex gap-2">
                 <input
                   type="text"
                   value={newComment}
                   onChange={e => setNewComment(e.target.value)}
                   placeholder="Add a comment..."
                   className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30"
                   onKeyDown={e => e.key === 'Enter' && handlePostComment()}
                 />
                 <button onClick={handlePostComment} className="bg-white/10 p-3 rounded-full hover:bg-white/20 transition-colors cursor-pointer">
                   <Send size={18} />
                 </button>
               </div>
             </div>
          </motion.div>}
    </AnimatePresence>
  );
}
