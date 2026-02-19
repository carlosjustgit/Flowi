import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Message, OnboardingSession } from './types';
import { initChatSession, sendMessageToGemini, generateFinalReport, LiveSession } from './services/geminiService';
import { saveSession, extractClientName } from './services/storageService';
import ChatMessage from './components/ChatMessage';
import AdminDashboard from './components/AdminDashboard';
import { Send, FileText, Loader2, Phone, PhoneOff, Lock, CheckCircle, RotateCcw } from 'lucide-react';
import { FLOWI_AVATAR_URL, UI_TRANSLATIONS, FLOW_LOGO_URL, FLOW_LOGO_FALLBACK } from './constants';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInterviewComplete, setIsInterviewComplete] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  
  // Language Detection State
  const [language] = useState<'en' | 'pt'>(() => {
    if (typeof navigator !== 'undefined' && navigator.language) {
      return navigator.language.toLowerCase().startsWith('pt') ? 'pt' : 'en';
    }
    return 'en';
  });

  const t = UI_TRANSLATIONS[language];
  
  // Live Mode State
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [pendingLiveEnd, setPendingLiveEnd] = useState(false);
  const liveSessionRef = useRef<LiveSession | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Session Persistence
  const sessionIdRef = useRef<string>(Date.now().toString());

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  // Auto-focus input when the bot finishes replying
  useEffect(() => {
    if (!isProcessing && !isInterviewComplete && !showAdmin && !isLiveMode) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isProcessing, isInterviewComplete, showAdmin, isLiveMode]);

  // Graceful Live Session End
  useEffect(() => {
    // Only disconnect if we have a pending end signal AND the agent has finished speaking
    if (pendingLiveEnd && !isAgentSpeaking && isLiveConnected) {
        const timer = setTimeout(() => {
            endLiveSession();
            setPendingLiveEnd(false);
        }, 1500); // 1.5s buffer for natural pause
        return () => clearTimeout(timer);
    }
  }, [pendingLiveEnd, isAgentSpeaking, isLiveConnected]);

  // Helper to save session state to Supabase/localStorage
  const persistSession = useCallback(async (msgs: Message[], rpt: string | null, status: 'in-progress' | 'completed') => {
      const sessionData: OnboardingSession = {
          id: sessionIdRef.current,
          date: new Date().toISOString(),
          clientName: extractClientName(rpt || (msgs.length > 2 ? msgs[msgs.length - 1].text : null)), 
          transcript: msgs,
          report: rpt,
          language: language,
          status: status
      };
      await saveSession(sessionData);
  }, [language]);

  // Initial Welcome
  useEffect(() => {
    const startSession = async () => {
      initChatSession();
      setTimeout(() => {
        const welcomeMsg: Message = {
          id: 'welcome',
          role: 'model',
          text: t.welcomeMessage,
          timestamp: new Date()
        };
        const initialMessages = [welcomeMsg];
        setMessages(initialMessages);
        persistSession(initialMessages, null, 'in-progress');
      }, 600);
    };
    startSession();
  }, [t.welcomeMessage, persistSession]);

  const finalizeInterview = useCallback(async (currentMessages: Message[]) => {
      setIsInterviewComplete(true);
      setIsProcessing(true);
      
      // Generate report strictly for internal record (Admin Dashboard)
      // We do NOT show this to the user anymore.
      const reportText = await generateFinalReport(currentMessages);
      
      persistSession(currentMessages, reportText, 'completed');
      setIsProcessing(false);

      // Add a friendly system message for the user
      const completionMsg: Message = {
          id: 'completion',
          role: 'system',
          text: UI_TRANSLATIONS[language].thankYouMessage,
          timestamp: new Date()
      };
      setMessages(prev => [...prev, completionMsg]);

  }, [persistSession, language]);

  const handleSendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isProcessing) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: text,
      timestamp: new Date()
    };
    
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputValue('');
    setIsProcessing(true);
    
    persistSession(updatedMessages, null, 'in-progress');

    let interviewDone = false;

    try {
      let responseText = await sendMessageToGemini(text);

      if (responseText.includes('[[INTERVIEW_COMPLETE]]')) {
        interviewDone = true;
        responseText = responseText.replace('[[INTERVIEW_COMPLETE]]', '').trim();
      }

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date()
      };
      const finalMessages = [...updatedMessages, botMsg];
      setMessages(finalMessages);
      persistSession(finalMessages, null, 'in-progress');

      if (interviewDone) {
        setIsProcessing(false); 
        finalizeInterview(finalMessages);
      }

    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: 'error',
        role: 'system',
        text: t.connectionError,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      if (!interviewDone) {
         setIsProcessing(false);
      }
    }
  }, [isProcessing, messages, t.connectionError, persistSession, finalizeInterview]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  // --- Live Mode Handlers ---

  const endLiveSession = async () => {
    liveSessionRef.current?.disconnect();
    setIsLiveMode(false);
    setIsLiveConnected(false);
    setIsAgentSpeaking(false);
    setPendingLiveEnd(false);
    setMicVolume(0);

    if (messages.length > 1 && !isInterviewComplete) {
        finalizeInterview(messages);
    }
  };

  const toggleLiveMode = () => {
    if (isLiveMode) {
        endLiveSession();
    } else {
        setIsLiveMode(true);
        setIsLiveConnected(false);
        setPendingLiveEnd(false);

        liveSessionRef.current = new LiveSession(
            (isActive) => {
                if (!isActive && isLiveMode) {
                    endLiveSession();
                }
            },
            (role, text, isFinal) => {
                setMessages(prev => {
                    const lastMsg = prev[prev.length - 1];
                    const isSameRole = lastMsg?.role === role;
                    let newMsgs = [...prev];
                    
                    if (isSameRole) {
                        newMsgs[newMsgs.length - 1] = { ...lastMsg, text: text, timestamp: new Date() };
                    } else {
                        newMsgs.push({ id: Date.now().toString(), role: role, text: text, timestamp: new Date() });
                    }
                    
                    if (role === 'model' && text.includes('[[INTERVIEW_COMPLETE]]')) {
                        setPendingLiveEnd(true);
                    }
                    persistSession(newMsgs, null, 'in-progress');
                    return newMsgs;
                });
            },
            () => { setIsLiveConnected(true); },
            (vol) => { setMicVolume(vol); },
            (speaking) => { setIsAgentSpeaking(speaking); },
            language
        );
        liveSessionRef.current.connect();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-flow-900 text-gray-100 font-sans overflow-hidden relative">
      
      {showAdmin && <AdminDashboard onClose={() => setShowAdmin(false)} />}

      {/* ── Live Voice Overlay ─────────────────────────────────── */}
      {isLiveMode && (
        <div className="absolute inset-0 z-40 bg-flow-900/98 backdrop-blur-2xl flex flex-col items-center justify-center animate-fade-in">
          
          {/* Ambient glow */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl transition-all duration-1000 ${isAgentSpeaking ? 'bg-flow-accent/20 scale-125' : 'bg-flow-accent/8 scale-100'}`}></div>
          </div>

          {/* Avatar + visualizer */}
          <div className="relative mb-10 z-10">
            {/* Outer pulse rings when speaking */}
            {isAgentSpeaking && (
              <>
                <div className="absolute inset-0 rounded-full border-2 border-flow-accent/40 animate-ping scale-125"></div>
                <div className="absolute inset-0 rounded-full border border-flow-accent/20 animate-ping scale-150" style={{ animationDelay: '0.3s' }}></div>
              </>
            )}

            {/* Avatar circle */}
            <div className={`w-36 h-36 rounded-full overflow-hidden relative z-10 transition-all duration-500 ${
              isAgentSpeaking
                ? 'ring-4 ring-flow-accent shadow-glow-purple-lg scale-105'
                : isLiveConnected
                  ? 'ring-2 ring-flow-accent/60 shadow-glow-purple scale-100'
                  : 'ring-2 ring-flow-600 scale-100'
            }`}>
              {isLiveConnected ? (
                <img src={FLOWI_AVATAR_URL} alt="Flowi" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = FLOW_LOGO_FALLBACK; }} />
              ) : (
                <div className="flex items-center justify-center w-full h-full bg-flow-800">
                  <Loader2 className="w-10 h-10 text-flow-accent animate-spin" />
                </div>
              )}
            </div>

            {/* Mic wave bars — shown when user can speak */}
            {isLiveConnected && !isAgentSpeaking && (
              <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex items-end gap-[3px] h-10">
                {[0.5, 0.7, 1, 0.7, 0.5].map((scale, i) => (
                  <div
                    key={i}
                    className="w-1.5 bg-flow-accent rounded-full transition-all duration-75"
                    style={{ height: `${Math.max(14, micVolume * scale)}%` }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Status label */}
          <div className="z-10 text-center mb-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {isLiveConnected
                ? isAgentSpeaking ? t.statusSpeaking : t.statusListening
                : t.liveTitleConnecting}
            </h2>
            <p className="text-sm text-gray-500 mt-1 h-5">
              {isLiveConnected
                ? isAgentSpeaking ? '' : t.actionSpeak
                : t.liveDescConnecting}
            </p>
          </div>

            {/* Yellow "LIVE" badge */}
            {isLiveConnected && (
              <div className="z-10 flex items-center gap-1.5 bg-flow-accent text-flow-charcoal text-xs font-bold px-3 py-1 rounded-full mt-3 mb-10">
                <span className="w-1.5 h-1.5 bg-flow-charcoal rounded-full animate-pulse"></span>
                LIVE
              </div>
            )}
          {!isLiveConnected && <div className="mb-10" />}

          {/* End call button */}
          <button
            onClick={endLiveSession}
            className="z-10 flex items-center gap-2.5 px-8 py-4 rounded-full border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all duration-300 font-semibold group"
          >
            <PhoneOff size={20} className="group-hover:rotate-12 transition-transform duration-200" />
            {t.endCall}
          </button>
        </div>
      )}

      {/* ── Header ────────────────────────────────────────────── */}
      <header className="flex-none border-b border-flow-700/60 bg-flow-900/95 backdrop-blur-md z-10">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center">
              <img
                src={FLOW_LOGO_URL}
                alt="Flow"
                className="w-full h-full object-contain"
                onError={(e) => { e.currentTarget.src = FLOW_LOGO_FALLBACK; }}
              />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white leading-none">{t.headerTitle}</h1>
              <p className="text-[10px] text-flow-accent font-semibold tracking-widest uppercase mt-0.5">{t.headerSubtitle}</p>
            </div>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            {isInterviewComplete && isProcessing && (
              <div className="flex items-center gap-2 text-flow-accent text-xs animate-pulse font-semibold">
                <Loader2 className="animate-spin" size={14} />
                <span>{t.generatingReport}</span>
              </div>
            )}
            {!isInterviewComplete && messages.length > 2 && (
              <button
                onClick={() => finalizeInterview(messages)}
                disabled={isProcessing}
                className="flex items-center gap-1.5 bg-flow-accent hover:bg-flow-accentHover text-flow-charcoal px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              >
                <CheckCircle size={13} />
                <span className="hidden sm:inline">{t.finishReport}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Chat Area ─────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-3xl mx-auto pb-36">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}

          {/* Typing indicator */}
          {isProcessing && (
            <div className="flex justify-start mb-6 animate-fade-in">
              <div className="flex items-center gap-2 bg-flow-800 border border-flow-700 rounded-2xl rounded-tl-none px-4 py-3">
                <div className="w-1.5 h-1.5 bg-flow-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1.5 h-1.5 bg-flow-accent rounded-full animate-bounce" style={{ animationDelay: '160ms' }}></div>
                <div className="w-1.5 h-1.5 bg-flow-accent rounded-full animate-bounce" style={{ animationDelay: '320ms' }}></div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* ── Input Area ────────────────────────────────────────── */}
      {!showAdmin && (
        <footer className="flex-none px-4 md:px-6 pb-5 pt-2 bg-gradient-to-t from-flow-900 via-flow-900/95 to-transparent">
          <div className="max-w-3xl mx-auto">

            {isInterviewComplete && !isProcessing ? (
              /* Session complete state */
              <div className="flex flex-col items-center gap-3 p-5 bg-flow-800/70 backdrop-blur-sm rounded-2xl border border-flow-700">
                <div className="flex items-center gap-2 text-flow-accent text-xs font-semibold">
                  <CheckCircle size={14} />
                  <span>Session complete</span>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-2 bg-flow-accent hover:bg-flow-accentHover text-flow-charcoal px-6 py-2.5 rounded-full text-sm font-bold transition-all shadow-glow-purple"
                >
                  <RotateCcw size={15} />
                  {t.startNewSession}
                </button>
              </div>
            ) : (
              /* Chat input */
              <div className="flex items-end gap-2 bg-flow-800 p-2 rounded-2xl border border-white/10 transition-colors duration-200 focus-within:border-white/20">

                {/* Voice call button */}
                <button
                  onClick={toggleLiveMode}
                  disabled={isProcessing || isInterviewComplete}
                  title={t.startVoiceCall}
                  className="flex-shrink-0 p-2.5 rounded-xl bg-flow-accent/20 text-flow-accent hover:bg-flow-accent hover:text-flow-charcoal transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Phone size={18} />
                </button>

                {/* Text input */}
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t.inputPlaceholder}
                  disabled={isProcessing || isInterviewComplete}
                  className="flex-1 bg-transparent border-0 outline-none focus:ring-0 focus:outline-none text-white placeholder-white/35 resize-none py-2.5 max-h-32 min-h-[40px] text-sm leading-relaxed"
                  rows={1}
                  style={{ height: 'auto', minHeight: '40px' }}
                />

                {/* Send button */}
                <button
                  onClick={() => handleSendMessage(inputValue)}
                  disabled={!inputValue.trim() || isProcessing || isInterviewComplete}
                  className={`flex-shrink-0 p-2.5 rounded-xl transition-all duration-200 ${
                    inputValue.trim() && !isProcessing
                      ? 'bg-flow-accent text-flow-charcoal hover:bg-flow-accentHover'
                      : 'bg-white/8 text-white/25 cursor-not-allowed'
                  }`}
                >
                  <Send size={18} />
                </button>
              </div>
            )}

            {/* Footer links */}
            <div className="flex items-center justify-center mt-2.5 gap-4">
              <span className="text-[10px] text-white/30">{t.poweredBy}</span>
              <button
                onClick={() => setShowAdmin(true)}
                className="flex items-center gap-1 text-[10px] text-white/30 hover:text-flow-accent transition-colors"
              >
                <Lock size={9} />
                <span>{t.staffAccess}</span>
              </button>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default App;