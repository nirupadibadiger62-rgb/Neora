import React, { useState, useRef } from 'react';
import { GeminiService } from '../services/gemini';
import { IconPhoto, IconSpark } from './ui/Icons';

export const ImageGenerator: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16'>('1:1');
    const geminiService = useRef(new GeminiService());

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || loading) return;
        setLoading(true);
        setImages([]);

        try {
            const result = await geminiService.current.generateImage(prompt, aspectRatio);
            setImages(result);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-background relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-purple-900/20 to-transparent pointer-events-none" />

            <div className="flex-1 overflow-y-auto z-10 p-6 md:p-12 flex flex-col items-center">
                <div className="mb-10 text-center">
                    <h2 className="text-4xl md:text-5xl font-display font-medium text-white mb-4 tracking-tight">
                        Seedream <span className="text-purple-400">Canvas</span>
                    </h2>
                    <p className="text-white/40 max-w-lg mx-auto">
                        Transform your imagination into reality with Gemini's advanced image generation models.
                    </p>
                </div>

                {/* Gallery */}
                {images.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl animate-fade-in">
                        {images.map((img, idx) => (
                            <div key={idx} className="group relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl aspect-square">
                                <img 
                                    src={`data:image/png;base64,${img}`} 
                                    alt={`Generated ${idx}`} 
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                                    <button 
                                        onClick={() => {
                                            const link = document.createElement('a');
                                            link.href = `data:image/png;base64,${img}`;
                                            link.download = `seedream-${Date.now()}.png`;
                                            link.click();
                                        }}
                                        className="bg-white text-black px-4 py-2 rounded-lg font-medium text-sm hover:bg-white/90"
                                    >
                                        Download
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    !loading && (
                        <div className="w-full max-w-md aspect-square border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-white/20">
                            <IconPhoto className="w-12 h-12 mb-4 opacity-50" />
                            <span>Your creation will appear here</span>
                        </div>
                    )
                )}

                {loading && (
                    <div className="flex flex-col items-center justify-center py-20">
                         <div className="relative w-24 h-24">
                            <div className="absolute inset-0 border-4 border-purple-500/20 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-purple-500 rounded-full border-t-transparent animate-spin"></div>
                            <IconSpark className="absolute inset-0 m-auto w-8 h-8 text-white animate-pulse" />
                         </div>
                         <p className="mt-6 text-purple-300 font-medium animate-pulse">Dreaming...</p>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="p-6 md:p-8 shrink-0 flex justify-center z-20 bg-background/80 backdrop-blur-lg border-t border-white/5">
                <form onSubmit={handleGenerate} className="w-full max-w-3xl flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <input 
                            type="text" 
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="A futuristic city on Mars, cinematic lighting..."
                            className="w-full bg-surface border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-purple-500/50 outline-none transition-colors"
                        />
                    </div>
                    
                    <div className="flex gap-2">
                        <select 
                            value={aspectRatio}
                            onChange={(e) => setAspectRatio(e.target.value as any)}
                            className="bg-surface border border-white/10 rounded-2xl px-4 py-4 text-white/70 outline-none appearance-none cursor-pointer hover:bg-white/5"
                        >
                            <option value="1:1">1:1 Square</option>
                            <option value="16:9">16:9 Landscape</option>
                            <option value="9:16">9:16 Portrait</option>
                        </select>
                        <button 
                            type="submit"
                            disabled={loading || !prompt.trim()}
                            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium px-8 py-4 rounded-2xl transition-all shadow-lg shadow-purple-900/30 disabled:opacity-50 disabled:shadow-none"
                        >
                            Create
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};