import React, { useState, useRef } from 'react';
import { GeminiService } from '../services/gemini';
import { IconBolt } from './ui/Icons';

export const QuickAsk: React.FC = () => {
    const [query, setQuery] = useState('');
    const [response, setResponse] = useState('');
    const [loading, setLoading] = useState(false);
    const geminiService = useRef(new GeminiService());

    const handleAsk = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;
        setLoading(true);
        const start = performance.now();
        try {
            const text = await geminiService.current.quickAsk(query);
            const end = performance.now();
            setResponse(`${text}\n\n(Latency: ${(end - start).toFixed(0)}ms)`);
        } catch (error) {
            setResponse("Error fetching response.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col justify-center items-center p-6 bg-slate-900">
            <div className="w-full max-w-lg">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-500/10 mb-4">
                        <IconBolt className="w-8 h-8 text-yellow-500" />
                    </div>
                    <h2 className="text-3xl font-bold text-white">Quick Ask</h2>
                    <p className="text-slate-400 mt-2">Powered by Gemini Flash Lite for instant answers.</p>
                </div>

                <form onSubmit={handleAsk} className="relative mb-8">
                    <input 
                        type="text" 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="What's on your mind?"
                        className="w-full bg-slate-800 border-2 border-slate-700 focus:border-yellow-500 rounded-2xl px-6 py-4 text-lg text-white outline-none transition-colors shadow-xl"
                    />
                    <button 
                        type="submit"
                        disabled={loading}
                        className="absolute right-3 top-3 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold px-4 py-2 rounded-xl transition-all disabled:opacity-50"
                    >
                        GO
                    </button>
                </form>

                {response && (
                    <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <p className="text-slate-200 text-lg leading-relaxed whitespace-pre-wrap">{response}</p>
                    </div>
                )}
            </div>
        </div>
    );
};
