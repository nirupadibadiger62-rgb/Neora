import React, { useState } from 'react';
import { LiveSession } from './components/LiveSession';
import { ChatInterface } from './components/ChatInterface';
import { MediaAnalyzer } from './components/MediaAnalyzer';
import { QuickAsk } from './components/QuickAsk';
import { ImageGenerator } from './components/ImageGenerator';
import { Sidebar } from './components/Sidebar';
import { AppMode } from './types';
import { IconSpark, IconChat, IconScan, IconBolt, IconPhoto } from './components/ui/Icons';

function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.CHAT);
  const [collapsed, setCollapsed] = useState(false);

  const renderContent = () => {
    switch (mode) {
      case AppMode.LIVE:
        return <LiveSession />;
      case AppMode.CHAT:
        return <ChatInterface />;
      case AppMode.ANALYZE:
        return <MediaAnalyzer />;
      case AppMode.FAST:
        return <QuickAsk />;
      case AppMode.SEEDREAM:
        return <ImageGenerator />;
      default:
        return <ChatInterface />;
    }
  };

  return (
    <div className="flex h-screen bg-background text-white font-sans overflow-hidden">
      
      {/* Sidebar for Desktop */}
      <div className="hidden md:flex shrink-0">
          <Sidebar mode={mode} setMode={setMode} collapsed={collapsed} setCollapsed={setCollapsed} />
      </div>

      {/* Main Content */}
      <main className="flex-1 relative h-full flex flex-col min-w-0 pb-20 md:pb-0">
        {renderContent()}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden h-20 bg-surface/90 backdrop-blur border-t border-white/5 flex justify-around items-center px-2 z-50 shrink-0 safe-pb absolute bottom-0 w-full">
            <MobileNavButton 
                active={mode === AppMode.CHAT} 
                onClick={() => setMode(AppMode.CHAT)}
                icon={IconChat}
                label="Chat"
            />
            <MobileNavButton 
                active={mode === AppMode.SEEDREAM} 
                onClick={() => setMode(AppMode.SEEDREAM)}
                icon={IconPhoto}
                label="Create"
            />
            <MobileNavButton 
                active={mode === AppMode.LIVE} 
                onClick={() => setMode(AppMode.LIVE)}
                icon={IconSpark}
                label="Live"
            />
            <MobileNavButton 
                active={mode === AppMode.ANALYZE} 
                onClick={() => setMode(AppMode.ANALYZE)}
                icon={IconScan}
                label="Scan"
            />
      </nav>
    </div>
  );
}

interface NavButtonProps {
    active: boolean;
    onClick: () => void;
    icon: React.ElementType;
    label: string;
}

const MobileNavButton: React.FC<NavButtonProps> = ({ active, onClick, icon: Icon, label }) => (
    <button 
        onClick={onClick}
        className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 ${active ? 'text-primary' : 'text-white/40 active:text-white'}`}
    >
        <div className={`p-1 rounded-full ${active ? 'bg-primary/10' : ''}`}>
             <Icon className={`w-6 h-6 ${active ? 'fill-current' : ''}`} />
        </div>
        <span className="text-[10px] font-medium mt-1">{label}</span>
    </button>
);

export default App;