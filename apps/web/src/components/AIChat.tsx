"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, User, Loader2, Trash2, AlertTriangle, LogOut, Mail, Phone, UserCircle, CheckCircle, Mic, MicOff, Headset } from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
import { toast } from 'sonner';
import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';

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
  return `
    <div class="relative group mt-4 mb-4 rounded-lg bg-[#0d1117] border border-cyan-500/20 overflow-hidden">
      <div class="flex items-center justify-between px-3 py-1.5 bg-[#011627] border-b border-cyan-500/20">
        <span class="text-xs text-cyan-400 font-mono">${lang || 'code'}</span>
        <button class="copy-code-btn text-xs text-gray-400 hover:text-white transition-colors focus:outline-none flex items-center gap-1">
          Copy
        </button>
      </div>
      <div class="overflow-x-auto p-3 scrollbar-thin scrollbar-thumb-cyan-500/30 scrollbar-track-transparent">
        <pre class="!m-0 !p-0 !bg-transparent"><code class="language-${lang || ''}">${escapedText}</code></pre>
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
    content: "Hello! I am Masdika's personal AI Assistant.\n\nHow can I help you today? You can ask about our **Cloud VPS, Managed Kubernetes (K3s), Web Hosting**, or even ask me about my **Portfolio and Work Experience**!",
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        content: `Hello ${regName.trim()}! I am Masdika's personal AI Assistant.\n\nHow can I help you today? You can ask about our **Cloud VPS, Managed Kubernetes (K3s), Web Hosting**, or even ask me about my **Portfolio and Work Experience**!`,
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
        content: `Hello ${regName.trim()}! I am Masdika's personal AI Assistant.\n\nHow can I help you today? You can ask about our **Cloud VPS, Managed Kubernetes (K3s), Web Hosting**, or even ask me about my **Portfolio and Work Experience**!`,
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    marked.setOptions({
      gfm: true,
      breaks: true,
    });
    const rawMarkup = marked.parse(text) as string;
    return DOMPurify.sanitize(rawMarkup, { ADD_ATTR: ['target'] });
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
            className={cn("fixed bottom-20 right-4 sm:bottom-24 sm:right-6 w-[calc(100vw-32px)] sm:w-96 h-[560px] max-h-[85vh] sm:max-h-[90vh] backdrop-blur-sm border rounded-xl shadow-2xl flex flex-col z-50 overflow-hidden", isDark ? "bg-[#011627]/90 border-cyan-500/20" : "bg-white border-slate-200")}
          >
            {/* Header */}
            <div className={cn("flex items-center justify-between p-4 border-b", isDark ? "border-cyan-500/20 bg-[#011627]/80" : "border-slate-200 bg-white")}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#0F3B4A] border-[1.5px] border-cyan-400 flex items-center justify-center text-cyan-400 shadow-[2px_2px_0_#22d3ee]">
                  <Bot size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className={cn("font-semibold text-sm", isDark ? "text-white" : "text-slate-900")}>AI Assistant</h3>
                  <p className="text-xs text-cyan-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                    {isRegistered ? `${sessionInfo?.name}` : 'Online'}
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
                      className="text-gray-400 hover:text-cyan-400 transition-colors p-1"
                    >
                      <LogOut size={17} aria-hidden="true" />
                    </button>

                    {/* Clear Chat Button */}
                    {messages.length > 0 && (
                      <button
                        onClick={() => setShowConfirmClear(!showConfirmClear)}
                        title="Clear chat"
                        aria-label="Clear chat"
                        className="text-gray-400 hover:text-red-400 transition-colors p-1"
                      >
                        <Trash2 size={17} aria-hidden="true" />
                      </button>
                    )}
                  </>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  aria-label="Close chat"
                  className="text-gray-400 hover:text-white transition-colors p-1"
                >
                  <X size={20} aria-hidden="true" />
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
                      <button onClick={handleEndChat} disabled={isEnding} className="flex-1 py-1.5 px-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-[#011627] text-xs transition-colors font-medium shadow-lg shadow-cyan-500/20 disabled:opacity-50">
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
                  className="flex-1 overflow-y-auto p-3 sm:p-4 flex flex-col hide-scrollbar"
                >
                  <div className="my-auto shrink-0 py-1">
                    
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
                      <div className="text-center mb-4">
                        <div className={cn("w-12 h-12 mx-auto mb-2 rounded-full border-2 border-cyan-400 flex items-center justify-center text-cyan-400", isDark ? "bg-[#0F3B4A]" : "bg-cyan-50")}>
                          <Mail size={24} strokeWidth={2} />
                        </div>
                        <h3 className={cn("font-bold text-lg tracking-tight mb-1", isDark ? "text-white" : "text-slate-900")}>Verify Email</h3>
                        <p className={cn("text-sm leading-relaxed px-2", isDark ? "text-gray-400" : "text-slate-500")}>We sent a 6-digit code to <strong>{regEmail}</strong>. Enter it below to start chatting.</p>
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-center gap-2">
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
                              className={cn("w-10 h-12 sm:w-12 sm:h-14 border rounded-lg text-center text-xl font-bold text-cyan-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all focus:outline-none", isDark ? "bg-[#0d1117] border-cyan-500/20" : "bg-white border-slate-200")}
                            />
                          ))}
                        </div>

                        <div className="text-center">
                          {otpTimeLeft > 0 ? (
                            <p className="text-xs text-gray-400">
                              Code expires in <span className="text-cyan-400 font-mono">{formatOtpTime(otpTimeLeft)}</span>
                            </p>
                          ) : (
                            <p className="text-xs text-red-400">
                              Verification code expired. Please request a new one.
                            </p>
                          )}
                        </div>

                        <button
                          onClick={handleVerify}
                          disabled={isVerifying || verificationOtp.length !== 6}
                          className="relative w-full h-[46px] cursor-pointer bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white font-bold text-base rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center overflow-hidden"
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
                                <Loader2 size={18} className="animate-spin" />
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
                                <CheckCircle size={18} />
                                <span>Verify Code</span>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </button>

                        <button
                          onClick={() => setRequiresVerification(false)}
                          disabled={isVerifying}
                          className="w-full py-2 text-xs text-gray-400 hover:text-white transition-colors"
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
                      <div className="text-center mb-4">
                        <div className={cn("w-12 h-12 mx-auto mb-2 rounded-full border-2 border-cyan-400 flex items-center justify-center text-cyan-400", isDark ? "bg-[#0F3B4A]" : "bg-cyan-50")}>
                          <Bot size={24} strokeWidth={2} />
                        </div>
                        <h3 className={cn("font-bold text-lg tracking-tight mb-1", isDark ? "text-white" : "text-slate-900")}>Start Conversation</h3>
                        <p className={cn("text-sm leading-relaxed px-2", isDark ? "text-gray-400" : "text-slate-500")}>Please fill in your details below to start a chat session with the AI Assistant</p>
                      </div>

                      <div className="space-y-2.5">
                        {/* Name */}
                        <div>
                          <div className="relative">
                            <UserCircle size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                              type="text"
                              value={regName}
                              onChange={(e) => { setRegName(e.target.value); if (regErrors.name) setRegErrors(p => ({...p, name: undefined})); }}
                              placeholder="Full Name"
                              maxLength={100}
                              className={cn("w-full border rounded-lg py-2.5 pl-10 pr-3 text-base focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all", isDark ? "bg-[#0d1117] text-white placeholder-gray-500" : "bg-white text-slate-900 placeholder-slate-400", regErrors.name ? 'border-red-500/50' : (isDark ? 'border-cyan-500/20' : 'border-slate-200'))}
                            />
                          </div>
                          {regErrors.name && <p className="text-xs text-red-400 mt-1 pl-1">{regErrors.name}</p>}
                        </div>

                        {/* Email */}
                        <div>
                          <div className="relative">
                            <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                              type="email"
                              value={regEmail}
                              onChange={(e) => { setRegEmail(e.target.value); if (regErrors.email) setRegErrors(p => ({...p, email: undefined})); }}
                              placeholder="Active Email"
                              maxLength={254}
                              className={cn("w-full border rounded-lg py-2.5 pl-10 pr-3 text-base focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all", isDark ? "bg-[#0d1117] text-white placeholder-gray-500" : "bg-white text-slate-900 placeholder-slate-400", regErrors.email ? 'border-red-500/50' : (isDark ? 'border-cyan-500/20' : 'border-slate-200'))}
                            />
                          </div>
                          {regErrors.email && <p className="text-xs text-red-400 mt-1 pl-1">{regErrors.email}</p>}
                        </div>

                        {/* Phone */}
                        <div>
                          <div className="relative">
                            <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                              type="tel"
                              value={regPhone}
                              onChange={(e) => { setRegPhone(e.target.value); if (regErrors.phone) setRegErrors(p => ({...p, phone: undefined})); }}
                              placeholder="WhatsApp No. (08xx)"
                              maxLength={15}
                              className={cn("w-full border rounded-lg py-2.5 pl-10 pr-3 text-base focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all", isDark ? "bg-[#0d1117] text-white placeholder-gray-500" : "bg-white text-slate-900 placeholder-slate-400", regErrors.phone ? 'border-red-500/50' : (isDark ? 'border-cyan-500/20' : 'border-slate-200'))}
                            />
                          </div>
                          {regErrors.phone && <p className="text-xs text-red-400 mt-1 pl-1">{regErrors.phone}</p>}
                        </div>

                        <button
                          onClick={handleRegister}
                          disabled={isRegistering}
                          className="relative w-full h-[46px] cursor-pointer bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white font-bold text-base rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center overflow-hidden mt-1"
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
                                <Loader2 size={18} className="animate-spin" />
                                <span>Starting...</span>
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
                                <Send size={16} />
                                Start Chat
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </button>
                      </div>
                    </motion.div>
                  )}
                  </AnimatePresence>
                  
                  <p className={cn("text-[11px] text-center mt-3 leading-relaxed px-2", isDark ? "text-gray-500" : "text-slate-400")}>
                    By starting the chat, you agree that a transcript of the conversation will be sent to your email when the session ends.
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
                            <img referrerPolicy="no-referrer" src={`/api/avatar?email=${encodeURIComponent(sessionInfo?.email || '')}&name=${encodeURIComponent(sessionInfo?.name || 'U')}`} alt="User" className="w-full h-full object-cover" loading="lazy" decoding="async" />
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
                              className={cn("p-3 rounded-2xl text-sm rounded-tl-none prose prose-sm max-w-none min-w-0 overflow-x-auto", isDark ? "bg-[#011627] border border-cyan-500/20 text-gray-200 prose-invert" : "bg-slate-100 text-slate-800")}
                              dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) }}
                            />
                          ) : (
                            // Empty placeholder while streaming starts
                            <div className={cn("p-3 rounded-2xl text-sm rounded-tl-none italic", isDark ? "bg-[#011627] border border-cyan-500/20 text-gray-500" : "bg-slate-100 text-slate-400")}>
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
                        <div className={cn("p-3 rounded-2xl rounded-tl-none text-sm flex items-center gap-2", isDark ? "bg-[#011627] border border-cyan-500/20 text-gray-200" : "bg-slate-100 text-slate-700")}>
                          <Loader2 size={14} className="animate-spin text-cyan-400" />
                          Please Wait...
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className={cn("p-3 border-t backdrop-blur-sm", isDark ? "border-cyan-500/20 bg-[#011627]/90" : "border-slate-200 bg-white")}>
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
                      className={cn("w-full border rounded-full py-2 pl-4 pr-20 text-sm focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all", isDark ? "bg-[#0d1117] border-cyan-500/20 text-white placeholder-gray-500" : "bg-slate-100 border-slate-200 text-slate-900 placeholder-slate-400")}
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
      <div className="fixed bottom-6 right-6 z-50">
        {/* Ping Animation Ring */}
        {!isOpen && (
          <span className="absolute inset-0 rounded-full border-2 border-cyan-400 animate-ping opacity-50"></span>
        )}
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? "Close AI chat" : "Open AI chat"}
          aria-expanded={isOpen}
          className={cn("relative w-14 h-14 rounded-full flex items-center justify-center border-[3px] shadow-[4px_4px_0_#22d3ee] transition-colors cursor-pointer", isDark ? "bg-[#0F3B4A] text-cyan-400 border-cyan-400 hover:bg-[#164e63]" : "bg-white text-cyan-500 border-cyan-500 hover:bg-slate-50")}
        >
          {isOpen ? <X size={28} className="stroke-[3]" aria-hidden="true" /> : <Bot size={28} className="stroke-[2.5]" aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}
