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
          border: "border-cyan-500/30",
          icon: <Hammer className="w-6 h-6 md:w-8 md:h-8 text-cyan-400" />,
          iconBg: "bg-cyan-500/10 border-cyan-500/20",
          button: "bg-cyan-600 hover:bg-cyan-700 shadow-sm",
          checkbox: "bg-cyan-600 border-cyan-600",
          link: "text-cyan-400 hover:text-cyan-300"
        };
      case 'WARNING': 
        return {
          border: "border-amber-500/30",
          icon: <AlertTriangle className="w-6 h-6 md:w-8 md:h-8 text-amber-400" />,
          iconBg: "bg-amber-500/10 border-amber-500/20",
          button: "bg-amber-600 hover:bg-amber-700 shadow-sm",
          checkbox: "bg-amber-600 border-amber-600",
          link: "text-amber-400 hover:text-amber-300"
        };
      default: 
        return {
          border: "border-blue-500/30",
          icon: <Info className="w-6 h-6 md:w-8 md:h-8 text-blue-400" />,
          iconBg: "bg-blue-500/10 border-blue-500/20",
          button: "bg-blue-600 hover:bg-blue-700 shadow-sm",
          checkbox: "bg-blue-600 border-blue-600",
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
            className="absolute inset-0 bg-black/60" 
            onClick={handleClose} 
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`relative w-full max-w-lg md:max-w-2xl bg-[#0b1322] border border-slate-800 shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[calc(100vh-2rem)]`}
          >
            <button 
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors z-50"
              aria-label="Close announcement"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="p-6 md:p-8 text-center relative z-10 flex flex-col flex-1 min-h-0">
              <div className="flex-shrink-0">
                <div className={`w-14 h-14 md:w-16 md:h-16 ${styles.iconBg} rounded-2xl flex items-center justify-center mx-auto mb-4 border`}>
                  {styles.icon}
                </div>
                
                <h2 className="text-xl md:text-2xl font-bold mb-4 text-white tracking-tight leading-tight">
                  {announcement.title}
                </h2>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                <div 
                  className={`text-slate-300 mb-6 text-xs md:text-sm leading-relaxed prose prose-invert max-w-none text-center prose-p:my-1 prose-ul:my-1 prose-ul:inline-block prose-ul:text-left prose-li:my-0 mx-auto [&>a]:${styles.link.split(' ')[0]} [&>a]:font-semibold [&>a]:underline hover:[&>a]:${styles.link.split(' ')[1]}`}
                  dangerouslySetInnerHTML={{ __html: announcement.content }}
                />
              </div>
              
              <div className="flex-shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-slate-800">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input 
                      type="checkbox" 
                      className="sr-only"
                      checked={dontShowAgain}
                      onChange={(e) => setDontShowAgain(e.target.checked)}
                    />
                    <div className={`w-5 h-5 border rounded flex items-center justify-center transition-colors ${dontShowAgain ? styles.checkbox : 'border-slate-700 group-hover:border-slate-500'}`}>
                      {dontShowAgain && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                    </div>
                  </div>
                  <span className="text-sm font-medium text-slate-400 group-hover:text-slate-300 transition-colors">
                    Don't show again
                  </span>
                </label>
                
                <button 
                  onClick={handleClose}
                  className={`w-full sm:w-auto px-6 py-2.5 ${styles.button} text-white font-semibold rounded-xl transition-all`}
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
