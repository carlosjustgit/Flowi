import React, { useState, useEffect } from 'react';
import { OnboardingSession, Message } from '../types';
import { getSessions, deleteSession, saveSession } from '../services/storageService';
import { generateFinalReport } from '../services/geminiService';
import { FileText, MessageSquare, Trash2, Printer, X, Search, Calendar, Lock, ArrowRight, AlertCircle, Wand2, Loader2, CheckSquare, Square } from 'lucide-react';
import ChatMessage from './ChatMessage';
import ReactMarkdown from 'react-markdown';
import { FLOW_LOGO_URL, FLOW_LOGO_FALLBACK, FLOWI_AVATAR_URL } from '../constants';

interface AdminDashboardProps {
  onClose: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
  // Login State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(false);

  // Dashboard State
  const [sessions, setSessions] = useState<OnboardingSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'report' | 'transcript'>('report');
  const [searchQuery, setSearchQuery] = useState('');

  // Bulk selection state
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Generation & Print State
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadSessions();
    }
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple client-side protection
    if (password === 'WitFlow2026') {
        setIsAuthenticated(true);
        setLoginError(false);
    } else {
        setLoginError(true);
        setPassword('');
    }
  };

  const loadSessions = async () => {
    const data = await getSessions();
    setSessions(data);
    if (data.length > 0 && !selectedSessionId) {
        setSelectedSessionId(data[0].id);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Delete this session?')) {
        await deleteSession(id);
        setCheckedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
        await loadSessions();
        if (selectedSessionId === id) setSelectedSessionId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (checkedIds.size === 0) return;
    if (!window.confirm(`Delete ${checkedIds.size} session${checkedIds.size > 1 ? 's' : ''}? This cannot be undone.`)) return;
    setIsBulkDeleting(true);
    for (const id of checkedIds) {
      await deleteSession(id);
    }
    if (selectedSessionId && checkedIds.has(selectedSessionId)) setSelectedSessionId(null);
    setCheckedIds(new Set());
    await loadSessions();
    setIsBulkDeleting(false);
  };

  const toggleCheck = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCheckedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (checkedIds.size === filteredSessions.length) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(filteredSessions.map(s => s.id)));
    }
  };
  
  const handleForceGenerateReport = async (session: OnboardingSession) => {
      setIsGenerating(true);
      try {
          const reportText = await generateFinalReport(session.transcript);
          
          // Update session with new report
          const updatedSession: OnboardingSession = {
              ...session,
              report: reportText,
              status: 'completed'
          };
          
          await saveSession(updatedSession);
          await loadSessions(); // Reload list to reflect changes
          setActiveTab('report'); // Switch to report tab
      } catch (error) {
          alert('Failed to generate report. Please try again.');
          console.error(error);
      } finally {
          setIsGenerating(false);
      }
  };

  const handlePrint = () => {
    if (isPrinting || !selectedSession?.report) return;
    setIsPrinting(true);

    // Use a timeout to ensure state updates if needed, then open a new window
    setTimeout(() => {
        const reportElement = document.getElementById('printable-report');
        
        if (!reportElement) {
            setIsPrinting(false);
            alert("Report content not found. Please try again.");
            return;
        }

        // Open a new window
        const printWindow = window.open('', '_blank');
        
        if (!printWindow) {
            setIsPrinting(false);
            alert("Pop-up blocked. Please allow pop-ups for this site to print.");
            return;
        }

        // Construct the full HTML document for the print window
        const htmlContent = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="utf-8">
                <title>Creative Brief - ${selectedSession.clientName}</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
                <style>
                    body { 
                        background: white; 
                        color: black; 
                        font-family: 'Inter', sans-serif;
                        padding: 40px;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    /* Force typography to be black for clarity */
                    .prose { color: black !important; max-width: 100% !important; }
                    .prose h1, .prose h2, .prose h3, .prose p, .prose strong, .prose li { color: black !important; }
                    .prose h2 { border-bottom-color: #000 !important; }
                    
                    /* Hide non-printable elements just in case */
                    button { display: none !important; }

                    @media print {
                        body { padding: 0; margin: 2cm; }
                        @page { size: auto; margin: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="max-w-4xl mx-auto">
                    ${reportElement.innerHTML}
                </div>
                <script>
                    // Wait for Tailwind and fonts to load, then print
                    window.onload = () => {
                        setTimeout(() => {
                            window.print();
                        }, 500);
                    };
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close(); // Important to finish loading
        
        setIsPrinting(false);
    }, 100);
  };

  const filteredSessions = sessions.filter(s =>
    s.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.date.includes(searchQuery)
  );

  const allChecked = filteredSessions.length > 0 && checkedIds.size === filteredSessions.length;
  const someChecked = checkedIds.size > 0;

  const selectedSession = sessions.find(s => s.id === selectedSessionId);

  // --- RENDER LOGIN SCREEN ---
  if (!isAuthenticated) {
      return (
        <div className="fixed inset-0 z-50 bg-flow-900/95 backdrop-blur-xl flex flex-col items-center justify-center text-white font-sans animate-fade-in">
            <button onClick={onClose} className="absolute top-6 right-6 p-2 text-gray-500 hover:text-white transition-colors">
                <X size={24} />
            </button>
            
            <div className="w-full max-w-sm bg-gray-800 border border-gray-700 p-8 rounded-2xl shadow-2xl">
                <div className="flex justify-center mb-6">
                     <div className="w-16 h-16 bg-gray-900 rounded-xl flex items-center justify-center p-3 border border-gray-700">
                        <img 
                            src={FLOW_LOGO_URL} 
                            alt="Flow Logo" 
                            className="w-full h-full object-contain"
                            onError={(e) => { e.currentTarget.src = FLOW_LOGO_FALLBACK; }}
                        />
                    </div>
                </div>
                
                <h2 className="text-xl font-bold text-center mb-1">Staff Access</h2>
                <p className="text-sm text-gray-400 text-center mb-8">Enter your PIN to view client reports.</p>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                            <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter Access PIN"
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-flow-accent focus:border-transparent outline-none transition-all placeholder-gray-600"
                                autoFocus
                            />
                        </div>
                        {loginError && (
                            <div className="flex items-center gap-2 text-red-400 text-xs animate-pulse">
                                <AlertCircle size={12} />
                                <span>Incorrect PIN. Please try again.</span>
                            </div>
                        )}
                    </div>

                    <button 
                        type="submit"
                        className="w-full bg-flow-accent hover:bg-flow-accentHover text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        <span>Access Dashboard</span>
                        <ArrowRight size={16} />
                    </button>
                </form>
            </div>
        </div>
      );
  }

  // --- RENDER DASHBOARD ---
  return (
    <div className="fixed inset-0 z-50 bg-flow-900 flex flex-col md:flex-row text-gray-100 font-sans animate-fade-in">
      
      {/* Sidebar List */}
      <div className="w-full md:w-80 bg-flow-800 border-r border-gray-700 flex flex-col h-1/3 md:h-full">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between bg-gray-900/50">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
                    <img 
                        src={FLOW_LOGO_URL} 
                        alt="Flow Logo" 
                        className="w-full h-full object-contain"
                        onError={(e) => { e.currentTarget.src = FLOW_LOGO_FALLBACK; }}
                    />
                </div>
                <h2 className="font-bold text-lg tracking-tight text-white">Admin</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-white">
                <X size={20} />
            </button>
        </div>
        
        {/* Search */}
        <div className="px-4 pt-4 pb-2">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
                <input
                    type="text"
                    placeholder="Search clients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-1 focus:ring-flow-accent outline-none text-gray-200 placeholder-gray-600"
                />
            </div>
        </div>

        {/* Bulk action toolbar */}
        {filteredSessions.length > 0 && (
          <div className="px-4 py-2 flex items-center justify-between">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors"
            >
              {allChecked
                ? <CheckSquare size={15} className="text-flow-accent" />
                : <Square size={15} />}
              <span>{allChecked ? 'Deselect all' : 'Select all'}</span>
            </button>

            {someChecked && (
              <button
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                className="flex items-center gap-1.5 bg-red-500/15 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 hover:border-red-500 px-3 py-1 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
              >
                {isBulkDeleting
                  ? <Loader2 size={13} className="animate-spin" />
                  : <Trash2 size={13} />}
                Delete {checkedIds.size}
              </button>
            )}
          </div>
        )}

        {/* Session list */}
        <div className="flex-1 overflow-y-auto">
            {filteredSessions.map((session) => {
              const isChecked = checkedIds.has(session.id);
              return (
                <div
                    key={session.id}
                    onClick={() => setSelectedSessionId(session.id)}
                    className={`px-3 py-3 border-b border-gray-800 cursor-pointer transition-all flex items-center gap-2 group ${
                      selectedSessionId === session.id
                        ? 'bg-flow-accent/10 border-l-4 border-l-flow-accent'
                        : 'border-l-4 border-l-transparent hover:bg-gray-700/30'
                    }`}
                >
                    {/* Checkbox */}
                    <button
                      onClick={(e) => toggleCheck(session.id, e)}
                      className="flex-shrink-0 text-gray-500 hover:text-flow-accent transition-colors"
                    >
                      {isChecked
                        ? <CheckSquare size={16} className="text-flow-accent" />
                        : <Square size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
                    </button>

                    {/* Info */}
                    <div className="flex-1 overflow-hidden">
                        <h3 className={`font-medium truncate text-sm ${selectedSessionId === session.id ? 'text-white' : 'text-gray-300'}`}>
                            {session.clientName}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                            <Calendar size={11} />
                            <span>{new Date(session.date).toLocaleDateString()}</span>
                            <span className="uppercase">{session.language}</span>
                            {session.status === 'in-progress' && (
                                <span className="text-flow-accent">• In Progress</span>
                            )}
                        </div>
                    </div>

                    {/* Single delete */}
                    <button
                        onClick={(e) => handleDelete(session.id, e)}
                        className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:text-red-400 transition-all"
                        title="Delete"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
              );
            })}
            {filteredSessions.length === 0 && (
                <div className="p-8 text-center text-gray-500 text-sm flex flex-col items-center gap-2">
                    <Search size={24} className="opacity-20" />
                    <span>No sessions found.</span>
                </div>
            )}
        </div>
        
        <div className="p-4 border-t border-gray-700 text-xs text-center text-gray-600">
            Flow Productions Internal Tool v1.0
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-2/3 md:h-full bg-flow-900">
        {selectedSession ? (
            <>
                {/* Session Header */}
                <div className="p-6 border-b border-gray-800 bg-flow-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-1">{selectedSession.clientName}</h1>
                        <p className="text-gray-400 text-sm flex items-center gap-2">
                           ID: <span className="font-mono text-xs bg-gray-800 px-2 py-0.5 rounded text-gray-300">{selectedSession.id.slice(0, 8)}</span>
                           <span className="text-gray-600">•</span>
                           Recorded: {new Date(selectedSession.date).toLocaleString()}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handlePrint}
                            disabled={isPrinting || !selectedSession.report}
                            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isPrinting ? <Loader2 size={18} className="animate-spin" /> : <Printer size={18} />}
                            {isPrinting ? 'Opening...' : 'Print / Save as PDF'}
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="px-6 border-b border-gray-800 flex gap-6 bg-flow-900">
                    <button 
                        onClick={() => setActiveTab('report')}
                        className={`py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'report' ? 'border-flow-accent text-flow-accent' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
                    >
                        <FileText size={18} />
                        Strategic Brief
                    </button>
                    <button 
                        onClick={() => setActiveTab('transcript')}
                        className={`py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'transcript' ? 'border-flow-accent text-flow-accent' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
                    >
                        <MessageSquare size={18} />
                        Full Transcript
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-[#0a0a0a] custom-scrollbar">
                    {activeTab === 'report' ? (
                        <div id="printable-report" className="max-w-4xl mx-auto bg-white text-black p-8 md:p-12 shadow-2xl rounded-sm min-h-[600px] print-container">
                             <div className="flex justify-between items-start mb-8 border-b-2 border-black pb-6">
                                <div>
                                    <h1 className="text-4xl font-bold tracking-tight text-black mb-2">Creative Brief</h1>
                                    <p className="text-gray-500 text-sm uppercase tracking-wider">Internal Document • Confidential</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-xl font-bold text-indigo-600">FLOW PRODUCTIONS</div>
                                    <div className="text-xs text-gray-400 mt-1">{new Date().toLocaleDateString()}</div>
                                </div>
                             </div>

                             {selectedSession.report ? (
                                 <article className="prose prose-slate max-w-none prose-headings:font-bold prose-h1:text-2xl prose-h1:border-b prose-h1:pb-2 prose-h1:mb-6 prose-h2:text-lg prose-h2:text-indigo-700 prose-h2:mt-8 prose-h2:uppercase prose-h2:tracking-wide prose-li:my-1 prose-strong:text-slate-800">
                                     <ReactMarkdown>{selectedSession.report}</ReactMarkdown>
                                 </article>
                             ) : (
                                 <div className="flex flex-col items-center justify-center h-64 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                                     <FileText size={48} className="mb-4 opacity-20" />
                                     <p className="mb-6">No report generated yet (Session in progress or abandoned).</p>
                                     <button 
                                        onClick={() => handleForceGenerateReport(selectedSession)}
                                        disabled={isGenerating}
                                        className="bg-indigo-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                     >
                                         {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Wand2 size={20} />}
                                         Generate Report Now
                                     </button>
                                 </div>
                             )}
                        </div>
                    ) : (
                        <div className="max-w-3xl mx-auto space-y-6">
                            {selectedSession.transcript.map((msg, idx) => (
                                <ChatMessage key={idx} message={msg} />
                            ))}
                        </div>
                    )}
                </div>
            </>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-flow-900">
                <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-6">
                    <Search size={32} className="opacity-40" />
                </div>
                <h3 className="text-lg font-medium text-gray-300 mb-2">No Session Selected</h3>
                <p className="text-sm">Select a client from the sidebar to view their brief.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;