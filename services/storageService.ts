import { OnboardingSession, Message } from "../types";
import { supabase } from "./supabaseClient";

const STORAGE_KEY = 'flow_productions_sessions';

// Fallback to localStorage if Supabase fails
const useLocalStorageFallback = () => {
  console.warn('Using localStorage fallback');
  return true;
};

export const saveSession = async (session: OnboardingSession): Promise<void> => {
  try {
    // Try Supabase first
    const { error } = await supabase
      .from('onboarding_sessions')
      .upsert({
        id: session.id,
        client_name: session.clientName,
        company: session.clientName, // You can extract this from the report if needed
        email: null, // You can extract this from the report if needed
        date: session.date,
        transcript: session.transcript,
        report: session.report,
        language: session.language,
        status: session.status
      }, {
        onConflict: 'id'
      });

    if (error) {
      console.error('Supabase save error:', error);
      // Fallback to localStorage
      saveToLocalStorage(session);
    }
  } catch (error) {
    console.error('Failed to save to Supabase:', error);
    // Fallback to localStorage
    saveToLocalStorage(session);
  }
};

export const getSessions = async (): Promise<OnboardingSession[]> => {
  try {
    // Try Supabase first
    const { data, error } = await supabase
      .from('onboarding_sessions')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Supabase fetch error:', error);
      return getFromLocalStorage();
    }

    // Transform Supabase data to OnboardingSession format
    return (data || []).map(row => ({
      id: row.id,
      clientName: row.client_name,
      date: row.date,
      transcript: row.transcript as Message[],
      report: row.report,
      language: row.language as 'en' | 'pt',
      status: row.status as 'completed' | 'abandoned' | 'in-progress'
    }));
  } catch (error) {
    console.error('Failed to fetch from Supabase:', error);
    return getFromLocalStorage();
  }
};

export const deleteSession = async (id: string): Promise<void> => {
  try {
    // Try Supabase first
    const { error } = await supabase
      .from('onboarding_sessions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase delete error:', error);
      deleteFromLocalStorage(id);
    }
  } catch (error) {
    console.error('Failed to delete from Supabase:', error);
    deleteFromLocalStorage(id);
  }
};

// LocalStorage fallback functions
const saveToLocalStorage = (session: OnboardingSession) => {
  if (typeof window === 'undefined') return;
  
  const sessions = getFromLocalStorage();
  const existingIndex = sessions.findIndex(s => s.id === session.id);
  
  if (existingIndex >= 0) {
    sessions[existingIndex] = session;
  } else {
    sessions.unshift(session);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
};

const getFromLocalStorage = (): OnboardingSession[] => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

const deleteFromLocalStorage = (id: string) => {
  if (typeof window === 'undefined') return;
  const sessions = getFromLocalStorage().filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
};

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
