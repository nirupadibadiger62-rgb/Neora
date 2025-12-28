import React from 'react';
import { AppMode } from '../types';
import { IconSpark, IconChat, IconScan, IconBolt, IconPhoto } from './ui/Icons';

interface SidebarProps {
    mode: AppMode;
    setMode: (mode: AppMode) => void;
    collapsed: boolean;
    setCollapsed: (v: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mode, setMode, collapsed, setCollapsed }) => {
    
    const navItems = [
        { id: AppMode.CHAT, label: 'Chat', icon: IconChat, desc: 'Advanced LLM' },
        { id: AppMode.SEEDREAM, label: 'Seedream', icon: IconPhoto, desc: 'Image Gen' },
        { id: AppMode.LIVE, label: 'Live', icon: IconSpark, desc: 'Real-time Voice' },
        { id: AppMode.ANALYZE, label: 'Analyze', icon: IconScan, desc: 'Multimodal' },
        { id: AppMode.FAST, label: 'Quick', icon: IconBolt, desc: 'Flash Lite' },
    ];

    return (
        <aside className={`bg-surface border-r border-white/5 transition-all duration-300 flex flex-col z-50 ${collapsed ? 'w-16 items-center' : 'w-64'}`}>
            <div className="h-16 flex items-center px-4 shrink-0 justify-between">
                <div 
                    className={`flex items-center gap-2 cursor-pointer transition-opacity ${collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}
                    onClick={() => setCollapsed(true)}
                >
                     <span className="font-display font-medium text-xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">Neora</span>
                     <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white/60">v3.0</span>
                </div>
                <button 
                    onClick={() => setCollapsed(!collapsed)}
                    className="p-2 hover:bg-white/5 rounded-full text-white/60"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                    </svg>
                </button>
            </div>

            <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
                {/* New Chat Button Style */}
                <button 
                    onClick={() => setMode(AppMode.CHAT)}
                    className={`mb-6 flex items-center gap-3 bg-surfaceHighlight hover:bg-[#393b40] text-primary transition-all rounded-full p-3 shadow-lg ${collapsed ? 'justify-center w-10 h-10 p-0 mx-auto' : 'px-4 mx-2 w-auto'}`}
                >
                    <span className="text-xl">+</span>
                    {!collapsed && <span className="font-medium text-sm">New Chat</span>}
                </button>

                {navItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setMode(item.id)}
                        className={`w-full flex items-center gap-4 p-3 rounded-full transition-all group relative ${mode === item.id ? 'bg-[#004A77] text-primary' : 'text-white/70 hover:bg-white/5'}`}
                    >
                        <item.icon className={`w-5 h-5 shrink-0 ${mode === item.id ? 'text-primary' : 'text-white/70'}`} />
                        {!collapsed && (
                            <div className="flex flex-col items-start text-left">
                                <span className="text-sm font-medium">{item.label}</span>
                            </div>
                        )}
                        {collapsed && mode === item.id && (
                             <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-4 bg-primary rounded-full"></div>
                        )}
                    </button>
                ))}
            </nav>
            
            <div className={`p-4 border-t border-white/5 ${collapsed ? 'items-center' : ''} flex flex-col gap-2`}>
                {!collapsed && <div className="text-xs text-white/30 px-2">Powered by Gemini</div>}
            </div>
        </aside>
    );
};