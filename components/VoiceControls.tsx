import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Loader2, AlertCircle } from 'lucide-react';
import { generateSpeech } from '../services/geminiService';

interface VoiceControlsProps {
  onTranscript: (text: string) => void;
  isProcessing: boolean;
  lastBotMessage: string | null;
}

const VoiceControls: React.FC<VoiceControlsProps> = ({ onTranscript, isProcessing, lastBotMessage }) => {
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const onTranscriptRef = useRef(onTranscript);

  // Keep the latest callback in a ref to avoid re-initializing SpeechRecognition
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  // Initialize Audio Context lazily
  const getAudioContext = () => {
    if (!audioContextRef.current) {
      // Note: We try to ask for 24kHz, but browsers might ignore this and use hardware rate (e.g. 44.1k or 48k)
      // This is fine, as we will define the buffer sample rate explicitly later.
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  };

  // Helper to decode Base64 to ArrayBuffer
  const base64ToArrayBuffer = (base64: string) => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  };

  // Helper to clean text (strip markdown) for better TTS stability
  const cleanTextForTTS = (text: string) => {
    return text
      .replace(/\[\[INTERVIEW_COMPLETE\]\]/g, '') // Remove instruction tags
      .replace(/[*#_`~]/g, '') // Remove common Markdown symbols
      .replace(/\[.*?\]/g, '') // Remove brackets and content
      .replace(/\n\s*\n/g, '. ') // Replace double newlines with a pause
      .replace(/\n/g, ' ') // Replace single newlines with space
      .trim();
  };

  // Initialize Speech Recognition Once
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        // Remove hardcoded language to allow browser auto-detection or fallback
        // recognition.lang = 'en-GB'; 

        recognition.onstart = () => {
            setIsListening(true);
            setErrorMessage(null);
        };

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            onTranscriptRef.current(transcript);
          }
          setIsListening(false);
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsListening(false);
          
          let msg = "Voice input failed.";
          if (event.error === 'network') {
            msg = "Network error. Please check connection.";
          } else if (event.error === 'not-allowed') {
            msg = "Microphone permission denied.";
          } else if (event.error === 'no-speech') {
            msg = "No speech detected.";
          }
          
          setErrorMessage(msg);
          setTimeout(() => setErrorMessage(null), 4000);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  // Handle Gemini TTS for Bot Messages
  useEffect(() => {
    let active = true;

    const playBotMessage = async () => {
      if (lastBotMessage && !isMuted && !isProcessing) {
        // Stop any currently playing audio
        if (audioSourceRef.current) {
          try { audioSourceRef.current.stop(); } catch(e) {}
        }

        try {
          // Clean text for TTS to avoid model errors with Markdown
          const textToSpeak = cleanTextForTTS(lastBotMessage);
          
          if (!textToSpeak) return;

          setIsPlayingAudio(true);
          const base64Audio = await generateSpeech(textToSpeak);
          
          if (!active) return;

          if (!base64Audio) {
            setIsPlayingAudio(false);
            return;
          }

          const ctx = getAudioContext();
          if (ctx.state === 'suspended') {
            await ctx.resume();
          }

          // Decode Raw PCM Data (Gemini 2.5 TTS returns raw PCM 24kHz Mono 16-bit)
          // Do NOT use ctx.decodeAudioData() as it expects headers (WAV/MP3).
          const arrayBuffer = base64ToArrayBuffer(base64Audio);
          const dataInt16 = new Int16Array(arrayBuffer);
          
          // Create AudioBuffer: Mono (1 channel), 24kHz
          const audioBuffer = ctx.createBuffer(1, dataInt16.length, 24000);
          const channelData = audioBuffer.getChannelData(0);
          
          // Convert Int16 to Float32 [-1.0, 1.0]
          for (let i = 0; i < dataInt16.length; i++) {
            channelData[i] = dataInt16[i] / 32768.0;
          }
          
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(ctx.destination);
          
          source.onended = () => {
            if (active) setIsPlayingAudio(false);
          };

          audioSourceRef.current = source;
          source.start(0);

        } catch (error) {
          console.error("Audio playback error:", error);
          if (active) setIsPlayingAudio(false);
        }
      }
    };

    playBotMessage();

    return () => {
      active = false;
      if (audioSourceRef.current) {
        try {
            audioSourceRef.current.stop();
        } catch (e) {
            // ignore if already stopped
        }
      }
    };
  }, [lastBotMessage, isMuted, isProcessing]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      // Stop Audio if speaking
      if (audioSourceRef.current) {
        try { audioSourceRef.current.stop(); } catch(e) {}
      }
      setIsPlayingAudio(false);
      setErrorMessage(null);
      
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Failed to start recognition:", e);
      }
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (!isMuted) {
      // If we are muting, stop current audio
      if (audioSourceRef.current) {
        try { audioSourceRef.current.stop(); } catch(e) {}
      }
      setIsPlayingAudio(false);
    }
  };

  return (
    <div className="flex items-center space-x-2 relative">
      {errorMessage && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-red-900/90 text-white text-xs p-2 rounded shadow-lg border border-red-700 flex items-center gap-2 animate-fade-in-up z-50">
           <AlertCircle size={14} className="flex-shrink-0" />
           <span>{errorMessage}</span>
        </div>
      )}

      <button
        onClick={toggleMute}
        className={`p-2 rounded-full transition-colors ${
          isMuted ? 'text-gray-500 hover:bg-gray-800' : 'text-flow-accent hover:bg-gray-800'
        }`}
        title={isMuted ? "Enable Audio" : "Mute Audio"}
      >
        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </button>

      <button
        onClick={toggleListening}
        disabled={isProcessing}
        className={`p-3 rounded-full transition-all duration-300 flex items-center justify-center ${
          isListening 
            ? 'bg-red-500 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]' 
            : isPlayingAudio 
              ? 'bg-flow-accent/80 text-white cursor-wait'
              : 'bg-flow-accent text-white hover:bg-flow-accentHover'
        } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
        title="Speak your answer"
      >
        {isListening ? (
           <MicOff size={24} />
        ) : isPlayingAudio ? (
           <Loader2 size={24} className="animate-spin" />
        ) : (
           <Mic size={24} />
        )}
      </button>
    </div>
  );
};

export default VoiceControls;