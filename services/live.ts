import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { MODEL_LIVE, SAMPLE_RATE_INPUT, SAMPLE_RATE_OUTPUT } from '../constants';
import { base64ToUint8Array, decodeAudioData, float32ToPcm16, uint8ArrayToBase64 } from '../utils/audio';

export interface LiveConnectionCallbacks {
  onOpen: () => void;
  onClose: () => void;
  onVolume: (level: number) => void;
  onError: (error: Error) => void;
}

export class LiveService {
  private ai: GoogleGenAI;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private sessionPromise: Promise<any> | null = null;
  private isConnected = false;
  private volumeInterval: number | null = null;
  
  // Video streaming
  private videoInterval: number | null = null;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async connect(callbacks: LiveConnectionCallbacks, videoElement?: HTMLVideoElement) {
    if (this.isConnected) return;

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: SAMPLE_RATE_OUTPUT, 
      });

      // Setup Analyser for Visualizer
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.5;

      // Start polling volume
      this.startVolumePolling(callbacks.onVolume);

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
            channelCount: 1,
            sampleRate: SAMPLE_RATE_INPUT,
        }
      });

      this.sessionPromise = this.ai.live.connect({
        model: MODEL_LIVE,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: "You are Neora AI, a helpful and advanced AI assistant. You are concise, friendly, and conversational. Always identify yourself as Neora AI.",
        },
        callbacks: {
          onopen: () => {
            console.log('Live Session Opened');
            this.isConnected = true;
            callbacks.onOpen();
            this.startAudioInput(stream);
            if (videoElement) {
                this.startVideoInput(videoElement);
            }
          },
          onmessage: async (msg: LiveServerMessage) => {
            this.handleMessage(msg);
          },
          onclose: () => {
            console.log('Live Session Closed');
            this.cleanup();
            callbacks.onClose();
          },
          onerror: (err: any) => {
            console.error('Live Session Error', err);
            callbacks.onError(err instanceof Error ? err : new Error(String(err)));
          },
        }
      });
      
    } catch (error) {
      callbacks.onError(error instanceof Error ? error : new Error('Failed to connect'));
    }
  }

  private startVolumePolling(onVolume: (level: number) => void) {
      this.volumeInterval = window.setInterval(() => {
          if (this.analyser) {
              const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
              this.analyser.getByteFrequencyData(dataArray);
              
              // Calculate simple average volume
              let sum = 0;
              for(let i = 0; i < dataArray.length; i++) {
                  sum += dataArray[i];
              }
              const average = sum / dataArray.length;
              // Normalize (approximate max for speech usually sits around 128-150 in byte freq data)
              const normalized = Math.min(1, average / 64);
              onVolume(normalized);
          }
      }, 33); // ~30fps
  }

  private startAudioInput(stream: MediaStream) {
    if (!this.audioContext || !this.analyser) return;

    const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: SAMPLE_RATE_INPUT });
    
    this.inputSource = inputCtx.createMediaStreamSource(stream);
    
    // Connect to Analyser for visualization only
    const visSource = this.audioContext.createMediaStreamSource(stream);
    visSource.connect(this.analyser);

    // Processing Path (Input Context)
    this.processor = inputCtx.createScriptProcessor(4096, 1, 1);
    this.processor.onaudioprocess = (e) => {
        if (!this.isConnected || !this.sessionPromise) return;

        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = float32ToPcm16(inputData);
        const uint8 = new Uint8Array(pcm16.buffer);
        const base64 = uint8ArrayToBase64(uint8);

        this.sessionPromise.then(session => {
            session.sendRealtimeInput({
                media: {
                    mimeType: 'audio/pcm;rate=16000',
                    data: base64
                }
            });
        });
    };

    this.inputSource.connect(this.processor);
    this.processor.connect(inputCtx.destination);
  }

  private startVideoInput(videoEl: HTMLVideoElement) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if(!ctx) return;

      this.videoInterval = window.setInterval(() => {
          if (!this.isConnected || !this.sessionPromise || videoEl.paused || videoEl.ended) return;

          canvas.width = videoEl.videoWidth / 4; 
          canvas.height = videoEl.videoHeight / 4;
          ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
          
          const base64 = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
          
          this.sessionPromise!.then(session => {
              session.sendRealtimeInput({
                  media: {
                      mimeType: 'image/jpeg',
                      data: base64
                  }
              });
          });

      }, 1000);
  }

  private async handleMessage(message: LiveServerMessage) {
    if (!this.audioContext || !this.analyser) return;

    const serverContent = message.serverContent;
    
    if (serverContent?.interrupted) {
        this.sources.forEach(source => source.stop());
        this.sources.clear();
        this.nextStartTime = 0;
        return;
    }

    const modelTurn = serverContent?.modelTurn;
    if (modelTurn?.parts) {
      for (const part of modelTurn.parts) {
        if (part.inlineData && part.inlineData.data) {
          const audioData = base64ToUint8Array(part.inlineData.data);
          const audioBuffer = await decodeAudioData(audioData, this.audioContext, SAMPLE_RATE_OUTPUT);
          
          const source = this.audioContext.createBufferSource();
          source.buffer = audioBuffer;
          
          // Connect to Analyser for visualization
          source.connect(this.analyser);
          // Connect to Destination for hearing
          source.connect(this.audioContext.destination);
          
          const currentTime = this.audioContext.currentTime;
          const startTime = Math.max(currentTime, this.nextStartTime);
          source.start(startTime);
          
          this.nextStartTime = startTime + audioBuffer.duration;
          
          this.sources.add(source);
          source.onended = () => this.sources.delete(source);
        }
      }
    }
  }

  disconnect() {
    this.isConnected = false;
    if (this.sessionPromise) {
        this.sessionPromise.then(session => session.close());
        this.sessionPromise = null;
    }
    this.cleanup();
  }

  private cleanup() {
    if (this.volumeInterval) {
        clearInterval(this.volumeInterval);
        this.volumeInterval = null;
    }
    if (this.processor) {
        this.processor.disconnect();
        this.processor = null;
    }
    if (this.inputSource) {
        this.inputSource.disconnect();
        this.inputSource = null;
    }
    if (this.audioContext) {
        this.audioContext.close();
        this.audioContext = null;
    }
    if (this.videoInterval) {
        window.clearInterval(this.videoInterval);
        this.videoInterval = null;
    }
    this.sources.clear();
    this.nextStartTime = 0;
    this.analyser = null;
  }
}