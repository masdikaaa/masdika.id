"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Bot, X, Send, User, Loader2, Trash2, AlertTriangle, LogOut, Mail, Phone, UserCircle, CheckCircle, Mic, MicOff, Headset } from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
import { toast } from 'sonner';
import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';
import { parseChatMarkdown } from '@/lib/render-chat-markdown';

// ─── Client-side constants ────────────────────────────────────────────────────
const MAX_INPUT_LENGTH = 1000;
const STORAGE_KEY_SESSION = 'masdika_ai_session';
const STORAGE_KEY_MESSAGES = 'masdika_ai_chat';
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─── DOMPurify: secure link handling ─────────────────────────────────────────
if (typeof window !== 'undefined') {
  DOMPurify.addHook('afterSanitizeAttributes', function (node) {
    if (node.tagName === 'A') {
      const href = node.getAttribute('href') || '';
      // Strip javascript: and data: hrefs
      if (/^(javascript|data|vbscript):/i.test(href.trim())) {
        node.removeAttribute('href');
        return;
      }
      // External links (http/https) → open in same tab, safe rel
      if (/^https?:\/\//i.test(href)) {
        node.setAttribute('target', '_self');
        node.removeAttribute('rel');
      }
      // Internal links (/path) → no target needed
      node.classList.add(
        'text-cyan-400',
        'hover:text-cyan-300',
        'underline',
        'decoration-cyan-500/30',
        'underline-offset-2'
      );
    }
  });
}

// ─── Client-side prompt injection patterns ────────────────────────────────────
const CLIENT_INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above|system)\s+(instructions?|prompts?|rules?)/i,
  /you\s+are\s+now\s+(a\s+)?(?:DAN|jailbreak|evil|hacker|different|another\s+AI)/i,
  /pretend\s+(you\s+are|to\s+be)/i,
  /act\s+as\s+(if\s+)?(?:you\s+are|a\s+)?(?:DAN|GPT|ChatGPT|an?\s+unrestricted|an?\s+evil)/i,
  /\bDAN\b/,
  /override\s+(safety|security|rules?|guidelines?|restrictions?)/i,
  /reveal\s+(your|the)\s+(system\s+prompt|instructions?|prompt)/i,
  /print\s+(the\s+)?(system\s+prompt|instructions?)/i,
  /anggap\s+(semua|ini|perintah|bahwa|saja|kamu|anda)/i,
  /pura[\s-]?pura/i,
  /seolah[\s-]?olah/i,
  /abaikan\s+(semua\s+)?(instruksi|aturan|batasan|perintah)/i,
];

function detectClientInjection(text: string): boolean {
  return CLIENT_INJECTION_PATTERNS.some(p => p.test(text));
}

// Custom Marked renderer for code blocks to add copy button and horizontal scroll
const renderer = new marked.Renderer();
renderer.code = function ({ text, lang, escaped }) {
  // Use a safer default for escaped text if not already escaped by marked
  const escapedText = escaped ? text : text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const safeLang = (lang || '').replace(/[^a-zA-Z0-9_+-]/g, '').slice(0, 32);
  return `
    <div class="relative group mt-4 mb-4 rounded-lg bg-[#0d1117] border border-cyan-500/20 overflow-hidden">
      <div class="flex items-center justify-between px-3 py-1.5 bg-[#011627] border-b border-cyan-500/20">
        <span class="text-xs text-cyan-400 font-mono">${safeLang || 'code'}</span>
        <button class="copy-code-btn text-xs text-gray-400 hover:text-white transition-colors focus:outline-none flex items-center gap-1">
          Copy
        </button>
      </div>
      <div class="overflow-x-auto p-3 scrollbar-thin scrollbar-thumb-cyan-500/30 scrollbar-track-transparent">
        <pre class="!m-0 !p-0 !bg-transparent"><code class="language-${safeLang}">${escapedText}</code></pre>
      </div>
    </div>
  `;
};
marked.use({ renderer });

type Message = {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  isAdmin?: boolean;
};

type SessionInfo = {
  sessionId: string;
  name: string;
  email: string;
  phone: string;
  createdAt: number;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(\+62|62|0)8[1-9][0-9]{6,10}$/;

export function AIChat() {
  const pathname = usePathname();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const reduceMotion = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [showConfirmEnd, setShowConfirmEnd] = useState(false);
  const [inputWarning, setInputWarning] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Session/registration state
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  // Voice feature state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  // Verification state
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [verificationOtp, setVerificationOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [tempSessionId, setTempSessionId] = useState('');
  
  // New Verification UI state
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [otpTimeLeft, setOtpTimeLeft] = useState(600);

  // Registration form fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regErrors, setRegErrors] = useState<{ name?: string; email?: string; phone?: string }>({});

  // Global event listener for copy buttons generated by marked
  useEffect(() => {
    const handleCopy = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const copyBtn = target.closest('.copy-code-btn') as HTMLElement;
      if (copyBtn) {
        const container = copyBtn.closest('.group');
        const codeElement = container?.querySelector('code');
        if (codeElement) {
          navigator.clipboard.writeText(codeElement.innerText);
          const originalHTML = copyBtn.innerHTML;
          copyBtn.innerHTML = 'Copied!';
          copyBtn.classList.add('text-cyan-400');
          setTimeout(() => {
            copyBtn.innerHTML = originalHTML;
            copyBtn.classList.remove('text-cyan-400');
          }, 2000);
        }
      }
    };
    document.addEventListener('click', handleCopy);
    return () => document.removeEventListener('click', handleCopy);
  }, []);

  // Sync / Polling mechanism for Admin messages
  const lastSyncTimeRef = useRef<number>(0);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (isOpen && isRegistered && sessionInfo?.sessionId) {
      intervalId = setInterval(async () => {
        try {
          const res = await fetch(`/api/chat/sync?sessionId=${sessionInfo.sessionId}&since=${lastSyncTimeRef.current}`);
          if (res.ok) {
            const data = await res.json();
            if (data.messages && data.messages.length > 0) {
              const newMessages = data.messages.map((m: any) => ({
                id: 'admin-' + m.id,
                role: 'model',
                content: m.content,
                timestamp: new Date(m.createdAt).getTime(),
                isAdmin: m.isAdmin
              }));
              
              setMessages(prev => [...prev, ...newMessages]);
              
              // Update last sync time based on the latest message received
              const latestTime = Math.max(...newMessages.map((m: any) => m.timestamp));
              lastSyncTimeRef.current = latestTime;
            }
          }
        } catch (e) {
          // Silent fail for background sync
        }
      }, 3000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isOpen, isRegistered, sessionInfo?.sessionId]);

  // OTP Countdown Timer
  useEffect(() => {
    if (requiresVerification && otpTimeLeft > 0) {
      const timerId = setInterval(() => {
        setOtpTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timerId);
    } else if (!requiresVerification) {
      setOtpTimeLeft(600); // reset when closed/verified
    }
  }, [requiresVerification, otpTimeLeft]);

  const formatOtpTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const pastedData = value.replace(/\D/g, '').slice(0, 6).split('');
      const newValues = [...otpValues];
      for (let i = 0; i < pastedData.length; i++) {
        if (index + i < 6) newValues[index + i] = pastedData[i];
      }
      setOtpValues(newValues);
      setVerificationOtp(newValues.join(''));
      
      const nextFocus = Math.min(index + pastedData.length, 5);
      otpRefs.current[nextFocus]?.focus();
      return;
    }
    
    // Handle single character
    const newValues = [...otpValues];
    newValues[index] = value.replace(/\D/g, '');
    setOtpValues(newValues);
    setVerificationOtp(newValues.join(''));

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const initialGreeting: Message = {
    id: 'greeting-initial',
    role: 'model',
    content: "Hello! I am Masdika's personal AI Assistant.\n\nHow can I help you today? You can ask about our **Cloud VPS, 1-Click Catalog Apps, Web Hosting**, or even ask me about my **Portfolio and Work Experience**!",
    timestamp: 0
  };

  // Load session and messages from localStorage on mount
  useEffect(() => {
    // Load session
    const savedSession = localStorage.getItem(STORAGE_KEY_SESSION);
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession) as SessionInfo;
        // Check if session is less than 24 hours old
        if (Date.now() - parsed.createdAt < SESSION_EXPIRY_MS) {
          setSessionInfo(parsed);
          setIsRegistered(true);
        } else {
          localStorage.removeItem(STORAGE_KEY_SESSION);
          localStorage.removeItem(STORAGE_KEY_MESSAGES);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY_SESSION);
      }
    }

    // Load messages
    const savedData = localStorage.getItem(STORAGE_KEY_MESSAGES);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.messages && parsed.messages.length > 0) {
          if (Date.now() - parsed.timestamp < SESSION_EXPIRY_MS) {
            setMessages(parsed.messages);
            return;
          }
        }
      } catch {
        console.error("Failed to parse chat history");
      }
    }
    setMessages([initialGreeting]);
   
  }, []);

  // Save to localStorage whenever messages change
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify({
        messages,
        timestamp: Date.now()
      }));
    }
    scrollToBottom('smooth');
  }, [messages]);

  // Scroll to bottom when chat is opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => scrollToBottom('auto'), 100);
    }
  }, [isOpen]);



  // ─── Registration handler ────────────────────────────────────────────
  const handleRegister = async () => {
    const errors: { name?: string; email?: string; phone?: string } = {};

    if (!regName.trim() || regName.trim().length < 2) {
      errors.name = 'Minimum 2 characters';
    }
    if (!regEmail.trim() || !EMAIL_REGEX.test(regEmail.trim())) {
      errors.email = 'Invalid email format';
    }
    const cleanPhone = regPhone.replace(/[\s\-()]/g, '');
    if (!cleanPhone || !PHONE_REGEX.test(cleanPhone)) {
      errors.phone = 'Format: +628xx or 08xx';
    }

    if (Object.keys(errors).length > 0) {
      setRegErrors(errors);
      return;
    }

    setRegErrors({});
    setIsRegistering(true);

    try {
      const res = await fetch('/api/chat/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName.trim(),
          email: regEmail.trim(),
          phone: cleanPhone,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to start chat session.');
        return;
      }

      if (data.requiresVerification) {
        setTempSessionId(data.sessionId);
        setRequiresVerification(true);
        toast.success(data.message || 'Verification code sent to your email.', {
          className: 'bg-[#011627] border-cyan-500/20 text-white',
        });
        return;
      }

      const newSession: SessionInfo = {
        sessionId: data.sessionId,
        name: regName.trim(),
        email: regEmail.trim(),
        phone: cleanPhone,
        createdAt: Date.now(),
      };

      setSessionInfo(newSession);
      setIsRegistered(true);
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(newSession));

      // Set personalized greeting
      setMessages([{
        ...initialGreeting,
        id: 'greeting-' + Date.now(),
        content: `Hello ${regName.trim()}! I am Masdika's personal AI Assistant.\n\nHow can I help you today? You can ask about our **Cloud VPS, 1-Click Catalog Apps, Web Hosting**, or even ask me about my **Portfolio and Work Experience**!`,
      }]);

      toast.success('Chat session started successfully!', {
        className: 'bg-[#011627] border-cyan-500/20 text-white',
      });
    } catch {
      toast.error('Network error occurred. Please try again.');
    } finally {
      setIsRegistering(false);
    }
  };

  // ─── Verification handler ────────────────────────────────────────────
  const handleVerify = async () => {
    if (!verificationOtp.trim() || verificationOtp.trim().length !== 6) {
      toast.error('Please enter the 6-digit verification code.');
      return;
    }
    
    setIsVerifying(true);
    try {
      const res = await fetch('/api/chat/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: tempSessionId,
          otp: verificationOtp.trim(),
        }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        toast.error(data.error || 'Verification failed.');
        setIsVerifying(false);
        return;
      }

      // Verification successful
      const cleanPhone = regPhone.replace(/[\s\-()]/g, '');
      const newSession: SessionInfo = {
        sessionId: tempSessionId,
        name: regName.trim(),
        email: regEmail.trim(),
        phone: cleanPhone,
        createdAt: Date.now(),
      };

      setSessionInfo(newSession);
      setIsRegistered(true);
      setRequiresVerification(false);
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(newSession));

      const newGreeting = [{
        ...initialGreeting,
        id: 'greeting-' + Date.now(),
        content: `Hello ${regName.trim()}! I am Masdika's personal AI Assistant.\n\nHow can I help you today? You can ask about our **Cloud VPS, 1-Click Catalog Apps, Web Hosting**, or even ask me about my **Portfolio and Work Experience**!`,
      }];
      setMessages(newGreeting);
      localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify({ messages: newGreeting, timestamp: Date.now() }));

      toast.success('Email verified! You can now start chatting.', {
        className: 'bg-[#011627] border-cyan-500/20 text-white',
      });
    } catch {
      toast.error('Network error occurred. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  // ─── End chat handler ────────────────────────────────────────────────
  const handleEndChat = useCallback(async () => {
    if (!sessionInfo) return;

    setIsEnding(true);
    try {
      const res = await fetch('/api/chat/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionInfo.sessionId }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Chat session ended.', {
          className: 'bg-[#011627] border-cyan-500/20 text-white',
          duration: 5000,
        });
      } else {
        console.error('End chat error:', data.error);
      }
    } catch {
      console.error('Failed to end chat');
    } finally {
      // Reset state regardless of API result
      setSessionInfo(null);
      setIsRegistered(false);
      setMessages([initialGreeting]);
      setShowConfirmEnd(false);
      setIsEnding(false);
      setRegName('');
      setRegEmail('');
      setRegPhone('');
      localStorage.removeItem(STORAGE_KEY_SESSION);
      localStorage.removeItem(STORAGE_KEY_MESSAGES);
    }
   
  }, [sessionInfo]);

  const handleClearChat = () => {
    setMessages([{ ...initialGreeting, id: 'greeting-' + Date.now() }]);
    localStorage.removeItem(STORAGE_KEY_MESSAGES);
    setShowConfirmClear(false);
    toast.success('Chat history has been cleared', {
      className: 'bg-[#011627] border-cyan-500/20 text-white',
    });
  };

  // ─── Sound Effects (Web Audio API — no file needed) ──────────────────────
  const playBeep = useCallback((type: 'start' | 'stop') => {
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;

      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      if (type === 'start') {
        // Two ascending tones — "ready to listen"
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(660, ctx.currentTime + 0.12);
        gainNode.gain.setValueAtTime(0.25, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      } else {
        // One descending tone — "stopped"
        osc.frequency.setValueAtTime(660, ctx.currentTime);
        osc.frequency.setValueAtTime(330, ctx.currentTime + 0.12);
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch {
      // AudioContext not available — silently skip
    }
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Stop any playing audio while recording
      audioCtxRef.current?.suspend().catch(() => {});

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setIsTranscribing(true);
        
        try {
          const formData = new FormData();
          formData.append('file', audioBlob, 'recording.webm');
          if (sessionInfo?.sessionId) {
            formData.append('sessionId', sessionInfo.sessionId);
          }
          
          const res = await fetch('/api/chat/transcribe', {
            method: 'POST',
            body: formData,
          });
          
          const data = await res.json();
          if (res.ok && data.text) {
            setInputValue(data.text);
          } else {
            toast.error(data.error || 'Transcription failed');
          }
        } catch (e) {
          toast.error('Network error during transcription');
        } finally {
          setIsTranscribing(false);
          // Stop mic tracks
          stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      playBeep('start');
    } catch (err: any) {
      console.warn('Microphone warning/error:', err.message || err.name);
      if (err.name === 'NotAllowedError' || err.message?.includes('Permission denied')) {
        toast.error('Microphone blocked! Please click the icon next to the URL bar and select "Allow".');
      } else if (err.name === 'NotFoundError') {
        toast.error('No microphone device found on your computer.');
      } else if (!navigator.mediaDevices) {
        toast.error('Your browser does not support audio recording in this environment (requires HTTPS or Localhost).');
      } else {
        toast.error(`Mic error: ${err.message || 'Unknown error'}`);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      playBeep('stop');
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !sessionInfo) return;

    // Client-side injection guard
    if (detectClientInjection(inputValue)) {
      setInputWarning(
        'Message contains disallowed patterns. Please try asking something else.'
      );
      return;
    }

    // Enforce client-side length cap
    const trimmedInput = inputValue.substring(0, MAX_INPUT_LENGTH);
    setInputWarning(null);

    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmedInput,
      timestamp: Date.now()
    };

    const modelMsgId = (Date.now() + 1).toString();

    setMessages(prev => [...prev, newUserMsg]);
    setInputValue('');
    setIsLoading(true);

    // Create a placeholder model message that we'll update progressively
    const placeholderMsg: Message = {
      id: modelMsgId,
      role: 'model',
      content: '',
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, placeholderMsg]);

    // AbortController for 30s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          message: newUserMsg.content,
          sessionId: sessionInfo.sessionId,
          history: messages.filter(m => m.id !== 'greeting-initial' && !m.id.startsWith('greeting-')).map(m => ({ role: m.role, content: m.content }))
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to connect to the server.';
        let sessionExpired = false;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          sessionExpired = errorData.sessionExpired === true;
        } catch { }

        // Handle session expired
        if (sessionExpired) {
          setSessionInfo(null);
          setIsRegistered(false);
          setMessages([{
            ...initialGreeting,
            id: 'greeting-expired-' + Date.now(),
            content: '⏰ The chat session has ended due to 1 hour of inactivity. Please register again to start a new session.',
          }]);
          localStorage.removeItem(STORAGE_KEY_SESSION);
          localStorage.removeItem(STORAGE_KEY_MESSAGES);
          toast.info('Chat session has ended. Please start a new session.', {
            className: 'bg-[#011627] border-cyan-500/20 text-white',
          });
          return;
        }

        setMessages(prev =>
          prev.map(msg =>
            msg.id === modelMsgId ? { ...msg, content: errorMessage } : msg
          )
        );
        return;
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const jsonResponse = await response.json();
        
        if (jsonResponse.adminOnline) {
          // Remove the placeholder message since the admin will reply via sync
          setMessages(prev => prev.filter(msg => msg.id !== modelMsgId));
          // Optionally show a toast
          toast.success(jsonResponse.message || 'Pesan diteruskan ke Admin', {
            className: 'bg-[#011627] border-cyan-500/20 text-white',
          });
        } else if (jsonResponse.error) {
          setMessages(prev =>
            prev.map(msg =>
              msg.id === modelMsgId ? { ...msg, content: jsonResponse.error } : msg
            )
          );
        }
        setIsLoading(false);
        clearTimeout(timeoutId);
        return;
      }

      // Read the SSE stream
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.text) {
                fullText += parsed.text;
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === modelMsgId ? { ...msg, content: fullText } : msg
                  )
                );
              }
            } catch {
              // Skip malformed chunks
            }
          }
        }
      }

      // Ensure we have visible content (trim whitespace-only responses)
      const finalText = fullText.trim();
      if (!finalText) {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === modelMsgId
              ? { ...msg, content: 'Sorry, the AI did not respond. Please try asking again.' }
              : msg
          )
        );
      } else if (finalText !== fullText) {
        // Update with trimmed version
        setMessages(prev =>
          prev.map(msg =>
            msg.id === modelMsgId ? { ...msg, content: finalText } : msg
          )
        );
      }
    } catch (error: unknown) {
      const isTimeout = error instanceof Error && error.name === 'AbortError';
      setMessages(prev =>
        prev.map(msg =>
          msg.id === modelMsgId
            ? {
                ...msg,
                content: isTimeout
                  ? 'Request timed out (1 hours). The AI server is too busy, please try again shortly.'
                  : 'Sorry, a network error occurred. Please try again later.',
              }
            : msg
        )
      );
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  const parseMarkdown = (text: string) => {
    return parseChatMarkdown(text);
  };

  if (pathname && (pathname.startsWith('/admin') || pathname.startsWith('/dashboard/tickets'))) {
    return null;
  }

  return (
    <div className="print:hidden">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "fixed bottom-20 right-4 sm:bottom-24 sm:right-6 w-[calc(100vw-32px)] sm:w-[370px] max-h-[85vh] sm:max-h-[88vh] backdrop-blur-xl border rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden",
              isRegistered ? "h-[520px]" : "h-auto",
              isDark
                ? "bg-[var(--surface)]/95 border-[var(--border-primary)] shadow-[0_24px_60px_rgba(0,0,0,0.75)]"
                : "bg-white/95 border-slate-200 shadow-slate-900/15"
            )}
          >
            {/* Header */}
            <div className={cn("flex items-center justify-between px-4 py-3.5 border-b", isDark ? "border-[var(--border-primary)] bg-[var(--surface-secondary)]/80" : "border-slate-200 bg-slate-50/80")}>
              <div className="flex items-center gap-3">
                <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center shrink-0", isDark ? "bg-cyan-500/10 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
                  <Bot size={18} strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={cn("font-bold text-xs sm:text-sm tracking-tight truncate", isDark ? "text-white" : "text-slate-900")}>
                      Masdika AI Assistant
                    </h3>
                  </div>
                  <p className={cn("text-[11px] font-medium flex items-center gap-1.5 mt-0.5 truncate", isDark ? "text-zinc-400" : "text-slate-500")}>
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0"></span>
                    {isRegistered ? `${sessionInfo?.name}` : 'Online • Cloud & Support'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 relative">
                {isRegistered && (
                  <>
                    {/* End Chat Button */}
                    <button
                      onClick={() => setShowConfirmEnd(true)}
                      title="End chat session"
                      aria-label="End chat session"
                      className="text-gray-400 hover:text-cyan-400 transition-colors p-1.5 rounded-lg hover:bg-white/5"
                    >
                      <LogOut size={15} aria-hidden="true" />
                    </button>

                    {/* Clear Chat Button */}
                    {messages.length > 0 && (
                      <button
                        onClick={() => setShowConfirmClear(!showConfirmClear)}
                        title="Clear chat"
                        aria-label="Clear chat"
                        className="text-gray-400 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-white/5"
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    )}
                  </>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  aria-label="Close chat"
                  className={cn("transition-colors p-1.5 rounded-lg", isDark ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-slate-400 hover:text-slate-700 hover:bg-slate-200/60")}
                >
                  <X size={17} aria-hidden="true" />
                </button>

                {/* Confirm Clear Popover */}
                {showConfirmClear && (
                  <div className={cn("absolute right-0 top-10 w-52 rounded-xl p-3.5 shadow-2xl z-50 flex flex-col gap-2.5 border", isDark ? "bg-[#0f172a] border-cyan-500/20" : "bg-white border-slate-200")}>
                    <p className={cn("text-xs text-center font-medium", isDark ? "text-zinc-300" : "text-slate-700")}>Clear all chat?</p>
                    <div className="flex gap-2">
                      <button onClick={() => setShowConfirmClear(false)} className={cn("flex-1 py-1.5 px-2 rounded-lg text-xs transition-colors border font-medium", isDark ? "bg-white/5 hover:bg-white/10 text-zinc-300 border-white/10" : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200")}>Cancel</button>
                      <button onClick={handleClearChat} className="flex-1 py-1.5 px-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs transition-colors font-medium shadow-lg shadow-red-500/20">Clear</button>
                    </div>
                  </div>
                )}

                {/* Confirm End Chat Popover */}
                {showConfirmEnd && (
                  <div className={cn("absolute right-0 top-10 w-56 rounded-xl p-3.5 shadow-2xl z-50 flex flex-col gap-2 border", isDark ? "bg-[#0f172a] border-cyan-500/20" : "bg-white border-slate-200")}>
                    <p className={cn("text-xs text-center font-medium", isDark ? "text-zinc-300" : "text-slate-700")}>End chat session?</p>
                    <p className={cn("text-[10px] text-center", isDark ? "text-zinc-500" : "text-slate-400")}>A transcript will be sent to your email</p>
                    <div className="flex gap-2">
                      <button onClick={() => setShowConfirmEnd(false)} className={cn("flex-1 py-1.5 px-2 rounded-lg text-xs transition-colors border font-medium", isDark ? "bg-white/5 hover:bg-white/10 text-zinc-300 border-white/10" : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200")}>Cancel</button>
                      <button onClick={handleEndChat} disabled={isEnding} className="flex-1 py-1.5 px-2 rounded-lg bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 text-xs transition-colors font-semibold disabled:opacity-50">
                        {isEnding ? 'Ending...' : 'End'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ─── Registration Form OR Chat Messages ─── */}
            <AnimatePresence mode="wait">
              {!isRegistered ? (
                /* Registration Form / Verification Form */
                <motion.div 
                  key="auth-forms"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-y-auto p-4 sm:p-5 flex flex-col hide-scrollbar"
                >
                  <div className="shrink-0">
                    
                    <AnimatePresence mode="wait">
                      {requiresVerification ? (
                        /* Verification Form */
                        <motion.div
                          key="verify"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                        >
                      <div className="mb-4">
                        <div className="flex items-center gap-3 mb-2.5">
                          <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center shrink-0", isDark ? "bg-cyan-500/10 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
                            <Mail size={18} strokeWidth={2} />
                          </div>
                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-500 dark:text-cyan-400 block">
                              Security Check
                            </span>
                            <h3 className={cn("font-bold text-base tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                              Verify Your Email
                            </h3>
                          </div>
                        </div>
                        <p className={cn("text-xs leading-relaxed", isDark ? "text-zinc-400" : "text-slate-500")}>
                          We sent a 6-digit verification code to <strong className={isDark ? "text-zinc-200" : "text-slate-700"}>{regEmail}</strong>.
                        </p>
                      </div>

                      <div className="space-y-3.5">
                        <div className="flex justify-between gap-1.5 sm:gap-2">
                          {otpValues.map((digit, idx) => (
                            <input
                              key={idx}
                              ref={(el) => { otpRefs.current[idx] = el; }}
                              type="text"
                              inputMode="numeric"
                              maxLength={6} // Allow pasting
                              value={digit}
                              onChange={(e) => handleOtpChange(idx, e.target.value)}
                              onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                              className={cn("w-full h-11 border rounded-xl text-center text-base font-bold text-cyan-400 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all focus:outline-none", isDark ? "bg-[var(--surface-secondary)] border-[var(--border-primary)]" : "bg-slate-50 border-slate-200 text-cyan-600")}
                            />
                          ))}
                        </div>

                        <div className="text-center">
                          {otpTimeLeft > 0 ? (
                            <p className="text-[11px] text-zinc-400">
                              Code expires in <span className="text-cyan-400 font-mono font-semibold">{formatOtpTime(otpTimeLeft)}</span>
                            </p>
                          ) : (
                            <p className="text-[11px] text-red-400">
                              Verification code expired. Please request a new one.
                            </p>
                          )}
                        </div>

                        <button
                          onClick={handleVerify}
                          disabled={isVerifying || verificationOtp.length !== 6}
                          className="relative w-full h-10 cursor-pointer bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 font-bold text-xs rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center overflow-hidden"
                        >
                          <AnimatePresence>
                            {isVerifying ? (
                              <motion.div
                                key="verifying"
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 20 }}
                                transition={{ duration: 0.2 }}
                                className="absolute inset-0 flex items-center justify-center gap-2"
                              >
                                <Loader2 size={15} className="animate-spin" />
                                <span>Verifying...</span>
                              </motion.div>
                            ) : (
                              <motion.div
                                key="idle"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.2 }}
                                className="absolute inset-0 flex items-center justify-center gap-2"
                              >
                                <CheckCircle size={15} />
                                <span>Verify & Start Session</span>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </button>

                        <button
                          onClick={() => setRequiresVerification(false)}
                          disabled={isVerifying}
                          className="w-full py-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
                        >
                          Change Email / Go Back
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    /* Registration Form */
                    <motion.div
                      key="register"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className={cn("p-3.5 rounded-xl border mb-4", isDark ? "bg-[var(--surface-secondary)]/70 border-[var(--border-primary)]" : "bg-slate-50 border-slate-200/80")}>
                        <div className="flex items-start gap-3">
                          <div className={cn("w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 mt-0.5", isDark ? "bg-cyan-500/10 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
                            <Headset size={17} strokeWidth={2} />
                          </div>
                          <div className="min-w-0">
                            <h4 className={cn("font-bold text-xs sm:text-sm leading-snug mb-1", isDark ? "text-white" : "text-slate-900")}>
                              Start a Support or Architecture Chat
                            </h4>
                            <p className={cn("text-[11px] leading-relaxed", isDark ? "text-zinc-400" : "text-slate-500")}>
                              Ask about Cloud VPS, 1-Click Apps, DevOps consulting, or connect with an engineer.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        {/* Name */}
                        <div>
                          <label className={cn("block text-[11px] font-semibold mb-1", isDark ? "text-zinc-300" : "text-slate-700")}>
                            Full Name
                          </label>
                          <div className="relative">
                            <UserCircle size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input
                              type="text"
                              value={regName}
                              onChange={(e) => { setRegName(e.target.value); if (regErrors.name) setRegErrors(p => ({...p, name: undefined})); }}
                              placeholder="e.g. Budi Santoso"
                              maxLength={100}
                              className={cn("w-full border rounded-xl py-2 pl-9 pr-3 text-xs sm:text-sm focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all focus:outline-none", isDark ? "bg-[var(--surface-secondary)] text-white placeholder-zinc-500" : "bg-white text-slate-900 placeholder-slate-400", regErrors.name ? 'border-red-500/50' : (isDark ? 'border-[var(--border-primary)]' : 'border-slate-200'))}
                            />
                          </div>
                          {regErrors.name && <p className="text-[11px] text-red-400 mt-1 pl-1">{regErrors.name}</p>}
                        </div>

                        {/* Email */}
                        <div>
                          <label className={cn("block text-[11px] font-semibold mb-1", isDark ? "text-zinc-300" : "text-slate-700")}>
                            Work or Active Email
                          </label>
                          <div className="relative">
                            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input
                              type="email"
                              value={regEmail}
                              onChange={(e) => { setRegEmail(e.target.value); if (regErrors.email) setRegErrors(p => ({...p, email: undefined})); }}
                              placeholder="name@company.com"
                              maxLength={254}
                              className={cn("w-full border rounded-xl py-2 pl-9 pr-3 text-xs sm:text-sm focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all focus:outline-none", isDark ? "bg-[var(--surface-secondary)] text-white placeholder-zinc-500" : "bg-white text-slate-900 placeholder-slate-400", regErrors.email ? 'border-red-500/50' : (isDark ? 'border-[var(--border-primary)]' : 'border-slate-200'))}
                            />
                          </div>
                          {regErrors.email && <p className="text-[11px] text-red-400 mt-1 pl-1">{regErrors.email}</p>}
                        </div>

                        {/* Phone */}
                        <div>
                          <label className={cn("block text-[11px] font-semibold mb-1", isDark ? "text-zinc-300" : "text-slate-700")}>
                            WhatsApp Number
                          </label>
                          <div className="relative">
                            <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input
                              type="tel"
                              value={regPhone}
                              onChange={(e) => { setRegPhone(e.target.value); if (regErrors.phone) setRegErrors(p => ({...p, phone: undefined})); }}
                              placeholder="0812xxxxxxxx"
                              maxLength={15}
                              className={cn("w-full border rounded-xl py-2 pl-9 pr-3 text-xs sm:text-sm focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all focus:outline-none", isDark ? "bg-[var(--surface-secondary)] text-white placeholder-zinc-500" : "bg-white text-slate-900 placeholder-slate-400", regErrors.phone ? 'border-red-500/50' : (isDark ? 'border-[var(--border-primary)]' : 'border-slate-200'))}
                            />
                          </div>
                          {regErrors.phone && <p className="text-[11px] text-red-400 mt-1 pl-1">{regErrors.phone}</p>}
                        </div>

                        <button
                          onClick={handleRegister}
                          disabled={isRegistering}
                          className="relative w-full h-10 cursor-pointer bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 font-bold text-xs rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center overflow-hidden mt-2 shadow-[0_8px_20px_rgba(34,211,238,0.2)]"
                        >
                          <AnimatePresence>
                            {isRegistering ? (
                              <motion.div
                                key="starting"
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 20 }}
                                transition={{ duration: 0.2 }}
                                className="absolute inset-0 flex items-center justify-center gap-2"
                              >
                                <Loader2 size={15} className="animate-spin" />
                                <span>Connecting...</span>
                              </motion.div>
                            ) : (
                              <motion.div
                                key="idle"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.2 }}
                                className="absolute inset-0 flex items-center justify-center gap-2"
                              >
                                <Send size={14} />
                                <span>Start Conversation</span>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </button>
                      </div>
                    </motion.div>
                  )}
                  </AnimatePresence>
                  
                  <p className={cn("text-[10px] text-center mt-3.5 pt-3 border-t leading-relaxed", isDark ? "text-zinc-500 border-[var(--border-primary)]" : "text-slate-400 border-slate-100")}>
                    A copy of the chat transcript will be sent to your email when the session ends.
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="chat-messages"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="flex-1 flex flex-col min-h-0"
              >
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 hide-scrollbar">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={cn("flex-shrink-0 w-6 h-6 mt-1 rounded-full flex items-center justify-center overflow-hidden border", msg.role === 'user' ? (isDark ? 'bg-[#0f172a] border-cyan-500/20' : 'bg-slate-100 border-slate-200') : (isDark ? 'bg-[#0F3B4A] border-cyan-400' : 'bg-cyan-50 border-cyan-500'))}>
                          {msg.role === 'user' ? (
                            <img
                              referrerPolicy="no-referrer"
                              src={`/api/avatar?email=${encodeURIComponent(sessionInfo?.email || '')}&name=${encodeURIComponent(sessionInfo?.name || 'U')}`}
                              alt="User"
                              className="w-full h-full object-cover"
                              loading="lazy"
                              decoding="async"
                              onError={(e) => {
                                const target = e.currentTarget;
                                if (!target.src.includes('fallback=1')) {
                                  target.src = `/api/avatar?fallback=1&email=${encodeURIComponent(sessionInfo?.email || '')}&name=${encodeURIComponent(sessionInfo?.name || 'U')}`;
                                }
                              }}
                            />
                          ) : msg.isAdmin ? (
                            <Headset size={12} className="text-cyan-400" strokeWidth={2.5} />
                          ) : (
                            <Bot size={12} className="text-cyan-400" strokeWidth={2.5} />
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          {msg.isAdmin && (
                            <span className="text-[10px] text-cyan-400 font-semibold mb-1 ml-1 tracking-wide uppercase">
                              Masdika Support
                            </span>
                          )}
                          {msg.role === 'user' ? (
                            <div className="p-3 rounded-2xl text-sm bg-cyan-600/80 text-white rounded-tr-none break-words min-w-0">
                              {msg.content}
                            </div>
                          ) : msg.content ? (
                            <div
                              className={cn("p-3 rounded-2xl text-sm rounded-tl-none prose prose-sm max-w-none min-w-0 overflow-x-auto", isDark ? "bg-[var(--surface-secondary)] border border-[var(--border-primary)] text-gray-200 prose-invert" : "bg-slate-100 text-slate-800")}
                              dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) }}
                            />
                          ) : (
                            // Empty placeholder while streaming starts
                            <div className={cn("p-3 rounded-2xl text-sm rounded-tl-none italic", isDark ? "bg-[var(--surface-secondary)] border border-cyan-500/20 text-gray-500" : "bg-slate-100 text-slate-400")}>
                              <Loader2 size={14} className="animate-spin text-cyan-400 inline mr-2" />
                              Typing...
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="flex gap-2 max-w-[80%] flex-row">
                        <div className={cn("flex-shrink-0 w-6 h-6 mt-1 rounded-full flex items-center justify-center border", isDark ? "bg-[#0F3B4A] border-cyan-400" : "bg-cyan-50 border-cyan-500")}>
                          <Bot size={12} className="text-cyan-400" strokeWidth={2.5} />
                        </div>
                        <div className={cn("p-3 rounded-2xl rounded-tl-none text-sm flex items-center gap-2", isDark ? "bg-[var(--surface-secondary)] border border-cyan-500/20 text-gray-200" : "bg-slate-100 text-slate-700")}>
                          <Loader2 size={14} className="animate-spin text-cyan-400" />
                          Please Wait...
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className={cn("p-3 border-t backdrop-blur-sm", isDark ? "border-[var(--border-primary)] bg-[var(--surface-secondary)]" : "border-slate-200 bg-white")}>
                  {inputWarning && (
                    <div className="flex items-center gap-1.5 mb-2 px-1 text-xs text-cyan-400">
                      <AlertTriangle size={12} />
                      <span>{inputWarning}</span>
                    </div>
                  )}
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => {
                        const val = e.target.value.substring(0, MAX_INPUT_LENGTH);
                        setInputValue(val);
                        if (inputWarning) setInputWarning(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) handleSendMessage();
                      }}
                      placeholder="Type a message..."
                      maxLength={MAX_INPUT_LENGTH}
                      className={cn("w-full border rounded-full py-2 pl-4 pr-20 text-sm focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all", isDark ? "bg-[var(--surface)] border-[var(--border-primary)] text-white placeholder-gray-500" : "bg-slate-100 border-slate-200 text-slate-900 placeholder-slate-400")}
                    />
                    <div className="absolute right-2 flex items-center gap-1">
                      <button
                        onClick={toggleRecording}
                        disabled={isLoading || isTranscribing}
                        title={isRecording ? "Stop recording" : "Record voice note"}
                        className={`p-1.5 rounded-full transition-colors ${
                          isRecording 
                            ? 'bg-red-500 text-white animate-pulse' 
                            : 'text-gray-400 hover:text-cyan-400 hover:bg-white/5'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {isTranscribing ? <Loader2 size={14} className="animate-spin" /> : (isRecording ? <MicOff size={14} /> : <Mic size={14} />)}
                      </button>
                      <button
                        onClick={handleSendMessage}
                        disabled={!inputValue.trim() || isLoading}
                        aria-label="Send message"
                        className="p-1.5 bg-gradient-to-tr from-cyan-400 to-cyan-500 rounded-full text-white disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform"
                      >
                        <Send size={14} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  {inputValue.length > MAX_INPUT_LENGTH * 0.8 && (
                    <p className="text-right text-xs text-gray-500 mt-1 pr-1">
                      {inputValue.length}/{MAX_INPUT_LENGTH}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Button */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex items-center gap-2.5">
        <AnimatePresence>
          {isOpen && (
            <motion.span
              key="close-label"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.18 }}
              onClick={() => setIsOpen(false)}
              className={cn(
                "hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono font-semibold cursor-pointer select-none",
                isDark
                  ? "bg-[#0c0c0e] border-white/10 text-zinc-300"
                  : "bg-white border-slate-200 text-slate-600 shadow-sm"
              )}
            >
              Close
              <kbd className={cn(
                "px-1 rounded text-[10px] border",
                isDark ? "border-white/10 text-zinc-500" : "border-slate-200 text-slate-400"
              )}>Esc</kbd>
            </motion.span>
          )}
        </AnimatePresence>
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? "Close AI chat" : "Open AI chat"}
          aria-expanded={isOpen}
          initial={reduceMotion ? false : { scale: 0, opacity: 0, rotate: -20 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.4 }}
          whileHover={reduceMotion ? undefined : { y: -3 }}
          whileTap={{ scale: 0.9 }}
          className={cn(
            "group relative w-12 h-12 sm:w-[52px] sm:h-[52px] rounded-2xl p-[1.5px] overflow-hidden cursor-pointer",
            isDark
              ? "bg-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.55)]"
              : "bg-slate-200 shadow-lg shadow-slate-900/10"
          )}
        >
          {/* Rotating cyan light sweep around the border */}
          {!reduceMotion && (
            <motion.span
              aria-hidden="true"
              className="absolute inset-[-60%] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_240deg,rgba(34,211,238,0.15)_280deg,#22d3ee_330deg,#a5f3fc_350deg,transparent_360deg)]"
              animate={{ rotate: 360 }}
              transition={{ duration: isOpen ? 1.6 : 3.2, repeat: Infinity, ease: "linear" }}
            />
          )}

          {/* Inner face */}
          <span
            className={cn(
              "relative z-10 w-full h-full rounded-[14px] flex items-center justify-center transition-colors duration-200",
              isDark
                ? "bg-[#0c0c0e] text-zinc-200 group-hover:text-cyan-400"
                : "bg-white text-slate-700 group-hover:text-cyan-600"
            )}
          >
            {/* Soft cyan glow on hover */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-[14px] bg-[radial-gradient(circle_at_50%_40%,rgba(34,211,238,0.18),transparent_65%)] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            />

            <AnimatePresence mode="wait" initial={false}>
              {isOpen ? (
                <motion.span
                  key="close"
                  className="relative flex"
                  initial={{ rotate: -90, scale: 0.4, opacity: 0 }}
                  animate={{ rotate: 0, scale: 1, opacity: 1 }}
                  exit={{ rotate: 90, scale: 0.4, opacity: 0, transition: { duration: 0.15 } }}
                  transition={{ type: "spring", stiffness: 320, damping: 18 }}
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.4] text-cyan-500 dark:text-cyan-400" aria-hidden="true" />
                </motion.span>
              ) : (
                <motion.span
                  key="bot"
                  className="relative flex"
                  initial={{ rotate: 90, scale: 0.4, opacity: 0 }}
                  animate={
                    reduceMotion
                      ? { rotate: 0, scale: 1, opacity: 1 }
                      : {
                          rotate: [0, 0, -12, 10, -6, 0],
                          y: [0, -3, -3, -1, 0, 0],
                          scale: 1,
                          opacity: 1,
                        }
                  }
                  exit={{ rotate: -90, scale: 0.4, opacity: 0, y: 0, transition: { duration: 0.15 } }}
                  transition={
                    reduceMotion
                      ? { duration: 0.18 }
                      : {
                          rotate: { duration: 1.1, repeat: Infinity, repeatDelay: 3.5, ease: "easeInOut" },
                          y: { duration: 1.1, repeat: Infinity, repeatDelay: 3.5, ease: "easeInOut" },
                          scale: { duration: 0.18 },
                          opacity: { duration: 0.18 },
                        }
                  }
                >
                  <Bot className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2]" aria-hidden="true" />
                </motion.span>
              )}
            </AnimatePresence>
          </span>
        </motion.button>
      </div>
    </div>
  );
}
