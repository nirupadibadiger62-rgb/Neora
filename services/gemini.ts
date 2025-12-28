import { GoogleGenAI, Type } from '@google/genai';
import { 
    MODEL_CHAT_STD, 
    MODEL_CHAT_SEARCH, 
    MODEL_CHAT_MAPS, 
    MODEL_THINKING, 
    MODEL_FAST,
    MODEL_IMAGE_ANALYZE,
    MODEL_VIDEO,
    MODEL_AUDIO_TRANSCRIPTION,
    MODEL_IMAGE_GEN,
    MODEL_IMAGE_GEN_HQ,
    MAX_THINKING_BUDGET
} from '../constants';
import { ChatMode, AnalysisType } from '../types';

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async sendChatMessage(
    message: string, 
    history: { role: 'user' | 'model', parts: { text: string }[] }[],
    mode: ChatMode,
    location?: GeolocationCoordinates
  ) {
    let model = MODEL_CHAT_STD;
    let config: any = {};
    const tools: any[] = [];

    switch (mode) {
        case ChatMode.SEARCH:
            model = MODEL_CHAT_SEARCH;
            tools.push({ googleSearch: {} });
            break;
        case ChatMode.MAPS:
            model = MODEL_CHAT_MAPS;
            tools.push({ googleMaps: {} });
            if (location) {
                config.toolConfig = {
                    retrievalConfig: {
                        latLng: {
                            latitude: location.latitude,
                            longitude: location.longitude
                        }
                    }
                };
            }
            break;
        case ChatMode.THINKING:
            model = MODEL_THINKING;
            config.thinkingConfig = { thinkingBudget: MAX_THINKING_BUDGET };
            break;
        case ChatMode.STANDARD:
        default:
            model = MODEL_CHAT_STD;
            break;
    }

    if (tools.length > 0) {
        config.tools = tools;
    }
    
    const chat = this.ai.chats.create({
        model: model,
        config: config,
        history: history
    });

    const result = await chat.sendMessageStream({
        message: message
    });

    return result;
  }

  async generateImage(prompt: string, aspectRatio: '1:1' | '16:9' | '9:16' = '1:1'): Promise<string[]> {
      const response = await this.ai.models.generateContent({
          model: MODEL_IMAGE_GEN,
          contents: {
             parts: [{ text: prompt }]
          },
          config: {
              imageConfig: {
                  aspectRatio: aspectRatio,
              }
          }
      });
      
      const images: string[] = [];
      if (response.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
              if (part.inlineData && part.inlineData.data) {
                  images.push(part.inlineData.data);
              }
          }
      }
      return images;
  }

  async summarizeChat(history: { role: 'user' | 'model', parts: { text: string }[] }[]) {
      const historyText = history.map(h => `${h.role === 'user' ? 'User' : 'Model'}: ${h.parts[0].text}`).join('\n\n');
      
      const response = await this.ai.models.generateContent({
          model: MODEL_CHAT_STD,
          contents: `You are an expert synthesizer of information. Please provide a concise, bulleted summary of the following conversation, highlighting the main topics discussed and any conclusions reached:\n\n${historyText}`,
      });
      return response.text;
  }

  async quickAsk(prompt: string) {
      const response = await this.ai.models.generateContent({
          model: MODEL_FAST,
          contents: prompt
      });
      return response.text;
  }

  async analyzeMedia(file: File, type: AnalysisType, prompt: string) {
      let model = MODEL_IMAGE_ANALYZE;
      if (type === AnalysisType.VIDEO) model = MODEL_VIDEO;
      if (type === AnalysisType.AUDIO) model = MODEL_AUDIO_TRANSCRIPTION;

      const base64Data = await this.fileToBase64(file);
      const mimeType = file.type;

      const response = await this.ai.models.generateContent({
          model: model,
          contents: {
              parts: [
                  {
                      inlineData: {
                          mimeType: mimeType,
                          data: base64Data
                      }
                  },
                  { text: prompt }
              ]
          }
      });
      return response.text;
  }

  private fileToBase64(file: File): Promise<string> {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => {
             const result = reader.result as string;
             resolve(result.split(',')[1]);
          };
          reader.onerror = error => reject(error);
      });
  }
}