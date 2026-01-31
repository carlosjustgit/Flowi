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

      {/* Live Mode Overlay */}
      {isLiveMode && (
        <div className="absolute inset-0 z-40 bg-flow-900/95 backdrop-blur-xl flex flex-col items-center justify-center animate-fade-in transition-all">
           
           {/* Visualizer Container - Increased margin bottom to fix overlap */}
           <div className="relative mb-24">
               {/* Pulsing Ring (Agent Speaking) */}
               {isAgentSpeaking && (
                 <>
                   <div className="absolute inset-0 bg-flow-accent rounded-full animate-ping opacity-30"></div>
                   <div className="absolute inset-0 bg-flow-accent rounded-full animate-pulse opacity-50 delay-75 duration-1000"></div>
                 </>
               )}
               
               {/* Avatar */}
               <div className={`w-40 h-40 rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(99,102,241,0.4)] relative z-10 overflow-hidden border-4 transition-all duration-300 ${isAgentSpeaking ? 'border-flow-accent scale-105' : 'border-gray-600 scale-100'}`}>
                    {isLiveConnected ? (
                       <img 
                         src={FLOWI_AVATAR_URL} 
                         alt="Flowi Live"
                         className="w-full h-full object-cover opacity-90"
                         onError={(e) => { e.currentTarget.src = FLOW_LOGO_FALLBACK; }}
                       />
                    ) : (
                       <div className="flex items-center justify-center w-full h-full bg-gray-800">
                         <Loader2 className="w-12 h-12 text-gray-400 animate-spin" />
                       </div>
                    )}
               </div>

               {/* Mic Indicator / Visualizer when User Speaking */}
               {isLiveConnected && !isAgentSpeaking && (
                   <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 flex items-end gap-1 h-12">
                        <div className="w-2 bg-green-500 rounded-full transition-all duration-75" style={{ height: `${Math.max(10, micVolume / 2)}%` }}></div>
                        <div className="w-2 bg-green-500 rounded-full transition-all duration-75" style={{ height: `${Math.max(10, micVolume / 1.5)}%` }}></div>
                        <div className="w-2 bg-green-500 rounded-full transition-all duration-75" style={{ height: `${Math.max(10, micVolume)}%` }}></div>
                        <div className="w-2 bg-green-500 rounded-full transition-all duration-75" style={{ height: `${Math.max(10, micVolume / 1.5)}%` }}></div>
                        <div className="w-2 bg-green-500 rounded-full transition-all duration-75" style={{ height: `${Math.max(10, micVolume / 2)}%` }}></div>
                   </div>
               )}
           </div>
           
           <h2 className="text-3xl font-bold text-white mb-3">
             {isLiveConnected ? (isAgentSpeaking ? t.statusSpeaking : t.statusListening) : t.liveTitleConnecting}
           </h2>
           
           <p className="text-gray-400 mb-12 text-center max-w-sm px-4 h-6">
               {isLiveConnected 
                 ? (isAgentSpeaking ? " " : t.actionSpeak)
                 : t.liveDescConnecting}
           </p>

           <button 
             onClick={endLiveSession}
             className="flex items-center gap-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-10 py-5 rounded-full border border-red-500/50 transition-all duration-300 group shadow-lg"
           >
               <PhoneOff size={28} className="group-hover:rotate-90 transition-transform" />
               <span className="font-semibold text-lg">{t.endCall}</span>
           </button>
        </div>
      )}

      {/* Header */}
      <header className="flex-none p-4 md:p-6 border-b border-gray-800 bg-flow-900/90 backdrop-blur-md z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-transparent rounded-lg flex items-center justify-center overflow-hidden">
                    <img 
                        src={FLOW_LOGO_URL} 
                        alt="Flow Logo" 
                        className="w-full h-full object-contain"
                        onError={(e) => { e.currentTarget.src = FLOW_LOGO_FALLBACK; }}
                    />
                </div>
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-white">{t.headerTitle}</h1>
                    <p className="text-xs text-gray-400 font-medium tracking-wide uppercase">{t.headerSubtitle}</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                {isInterviewComplete && isProcessing && (
                    <div className="flex items-center gap-2 text-flow-accent text-sm animate-pulse">
                        <Loader2 className="animate-spin" size={16} />
                        <span>{t.generatingReport}</span>
                    </div>
                )}
                
                {!isInterviewComplete && messages.length > 2 && (
                    <button 
                        onClick={() => finalizeInterview(messages)}
                        disabled={isProcessing}
                        className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white px-3 py-1.5 rounded-full border border-gray-700 text-xs transition-colors"
                    >
                        <CheckCircle size={14} />
                        <span className="hidden sm:inline">{t.finishReport}</span>
                    </button>
                )}
            </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 overflow-y-auto relative p-4 md:p-6">
        <div className="max-w-3xl mx-auto pb-32">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}

          {isProcessing && (
            <div className="flex justify-start mb-6">
               <div className="bg-gray-800 rounded-2xl rounded-tl-none p-4 border border-gray-700">
                 <div className="flex gap-1.5">
                   <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                   <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                   <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                 </div>
               </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      {!showAdmin && (
        <footer className="flex-none p-4 md:p-6 bg-gradient-to-t from-flow-900 via-flow-900 to-transparent">
            <div className="max-w-3xl mx-auto">
                {isInterviewComplete && !isProcessing ? (
                     <div className="w-full flex flex-col items-center justify-center p-2 bg-gray-800/80 backdrop-blur-sm rounded-3xl border border-gray-700 shadow-xl">
                        <button 
                            onClick={() => window.location.reload()}
                            className="flex items-center gap-2 bg-flow-accent hover:bg-flow-accentHover text-white px-6 py-3 rounded-full transition-colors text-sm font-medium shadow-lg hover:shadow-flow-accent/30"
                        >
                            <RotateCcw size={16} />
                            {t.startNewSession}
                        </button>
                     </div>
                ) : (
                    <div className="relative flex items-end gap-2 bg-gray-800/80 backdrop-blur-sm p-2 rounded-3xl border border-gray-700 shadow-xl ring-1 ring-white/5 focus-within:ring-flow-accent/50 transition-all">
                        
                        <button
                            onClick={toggleLiveMode}
                            disabled={isProcessing || isInterviewComplete}
                            className="p-3 rounded-full transition-all duration-200 bg-green-600/20 text-green-500 hover:bg-green-600 hover:text-white border border-green-600/30"
                            title={t.startVoiceCall}
                        >
                            <Phone size={20} />
                        </button>

                        <textarea
                            ref={inputRef}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={t.inputPlaceholder}
                            disabled={isProcessing || isInterviewComplete}
                            className="flex-1 bg-transparent border-0 focus:ring-0 text-white placeholder-gray-500 resize-none py-3 max-h-32 min-h-[44px]"
                            rows={1}
                            style={{ height: 'auto', minHeight: '44px' }}
                        />

                        <button
                            onClick={() => handleSendMessage(inputValue)}
                            disabled={!inputValue.trim() || isProcessing || isInterviewComplete}
                            className={`p-3 rounded-full transition-all duration-200 ${
                                inputValue.trim() && !isProcessing
                                    ? 'bg-white text-black hover:bg-gray-200' 
                                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            }`}
                        >
                            <Send size={20} />
                        </button>
                    </div>
                )}
                
                <div className="flex items-center justify-center mt-3 gap-3">
                     <p className="text-[10px] text-gray-600">
                        {t.poweredBy}
                    </p>
                    <button 
                        onClick={() => setShowAdmin(true)}
                        className="flex items-center gap-1 text-[10px] text-gray-700 hover:text-flow-accent transition-colors"
                    >
                        <Lock size={10} />
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