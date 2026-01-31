import { OnboardingSession, Message } from "../types";

const STORAGE_KEY = 'flow_productions_sessions';

export const saveSession = (session: OnboardingSession) => {
  if (typeof window === 'undefined') return;
  
  const sessions = getSessions();
  const existingIndex = sessions.findIndex(s => s.id === session.id);
  
  if (existingIndex >= 0) {
    // Preserve the original start date if it exists, otherwise use the new one (last updated)
    // Actually, updating the date acts as 'Last Activity', which is useful.
    sessions[existingIndex] = session;
  } else {
    sessions.unshift(session); // Add new sessions to the top
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
};

export const getSessions = (): OnboardingSession[] => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const deleteSession = (id: string) => {
    if (typeof window === 'undefined') return;
    const sessions = getSessions().filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export const extractClientName = (report: string | null): string => {
    if (!report) return "In Progress / Draft";
    
    // Regex updated to match:
    // 1. **Client Name:** (Standard Markdown bold)
    // 2. Client Name: (Plain text)
    // 3. **Client:** (Fallback)
    const nameMatch = report.match(/\*\*Client Name:\*\*\s*(.+?)(\n|$)/i) || 
                      report.match(/Client Name:\s*(.+?)(\n|$)/i) ||
                      report.match(/\*\*Client:\*\*\s*(.+?)(\n|$)/i);
                      
    if (nameMatch) {
        // Remove any markdown leftovers if strictly necessary
        return nameMatch[1].replace(/\*\*/g, '').trim();
    }
    
    return "Unknown Client";
};