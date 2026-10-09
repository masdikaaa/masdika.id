"use client";
import { cn } from "@/lib/utils";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, User, Send, Loader2, RefreshCw, Power, ArrowLeft, MessageSquare } from 'lucide-react';
import { useTheme } from "@/components/ThemeProvider";
import { toast } from 'sonner';
import { Pagination } from "@/components/ui/Pagination";

type ChatSession = {
  id: number;
  sessionId: string;
  name: string;
  email: string;
  lastActiveAt: string;
  messages: ChatMessage[];
};

type ChatMessage = {
  id: number;
  role: string;
  content: string;
  isAdmin: boolean;
  createdAt: string;
};

export default function AdminLiveChat() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/admin/live-chat/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data.status);
      }
    } catch (e) {}
  };

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/admin/live-chat/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions);
      }
    } catch (e) {}
  };

  const fetchMessages = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/live-chat/messages?sessionId=${id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
      }
    } catch (e) {}
  };

  const [status, setStatus] = useState<'ONLINE' | 'OFFLINE'>('OFFLINE');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Pagination for sessions
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  // Fetch initial status and sessions
  useEffect(() => {
    fetchStatus();
    fetchSessions();
    const interval = setInterval(fetchSessions, 5000); // Poll for new sessions
    return () => clearInterval(interval);
  }, []);

  // Fetch messages when a session is selected
  useEffect(() => {
    if (selectedSessionId) {
      fetchMessages(selectedSessionId);
      const interval = setInterval(() => fetchMessages(selectedSessionId), 3000); // Poll messages
      return () => clearInterval(interval);
    } else {
      setMessages([]);
    }
  }, [selectedSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  const toggleStatus = async () => {
    const newStatus = status === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
    try {
      const res = await fetch('/api/admin/live-chat/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setStatus(newStatus);
        toast.success(`Admin status is now ${newStatus}`);
      }
    } catch (e) {
      toast.error('Failed to update status');
    }
  };



  const handleSend = async () => {
    if (!replyText.trim() || !selectedSessionId) return;
    
    const text = replyText;
    setReplyText('');
    setIsSending(true);

    try {
      const res = await fetch('/api/admin/live-chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: selectedSessionId, content: text }),
      });
      if (res.ok) {
        await fetchMessages(selectedSessionId);
      } else {
        toast.error('Failed to send message');
      }
    } catch (e) {
      toast.error('Network error');
    } finally {
      setIsSending(false);
    }
  };

  const selectedSession = sessions.find(s => s.id === selectedSessionId);

  const totalPages = Math.ceil(sessions.length / ITEMS_PER_PAGE);
  const paginatedSessions = sessions.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="flex flex-col h-full space-y-6 pb-6">
      <div className="flex flex-col sm:flex-row md:items-end justify-between gap-6 shrink-0">
        <div>
          <h1 className={cn("text-3xl font-extrabold drop-shadow-sm mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>Live Chat</h1>
          <p className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Manage active chat sessions and manually reply to users.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleStatus}
            className={cn("flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all border", status === "ONLINE" ? (isDark ? "bg-gradient-to-r from-cyan-500/20 to-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.3)]" : "bg-cyan-50 text-cyan-700 border-cyan-200 shadow-sm") : (isDark ? "bg-red-500/10 text-red-400 border-red-500/30 shadow-inner" : "bg-red-50 text-red-700 border-red-200 shadow-sm"))}
          >
            <Power size={16} />
            {status === 'ONLINE' ? 'Admin is ONLINE' : 'Admin is OFFLINE'}
          </button>
        </div>
      </div>

      <motion.div variants={itemVariants} className={cn("flex flex-col md:flex-row flex-1 glass-card border overflow-hidden h-[calc(100vh-220px)] md:h-[calc(100vh-240px)] min-h-[400px]", isDark ? "border-cyan-500/30" : "bg-white border-slate-200 shadow-sm")}>
        {/* Sidebar: Sessions */}
        <div className={cn(`md:w-1/3 border-b md:border-b-0 md:border-r flex flex-col ${selectedSessionId ? 'hidden md:flex' : 'flex flex-1'}`, isDark ? "border-white/10" : "border-slate-200")}>
          <div className={cn("p-4 border-b flex justify-between items-center", isDark ? "bg-[#0A0B1A]/50 border-white/10" : "bg-slate-50 border-slate-200")}>
             <h2 className={cn("font-bold text-xs uppercase tracking-wider", isDark ? "text-zinc-300" : "text-slate-600")}>Active Sessions</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {sessions.length === 0 ? (
              <div className="text-zinc-500 text-center py-8 text-sm flex flex-col items-center justify-center">
                <MessageSquare className="w-8 h-8 mb-3 opacity-20" />
                No active sessions.
              </div>
            ) : (
              paginatedSessions.map(session => (
                <div
                  key={session.id}
                  onClick={() => setSelectedSessionId(session.id)}
                  className={cn("p-3 rounded-lg cursor-pointer transition-all border", selectedSessionId === session.id ? (isDark ? "bg-cyan-500/10 border-cyan-500/50 shadow-inner" : "bg-cyan-50 border-cyan-300 shadow-sm") : (isDark ? "bg-white/5 border-white/5 hover:border-cyan-500/30" : "bg-white border-slate-200 hover:border-cyan-400"))}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={cn("font-bold text-sm", isDark ? "text-white" : "text-slate-900")}>{session.name}</span>
                    <span className="text-xs text-zinc-500 font-medium">
                      {new Date(session.lastActiveAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className={cn("text-xs truncate", isDark ? "text-zinc-400" : "text-slate-500")}>
                    {session.email}
                  </div>
                </div>
              ))
            )}
          </div>
          {totalPages > 1 && (
            <div className={cn("p-3 border-t", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-slate-50 border-slate-200")}>
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          )}
        </div>

        {/* Main Chat Area */}
        <div className={`md:w-2/3 flex flex-col bg-transparent relative ${!selectedSessionId ? 'hidden md:flex' : 'flex flex-1'}`}>
          {selectedSessionId ? (
            <>
              {/* Header */}
              <div className={cn("p-4 border-b flex items-center justify-between shrink-0", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-slate-50 border-slate-200")}>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setSelectedSessionId(null)}
                    className={cn("md:hidden p-2 hover:text-white rounded-lg border", isDark ? "text-zinc-400 border-white/10" : "text-slate-500 border-slate-200")}
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <div>
                    <h3 className={cn("font-bold text-sm", isDark ? "text-white" : "text-slate-900")}>{selectedSession?.name}</h3>
                    <p className={cn("text-xs font-medium", isDark ? "text-cyan-400" : "text-cyan-700")}>{selectedSession?.email}</p>
                  </div>
                </div>
                <button 
                  onClick={() => fetchMessages(selectedSessionId)}
                  className={cn("p-2 hover:bg-cyan-500/10 rounded-lg transition-colors border border-transparent hover:border-cyan-500/20", isDark ? "text-cyan-400" : "text-cyan-700")}
                >
                  <RefreshCw size={16} />
                </button>
              </div>

              {/* Messages */}
              <div className={cn("flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar", isDark ? "bg-black/10" : "bg-slate-50/50")}>
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={cn("max-w-[85%] sm:max-w-[75%] p-3 text-sm leading-relaxed", msg.role === "user" ? (isDark ? "bg-cyan-500/10 border border-cyan-500/20 text-white rounded-2xl rounded-tr-sm" : "bg-cyan-600 border border-cyan-700 text-white rounded-2xl rounded-tr-sm shadow-sm") : msg.isAdmin ? (isDark ? "bg-gradient-to-br from-cyan-600/30 to-cyan-600/30 border border-cyan-500/40 text-cyan-50 rounded-2xl rounded-tl-sm shadow-inner" : "bg-white border border-slate-300 text-slate-800 rounded-2xl rounded-tl-sm shadow-sm") : (isDark ? "bg-white/5 border border-white/10 text-zinc-300 rounded-2xl rounded-tl-sm" : "bg-slate-100 border border-slate-200 text-slate-600 rounded-2xl rounded-tl-sm shadow-sm"))}
                    >
                      {msg.role !== 'user' && (
                        <div className="text-[10px] font-bold mb-1.5 uppercase tracking-wider opacity-70 flex items-center gap-1.5">
                          {msg.isAdmin ? (
                            <><User size={10} /> Admin Reply</>
                          ) : (
                            <><Bot size={10} /> AI Agent</>
                          )}
                        </div>
                      )}
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className={cn("p-4 border-t shrink-0", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-slate-50 border-slate-200")}>
                {status === 'OFFLINE' && (
                  <div className="text-xs text-amber-500/90 font-medium mb-3 px-1 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    You are offline. Taking over from AI requires ONLINE status.
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder={status === 'ONLINE' ? 'Type your manual reply here...' : 'Go ONLINE to take over chat...'}
                    disabled={status === 'OFFLINE'}
                    className={cn("flex-1 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50 placeholder:text-zinc-500 disabled:opacity-50 transition-all shadow-inner", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
                  />
                  <button
                    onClick={handleSend}
                    disabled={isSending || !replyText.trim() || status === 'OFFLINE'}
                    className={cn("transition-all shadow-md hover:shadow-lg hover:from-cyan-400 hover:to-cyan-400 p-3 rounded-xl transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(6,182,212,0.2)] flex items-center justify-center min-w-[50px]", isDark ? "bg-cyan-500 hover:bg-cyan-400 text-slate-900 shadow-cyan-500/20" : "bg-cyan-600 hover:bg-cyan-700 text-white shadow-cyan-600/20")}
                  >
                    {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className={cn("flex-1 flex flex-col items-center justify-center /30 p-6 text-center", isDark ? "text-cyan-500" : "text-cyan-700")}>
              <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mb-4 border", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
                <MessageSquare size={24} className={cn("opacity-50", isDark ? "text-cyan-400" : "text-cyan-700")} />
              </div>
              <h3 className={cn("font-bold mb-1", isDark ? "text-white" : "text-slate-900")}>Live Chat Hub</h3>
              <p className="text-zinc-500 text-sm max-w-xs">Select a session from the sidebar to view history or take over the conversation.</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
