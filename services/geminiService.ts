import { GoogleGenAI, Chat, LiveServerMessage, Blob, Modality } from "@google/genai";
import { GeminiModel, Message } from "../types";
import { ONBOARDING_SYSTEM_INSTRUCTION, LIVE_ONBOARDING_SYSTEM_INSTRUCTION, REPORT_GENERATION_PROMPT } from "../constants";

// Initialize API Client
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || ''; 

// Debug logging (only logs key existence, not the actual key)
if (!apiKey) {
  console.error('❌ VITE_GEMINI_API_KEY is not defined');
} else {
  console.log('✅ VITE_GEMINI_API_KEY is loaded');
}

const ai = new GoogleGenAI({ apiKey });

let chatSession: Chat | null = null;

// --- Standard Chat & TTS Functions ---

export const initChatSession = () => {
  chatSession = ai.chats.create({
    model: GeminiModel.FLASH,
    config: {
      systemInstruction: ONBOARDING_SYSTEM_INSTRUCTION,
      temperature: 0.7,
      tools: [{ googleSearch: {} }], // Enable Google Search Grounding for Text
    },
  });
  return chatSession;
};

export const sendMessageToGemini = async (userMessage: string): Promise<string> => {
  if (!chatSession) {
    initChatSession();
  }
  if (!chatSession) throw new Error("Failed to initialize chat session");

  try {
    const result = await chatSession.sendMessage({ message: userMessage });
    
    let text = result.text || "I apologize, I didn't catch that. Could you repeat?";

    // Extract Grounding Metadata (Sources)
    const groundingMetadata = result.candidates?.[0]?.groundingMetadata;
    
    if (groundingMetadata?.groundingChunks) {
      const sources = groundingMetadata.groundingChunks
        .map((chunk: any) => {
          if (chunk.web) {
            return `- [${chunk.web.title}](${chunk.web.uri})`;
          }
          return null;
        })
        .filter((s: any) => s !== null);

      if (sources.length > 0) {
        // Append sources to the message text
        // Using Set to remove duplicates
        const uniqueSources = [...new Set(sources)];
        text += `\n\n**Sources:**\n${uniqueSources.join('\n')}`;
      }
    }

    return text;

  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I'm having trouble connecting to the agency servers right now. Please try again in a moment.";
  }
};

export const generateSpeech = async (text: string): Promise<string | null> => {
  if (!text || text.length > 5000) return null;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO], 
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error) {
    console.error("TTS Generation Error:", JSON.stringify(error, null, 2));
    return null;
  }
};

export const generateFinalReport = async (history: Message[]): Promise<string> => {
  // We use a fresh stateless call here so it works for both Text sessions and Live API sessions (which don't have a chatSession object)
  try {
    const now = new Date();
    // Format date clearly so the model understands context (e.g., "Thursday, 29 January 2026, 14:30")
    const formattedDate = now.toLocaleString('en-GB', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit'
    });

    // Convert message history to a single context string
    const conversationContext = history
        .map(msg => `${msg.role === 'user' ? 'CLIENT' : 'FLOWI (AI)'}: ${msg.text}`)
        .join('\n\n');

    // Inject the date context explicitly into the prompt
    const prompt = `${REPORT_GENERATION_PROMPT}\n\n**SYSTEM CONTEXT**\n- **Current Date:** ${formattedDate}\n- Please use this date for the 'Session Date' field.\n\n=== TRANSCRIPT TO ANALYZE ===\n${conversationContext}`;

    const response = await ai.models.generateContent({
        model: GeminiModel.FLASH,
        contents: prompt
    });

    return response.text || "Failed to generate report.";
  } catch (error) {
    console.error("Report Generation Error:", error);
    return "Error generating the internal report.";
  }
};

// --- Live API Implementation ---

export class LiveSession {
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private sessionPromise: Promise<any> | null = null;
  private active = false;
  private volumeInterval: any = null;

  // Transcription State
  private currentInputTranscription = '';
  private currentOutputTranscription = '';

  // Configuration
  private readonly INPUT_SAMPLE_RATE = 16000;
  private readonly OUTPUT_SAMPLE_RATE = 24000;
  // Reduced buffer size for lower latency (was 4096)
  private readonly BUFFER_SIZE = 2048; 

  constructor(
    private onStatusChange: (isActive: boolean) => void,
    private onTranscriptUpdate: (role: 'user' | 'model', text: string, isFinal: boolean) => void,
    private onConnect: () => void,
    private onVolumeUpdate: (volume: number) => void,
    private onAgentSpeaking: (speaking: boolean) => void,
    private language: 'en' | 'pt' = 'en'
  ) {
    // Initialize AudioContexts in constructor to capture user gesture synchronously
    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.inputAudioContext = new AudioContextClass({ sampleRate: this.INPUT_SAMPLE_RATE });
        this.outputAudioContext = new AudioContextClass({ sampleRate: this.OUTPUT_SAMPLE_RATE });
    } catch (e) {
        console.error("Failed to initialize AudioContexts", e);
    }
  }

  async connect() {
    if (this.active) return;
    
    try {
      this.active = true;
      this.onStatusChange(true);

      // 1. Resume Contexts (just in case they were suspended)
      if (this.inputAudioContext?.state === 'suspended') await this.inputAudioContext.resume();
      if (this.outputAudioContext?.state === 'suspended') await this.outputAudioContext.resume();

      // 2. Connect to Live API
      this.sessionPromise = ai.live.connect({
        model: GeminiModel.LIVE,
        config: {
          responseModalities: [Modality.AUDIO], 
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          // Wrap system instruction in parts object for robustness
          systemInstruction: { parts: [{ text: LIVE_ONBOARDING_SYSTEM_INSTRUCTION }] },
          inputAudioTranscription: {}, 
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: this.handleOpen.bind(this),
          onmessage: this.handleMessage.bind(this),
          onclose: () => this.disconnect(),
          onerror: (err) => {
            console.error("Live Session Error:", err);
            // Don't disconnect immediately on all errors to be robust
          }
        }
      });

    } catch (error) {
      console.error("Failed to start live session:", error);
      this.disconnect();
    }
  }

  private async handleOpen() {
    console.log("Live Session Opened. initializing audio...");

    // 1. Start Microphone Stream 
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: this.INPUT_SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          autoGainControl: true,
          noiseSuppression: true
        } 
      });
      
      if (!this.inputAudioContext) return;

      this.inputSource = this.inputAudioContext.createMediaStreamSource(stream);
      this.analyser = this.inputAudioContext.createAnalyser();
      this.analyser.fftSize = 32;
      this.processor = this.inputAudioContext.createScriptProcessor(this.BUFFER_SIZE, 1, 1);

      this.processor.onaudioprocess = (e) => {
        if (!this.active) return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmBlob = this.createBlob(inputData);
        
        this.sessionPromise?.then((session) => {
          session.sendRealtimeInput({ media: pcmBlob });
        });
      };

      // Connect Graph: Source -> Analyser -> Processor -> Destination
      this.inputSource.connect(this.analyser);
      this.inputSource.connect(this.processor);
      this.processor.connect(this.inputAudioContext.destination);

      // Start Volume Monitoring
      this.volumeInterval = setInterval(() => {
        if (this.analyser && this.active) {
            const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            this.analyser.getByteFrequencyData(dataArray);
            const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
            this.onVolumeUpdate(avg); // 0-255 range approximately
        }
      }, 100);

    } catch (err) {
      console.error("Microphone access denied or error:", err);
      this.disconnect();
      return;
    }

    // 2. Send Initial Greeting Trigger based on detected language
    if (this.sessionPromise) {
        this.sessionPromise.then((session) => {
            console.log("Sending greeting trigger...");
            
            const greetingPrompt = this.language === 'pt' 
                ? "SYSTEM: O utilizador entrou. Diz 'Olá', apresenta-te como Flowi e pergunta o nome (em Português de Portugal). Fala APENAS Português."
                : "SYSTEM: The user has joined. Say 'Hello', introduce yourself as Flowi and ask for their name (in UK English). Speak ONLY English.";

            session.sendRealtimeInput({
                content: [{
                    role: "user",
                    parts: [{ text: greetingPrompt }]
                }]
            });
        });
    }

    // 3. Update UI
    if (this.onConnect) this.onConnect();
  }

  private async handleMessage(message: LiveServerMessage) {
    if (!this.active) return;

    // --- Audio Output Handling ---
    if (this.outputAudioContext) {
        const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
          this.onAgentSpeaking(true); // Agent is starting to speak
          
          if (this.outputAudioContext.state === 'suspended') {
              await this.outputAudioContext.resume();
          }

          // Buffer management: prevent scheduling in the past
          // Adding a small buffer (50ms) to currentTime helps prevent 'glitchy' starts if there's slight jitter
          const schedulingBuffer = 0.05;
          const now = this.outputAudioContext.currentTime;

          if (this.nextStartTime < now) {
              this.nextStartTime = now + schedulingBuffer;
          }

          try {
            const audioBuffer = await this.decodeAudioData(
              this.base64ToBytes(base64Audio), 
              this.outputAudioContext, 
              this.OUTPUT_SAMPLE_RATE
            );
            const source = this.outputAudioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.outputAudioContext.destination);
            
            source.onended = () => {
                this.sources.delete(source);
                if (this.sources.size === 0) {
                    this.onAgentSpeaking(false); // Silence
                }
            };
            
            source.start(this.nextStartTime);
            this.nextStartTime += audioBuffer.duration;
            this.sources.add(source);
          } catch (e) {
            console.error("Decoding error:", e);
          }
        }
    }

    // --- Transcription Handling ---
    const serverContent = message.serverContent;
    if (serverContent) {
        if (serverContent.inputTranscription) {
            const text = serverContent.inputTranscription.text;
            if (text) {
                this.currentInputTranscription += text;
                this.onTranscriptUpdate('user', this.currentInputTranscription, false);
            }
        }
        if (serverContent.outputTranscription) {
            const text = serverContent.outputTranscription.text;
            if (text) {
                this.currentOutputTranscription += text;
                this.onTranscriptUpdate('model', this.currentOutputTranscription, false);
            }
        }
        if (serverContent.turnComplete) {
            if (this.currentInputTranscription.trim()) {
                this.onTranscriptUpdate('user', this.currentInputTranscription, true);
                this.currentInputTranscription = '';
            }
            if (this.currentOutputTranscription.trim()) {
                this.onTranscriptUpdate('model', this.currentOutputTranscription, true);
                this.currentOutputTranscription = '';
            }
        }
    }

    // Handle Interruptions
    if (serverContent?.interrupted) {
      console.log("Model interrupted");
      this.sources.forEach(source => {
        try { source.stop(); } catch(e) {}
      });
      this.sources.clear();
      // Reset timer to now to discard buffered audio lag
      if (this.outputAudioContext) {
          this.nextStartTime = this.outputAudioContext.currentTime;
      }
      this.currentOutputTranscription = '';
      this.onAgentSpeaking(false);
    }
  }

  disconnect() {
    if (!this.active) return;
    
    if (this.volumeInterval) clearInterval(this.volumeInterval);

    // Finalize transcripts
    if (this.currentInputTranscription.trim()) {
        this.onTranscriptUpdate('user', this.currentInputTranscription, true);
    }
    if (this.currentOutputTranscription.trim()) {
        this.onTranscriptUpdate('model', this.currentOutputTranscription, true);
    }

    this.active = false;
    this.onStatusChange(false);
    this.onAgentSpeaking(false);

    // Stop Microphone
    if (this.inputSource) {
      this.inputSource.mediaStream.getTracks().forEach(track => track.stop());
      this.inputSource.disconnect();
    }
    if (this.processor) {
      this.processor.disconnect();
    }

    // Close Contexts
    this.inputAudioContext?.close();
    this.outputAudioContext?.close();

    // Close Session
    this.sessionPromise?.then(session => session.close());
    
    this.sources.clear();
    this.inputSource = null;
    this.processor = null;
    this.inputAudioContext = null;
    this.outputAudioContext = null;
    this.analyser = null;
  }

  // --- Audio Helpers ---

  private createBlob(data: Float32Array): Blob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      const s = Math.max(-1, Math.min(1, data[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return {
      data: this.bytesToBase64(new Uint8Array(int16.buffer)),
      mimeType: `audio/pcm;rate=${this.INPUT_SAMPLE_RATE}`,
    };
  }

  private base64ToBytes(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  private bytesToBase64(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private async decodeAudioData(
    data: Uint8Array, 
    ctx: AudioContext, 
    sampleRate: number
  ): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length;
    const buffer = ctx.createBuffer(1, frameCount, sampleRate);
    const channelData = buffer.getChannelData(0);
    
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }
    return buffer;
  }
}