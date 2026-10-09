"use client";

import { useState, useEffect } from "react";
import { Info, Hammer, AlertTriangle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Announcement {
  id: number;
  title: string;
  content: string;
  type: string;
}

export function AnnouncementModal() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await fetch('/api/announcements');
        if (!res.ok) return;
        
        const data: Announcement[] = await res.json();
        if (data.length > 0) {
          // Find the first announcement that hasn't been dismissed
          const dismissedIds = JSON.parse(localStorage.getItem('dismissedAnnouncements') || '[]');
          const activeAnnouncement = data.find(a => !dismissedIds.includes(a.id));
          
          if (activeAnnouncement) {
            setAnnouncement(activeAnnouncement);
            setIsVisible(true);
          }
        }
      } catch (err) {
        console.error("Failed to fetch announcements", err);
      }
    };

    fetchAnnouncements();
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    
    if (dontShowAgain && announcement) {
      const dismissedIds = JSON.parse(localStorage.getItem('dismissedAnnouncements') || '[]');
      if (!dismissedIds.includes(announcement.id)) {
        dismissedIds.push(announcement.id);
        localStorage.setItem('dismissedAnnouncements', JSON.stringify(dismissedIds));
      }
    }
  };

  if (!announcement) return null;

  const getTypeStyles = (type: string) => {
    switch(type) {
      case 'MAINTENANCE': 
        return {
          glow: "bg-cyan-500/20", border: "border-cyan-500/30", icon: <Hammer className="w-6 h-6 md:w-8 md:h-8 text-cyan-400" />, iconBg: "from-cyan-500/20 to-blue-600/30 shadow-[0_0_30px_rgba(34,211,238,0.2)]", ping: "bg-cyan-500/20",
          button: "bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 hover:from-cyan-300 hover:via-blue-400 hover:to-purple-400 shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:shadow-[0_0_25px_rgba(34,211,238,0.5)]",
          checkbox: "bg-cyan-500 border-cyan-500",
          link: "text-cyan-400 hover:text-cyan-300"
        };
      case 'WARNING': 
        return {
          glow: "bg-purple-500/20", border: "border-purple-500/30", icon: <AlertTriangle className="w-6 h-6 md:w-8 md:h-8 text-purple-400" />, iconBg: "from-purple-500/20 to-blue-600/30 shadow-[0_0_30px_rgba(168,85,247,0.2)]", ping: "bg-purple-500/20",
          button: "bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-400 hover:to-blue-400 shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:shadow-[0_0_25px_rgba(168,85,247,0.5)]",
          checkbox: "bg-purple-500 border-purple-500",
          link: "text-purple-400 hover:text-purple-300"
        };
      default: 
        return {
          glow: "bg-blue-500/20", border: "border-blue-500/30", icon: <Info className="w-6 h-6 md:w-8 md:h-8 text-blue-400" />, iconBg: "from-blue-500/20 to-cyan-500/30 shadow-[0_0_30px_rgba(59,130,246,0.2)]", ping: "bg-blue-500/20",
          button: "bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-400 hover:to-cyan-300 shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)]",
          checkbox: "bg-blue-500 border-blue-500",
          link: "text-blue-400 hover:text-blue-300"
        };
    }
  };

  const styles = getTypeStyles(announcement.type);

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#011627]/80 backdrop-blur-md" 
            onClick={handleClose} 
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`relative w-full max-w-lg md:max-w-2xl lg:max-w-3xl bg-[#011627]/90 backdrop-blur-xl border ${styles.border} shadow-[0_8px_32px_rgba(0,0,0,0.5)] rounded-[2rem] overflow-hidden flex flex-col max-h-[calc(100vh-2rem)]`}
          >
            {/* Glow effect */}
            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-32 ${styles.glow} blur-[60px] pointer-events-none`} />
            
            <button 
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/5 transition-colors z-50"
              aria-label="Close announcement"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="p-6 md:p-8 lg:p-10 text-center relative z-10 flex flex-col flex-1 min-h-0">
              <div className="flex-shrink-0">
                <div className={`w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br ${styles.iconBg} rounded-full flex items-center justify-center mx-auto mb-4 relative border border-white/5`}>
                  {styles.icon}
                  <div className={`absolute inset-0 ${styles.ping} rounded-full animate-ping opacity-30`} />
                </div>
                
                <h2 className="text-xl md:text-2xl font-extrabold mb-4 text-white tracking-tight leading-tight">
                  {announcement.title}
                </h2>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                <div 
                  className={`text-zinc-300 mb-6 text-xs md:text-sm leading-relaxed prose prose-invert max-w-none text-center prose-p:my-1 prose-ul:my-1 prose-ul:inline-block prose-ul:text-left prose-li:my-0 mx-auto [&>a]:${styles.link.split(' ')[0]} [&>a]:font-semibold [&>a]:underline hover:[&>a]:${styles.link.split(' ')[1]}`}
                  dangerouslySetInnerHTML={{ __html: announcement.content }}
                />
              </div>
              
              <div className="flex-shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-white/5">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input 
                      type="checkbox" 
                      className="sr-only"
                      checked={dontShowAgain}
                      onChange={(e) => setDontShowAgain(e.target.checked)}
                    />
                    <div className={`w-5 h-5 border rounded flex items-center justify-center transition-colors ${dontShowAgain ? styles.checkbox : 'border-zinc-600 group-hover:border-zinc-400'}`}>
                      {dontShowAgain && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                    </div>
                  </div>
                  <span className="text-sm font-medium text-zinc-400 group-hover:text-zinc-300 transition-colors">
                    Don't show again
                  </span>
                </label>
                
                <button 
                  onClick={handleClose}
                  className={`w-full sm:w-auto px-8 py-2.5 ${styles.button} text-white font-bold rounded-xl transition-all`}
                >
                  Got it
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
