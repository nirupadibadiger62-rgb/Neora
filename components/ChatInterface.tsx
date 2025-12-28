import React, { useState, useRef, useEffect } from 'react';
import { GeminiService } from '../services/gemini';
import { ChatMode, Message } from '../types';
import { IconChat, IconGoogle, IconMap, IconBrain, IconSpark, IconList, IconCopy, IconCheck, IconBolt } from './ui/Icons';
import { GenerateContentResponse } from '@google/genai';

export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [mode, setMode] = useState<ChatMode>(ChatMode.STANDARD);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; msgId: string } | null>(null);
  
  const geminiService = useRef(new GeminiService());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
      // Close context menu on global click
      const handleClick = () => setContextMenu(null);
      window.addEventListener('click', handleClick);
      return () => window.removeEventListener('click', handleClick);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
      if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
      }
  }, [input]);

  const copyToClipboard = (text: string, id?: string) => {
    navigator.clipboard.writeText(text);
    if (id) {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, msgId: string) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, msgId });
  };

  const executeSend = async (text: string, history: Message[]) => {
      setLoading(true);
      
      try {
        let location: GeolocationCoordinates | undefined;
        if (mode === ChatMode.MAPS) {
            try {
                const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                   navigator.geolocation.getCurrentPosition(resolve, reject); 
                });
                location = pos.coords;
            } catch (e) {
                console.warn("Location denied", e);
            }
        }

        const sdkHistory = history.map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }));

        const resultStream = await geminiService.current.sendChatMessage(text, sdkHistory, mode, location);
        
        const botMsgId = (Date.now() + 1).toString();
        let fullText = '';
        let groundingMetadata = null;

        setMessages(prev => [...prev, { id: botMsgId, role: 'model', text: '', timestamp: new Date(), thinking: mode === ChatMode.THINKING }]);

        for await (const chunk of resultStream) {
             const responseChunk = chunk as GenerateContentResponse;
             const text = responseChunk.text || '';
             fullText += text;
             
             if (responseChunk.candidates?.[0]?.groundingMetadata) {
                 groundingMetadata = responseChunk.candidates[0].groundingMetadata;
             }

             setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, text: fullText, groundingMetadata: groundingMetadata } : m));
        }

    } catch (error) {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "I encountered an error processing your request.", timestamp: new Date() }]);
        console.error(error);
    } finally {
        setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input, timestamp: new Date() };
    const currentHistory = [...messages]; 
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    
    // Reset height
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    await executeSend(userMsg.text, currentHistory);
  };

  const handleRegenerate = async (msgId: string) => {
      if (loading) return;
      const index = messages.findIndex(m => m.id === msgId);
      if (index === -1) return;

      const msg = messages[index];
      let newHistory: Message[] = [];
      let prompt = "";

      if (msg.role === 'model') {
          if (index > 0) {
              const prevMsg = messages[index - 1];
              if (prevMsg.role === 'user') {
                  newHistory = messages.slice(0, index - 1);
                  prompt = prevMsg.text;
                  setMessages([...newHistory, prevMsg]);
                  await executeSend(prompt, newHistory);
              }
          }
      } else {
           newHistory = messages.slice(0, index); 
           prompt = msg.text;
           setMessages([...newHistory, msg]);
           await executeSend(prompt, newHistory);
      }
  };

  const handleSummarizeMessage = async (msgId: string) => {
      if (loading || summarizing) return;
      const msg = messages.find(m => m.id === msgId);
      if (!msg) return;

      setSummarizing(true);
      try {
          const summaryHistory = [{ role: msg.role, parts: [{ text: msg.text }] }];
          const result = await geminiService.current.summarizeChat(summaryHistory as any);
          
          setMessages(prev => [...prev, {
              id: Date.now().toString(),
              role: 'model',
              text: `📝 **Snippet Summary**\n\n${result}`,
              timestamp: new Date()
          }]);
      } catch (e) {
          console.error(e);
      } finally {
          setSummarizing(false);
      }
  };

  const handleGlobalSummarize = async () => {
    if (messages.length <= 1 || summarizing || loading) return;
    setSummarizing(true);
    try {
        const history = messages.map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }));
        const summary = await geminiService.current.summarizeChat(history);
        const summaryMsg: Message = {
            id: Date.now().toString(),
            role: 'model',
            text: `📝 **Conversation Summary**\n\n${summary}`,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, summaryMsg]);
    } catch (e) {
        console.error("Summary failed", e);
    } finally {
        setSummarizing(false);
    }
  };

  const renderGrounding = (metadata: any) => {
      if (!metadata?.groundingChunks) return null;
      
      const chunks = metadata.groundingChunks;
      const links: { title: string, uri: string }[] = [];

      chunks.forEach((c: any) => {
          if (c.web?.uri) links.push({ title: c.web.title || 'Source', uri: c.web.uri });
          if (c.maps?.uri) links.push({ title: c.maps.title || 'Location', uri: c.maps.uri });
      });

      if (links.length === 0) return null;

      return (
          <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {links.map((link, idx) => (
                  <a 
                    key={idx} 
                    href={link.uri} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center gap-2 text-xs bg-surfaceHighlight hover:bg-white/10 p-2 rounded-lg transition-colors group"
                  >
                      <div className="w-5 h-5 rounded-full bg-black/20 flex items-center justify-center shrink-0 text-[10px] text-white/50 group-hover:text-primary">
                        {idx + 1}
                      </div>
                      <span className="truncate text-primary/80 group-hover:text-primary">{link.title}</span>
                  </a>
              ))}
          </div>
      );
  };

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Context Menu */}
      {contextMenu && (
        <div 
            className="fixed bg-[#1E1F20] border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1 min-w-[180px] z-50 animate-fade-in"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
        >
            <button 
                onClick={() => {
                    const msg = messages.find(m => m.id === contextMenu.msgId);
                    if (msg) copyToClipboard(msg.text);
                    setContextMenu(null);
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-white/90 hover:bg-white/10 flex items-center gap-3 transition-colors"
            >
                <IconCopy className="w-4 h-4 text-white/50" /> Copy Text
            </button>
            <button 
                onClick={() => {
                    handleSummarizeMessage(contextMenu.msgId);
                    setContextMenu(null);
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-white/90 hover:bg-white/10 flex items-center gap-3 transition-colors"
            >
                <IconList className="w-4 h-4 text-white/50" /> Summarize Message
            </button>
            {(() => {
                const msg = messages.find(m => m.id === contextMenu.msgId);
                if (msg && (msg.role === 'model' || msg === messages[messages.length - 1])) {
                    return (
                        <button 
                            onClick={() => {
                                handleRegenerate(contextMenu.msgId);
                                setContextMenu(null);
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-white/90 hover:bg-white/10 flex items-center gap-3 transition-colors border-t border-white/5 mt-1"
                        >
                            <IconSpark className="w-4 h-4 text-accent" /> Regenerate Response
                        </button>
                    );
                }
                return null;
            })()}
        </div>
      )}

      {/* Header */}
      <div className="p-4 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-surface border border-white/5">
              <span className="text-sm font-medium text-white/60 px-2">{mode}</span>
              <button onClick={() => setMode(ChatMode.STANDARD)} title="Standard" className={`w-2 h-2 rounded-full ${mode === ChatMode.STANDARD ? 'bg-accent' : 'bg-white/20'}`} />
              <button onClick={() => setMode(ChatMode.SEARCH)} title="Search" className={`w-2 h-2 rounded-full ${mode === ChatMode.SEARCH ? 'bg-blue-400' : 'bg-white/20'}`} />
              <button onClick={() => setMode(ChatMode.THINKING)} title="Thinking" className={`w-2 h-2 rounded-full ${mode === ChatMode.THINKING ? 'bg-purple-400' : 'bg-white/20'}`} />
          </div>
          <button 
                onClick={handleGlobalSummarize}
                disabled={summarizing || messages.length === 0}
                className="p-2 text-white/40 hover:text-white transition-colors"
                title="Summarize Chat"
            >
                <IconList className={`w-5 h-5 ${summarizing ? 'animate-pulse text-accent' : ''}`} />
          </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:px-20 lg:px-40 space-y-8 scrollbar-hide">
        {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-0 animate-fade-in" style={{animationDelay: '0.1s', animationFillMode: 'forwards'}}>
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-primary flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(76,141,246,0.2)]">
                    <IconChat className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl md:text-4xl font-display font-medium text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 mb-2">
                    Hello, Human.
                </h1>
                <p className="text-white/40 max-w-md text-center">
                    I'm Neora. I can help you with analysis, creative tasks, coding, or just exploring the web.
                </p>
            </div>
        ) : (
            messages.map((msg, idx) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                <div 
                    onContextMenu={(e) => handleContextMenu(e, msg.id)}
                    className={`group relative max-w-[90%] md:max-w-[80%] rounded-3xl p-5 cursor-default ${msg.role === 'user' ? 'bg-[#28292E] text-white' : 'text-white/90'}`}
                >
                    <button
                        onClick={(e) => { e.stopPropagation(); copyToClipboard(msg.text, msg.id); }}
                        className={`absolute top-2 right-2 p-1.5 rounded-lg text-white/30 hover:text-white transition-all ${copiedId === msg.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    >
                        {copiedId === msg.id ? <IconCheck className="w-4 h-4 text-green-400" /> : <IconCopy className="w-4 h-4" />}
                    </button>
                    {msg.role === 'model' && (
                        <div className="absolute -left-10 top-0 w-8 h-8 rounded-full bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center shadow-lg">
                            <IconSpark className="w-4 h-4 text-white" />
                        </div>
                    )}
                    {msg.thinking && msg.text === '' && (
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
                            <span className="text-sm font-medium text-purple-300 animate-pulse">Thinking...</span>
                        </div>
                    )}
                    <div className={`whitespace-pre-wrap leading-7 font-light tracking-wide ${msg.thinking && msg.text === '' ? 'hidden' : ''}`}>
                        {msg.text}
                    </div>
                    {msg.groundingMetadata && renderGrounding(msg.groundingMetadata)}
                </div>
            </div>
            ))
        )}
        {loading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
             <div className="flex justify-start pl-2">
                 <div className="flex gap-1">
                     <span className="w-2 h-2 bg-white/20 rounded-full animate-bounce" />
                     <span className="w-2 h-2 bg-white/20 rounded-full animate-bounce delay-100" />
                     <span className="w-2 h-2 bg-white/20 rounded-full animate-bounce delay-200" />
                 </div>
             </div>
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Floating Input Area */}
      <div className="p-4 md:pb-8 flex justify-center shrink-0 z-30">
        <div className="w-full max-w-3xl bg-surface border border-white/10 rounded-[32px] p-2 pl-6 flex items-end gap-2 shadow-2xl relative transition-colors focus-within:border-white/20 focus-within:bg-[#252629]">
            
            {/* Mode Select Dropup */}
            <div className="pb-3 mr-2 hidden md:block">
                 <button 
                    className="p-2 rounded-full hover:bg-white/5 text-accent transition-colors"
                    onClick={() => {
                        const next = mode === ChatMode.STANDARD ? ChatMode.SEARCH : mode === ChatMode.SEARCH ? ChatMode.THINKING : ChatMode.STANDARD;
                        setMode(next);
                    }}
                 >
                    {mode === ChatMode.STANDARD && <IconSpark className="w-6 h-6" />}
                    {mode === ChatMode.SEARCH && <IconGoogle className="w-6 h-6" />}
                    {mode === ChatMode.THINKING && <IconBrain className="w-6 h-6" />}
                 </button>
            </div>

            <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                    }
                }}
                placeholder="Ask anything..."
                className="w-full bg-transparent border-none outline-none text-white text-base py-4 max-h-[150px] resize-none scrollbar-hide"
                rows={1}
            />
            
            <button 
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className={`m-2 p-3 rounded-full flex items-center justify-center transition-all duration-300 ${input.trim() ? 'bg-white text-black hover:bg-gray-200 rotate-0' : 'bg-white/10 text-white/30 rotate-90'}`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                </svg>
            </button>
        </div>
      </div>
    </div>
  );
};