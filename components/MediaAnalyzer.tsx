import React, { useState, useRef } from 'react';
import { GeminiService } from '../services/gemini';
import { AnalysisType } from '../types';
import { IconPhoto, IconVideo, IconMic, IconScan, IconSpark } from './ui/Icons';

export const MediaAnalyzer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AnalysisType>(AnalysisType.IMAGE);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  
  const geminiService = useRef(new GeminiService());

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      setResult('');
      
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(f);
    }
  };

  const handleAnalyze = async () => {
      if (!file) return;
      setLoading(true);
      setResult('');

      try {
          // Default prompts
          let prompt = "Describe this image in detail.";
          if (activeTab === AnalysisType.VIDEO) prompt = "Summarize this video and extract key points.";
          if (activeTab === AnalysisType.AUDIO) prompt = "Transcribe this audio.";

          const text = await geminiService.current.analyzeMedia(file, activeTab, prompt);
          setResult(text);
      } catch (e) {
          setResult("Error analyzing media. Please try again.");
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  const acceptType = activeTab === AnalysisType.IMAGE ? "image/*" : activeTab === AnalysisType.VIDEO ? "video/*" : "audio/*";

  return (
    <div className="h-full flex flex-col bg-slate-900 p-4 md:p-6 overflow-y-auto">
        <h2 className="text-xl md:text-2xl font-bold text-slate-100 mb-6 flex items-center gap-3">
            <IconScan className="w-6 h-6 md:w-8 md:h-8 text-teal-400" />
            Media Analysis
        </h2>

        {/* Tabs */}
        <div className="flex gap-2 md:gap-4 mb-8">
            {[
                { id: AnalysisType.IMAGE, icon: IconPhoto, label: 'Image' },
                { id: AnalysisType.VIDEO, icon: IconVideo, label: 'Video' },
                { id: AnalysisType.AUDIO, icon: IconMic, label: 'Audio' },
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setFile(null); setPreview(null); setResult(''); }}
                    className={`flex-1 py-3 md:py-4 rounded-xl border flex flex-col items-center justify-center gap-1 md:gap-2 transition-all ${activeTab === tab.id ? 'bg-slate-800 border-teal-500 text-teal-400 shadow-[0_0_20px_rgba(20,184,166,0.2)]' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                >
                    <tab.icon className="w-5 h-5 md:w-6 md:h-6" />
                    <span className="font-medium text-xs md:text-sm">{tab.label}</span>
                </button>
            ))}
        </div>

        {/* Upload Area */}
        <div className="border-2 border-dashed border-slate-700 rounded-2xl p-4 md:p-8 flex flex-col items-center justify-center bg-slate-950/50 hover:bg-slate-950 transition-colors relative min-h-[200px]">
            <input 
                type="file" 
                accept={acceptType}
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
            />
            {preview ? (
                <div className="w-full max-h-64 flex justify-center">
                    {activeTab === AnalysisType.IMAGE && <img src={preview} alt="Preview" className="max-h-64 rounded-lg object-contain" />}
                    {activeTab === AnalysisType.VIDEO && <video src={preview} controls className="max-h-64 rounded-lg" />}
                    {activeTab === AnalysisType.AUDIO && (
                        <div className="flex flex-col items-center text-teal-400">
                             <IconMic className="w-16 h-16 mb-2" />
                             <span className="text-sm text-slate-400">{file?.name}</span>
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center">
                    <div className="bg-slate-800 w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                        <span className="text-2xl">+</span>
                    </div>
                    <p className="text-slate-300 font-medium text-sm md:text-base">Tap to upload</p>
                    <p className="text-slate-500 text-xs md:text-sm mt-1">Supports {activeTab.toLowerCase()} formats</p>
                </div>
            )}
        </div>

        {/* Action Button */}
        {file && (
            <button
                onClick={handleAnalyze}
                disabled={loading}
                className="mt-6 w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-xl font-semibold transition-all shadow-lg flex items-center justify-center gap-2 active:scale-98"
            >
                {loading ? (
                    <>Processing...</>
                ) : (
                    <>Analyze {activeTab} <IconSpark className="w-5 h-5" /></>
                )}
            </button>
        )}

        {/* Result */}
        {result && (
            <div className="mt-8 bg-slate-800 rounded-2xl p-4 md:p-6 border border-slate-700 mb-4">
                <h3 className="text-lg font-semibold text-slate-100 mb-4 border-b border-slate-700 pb-2">Analysis Result</h3>
                <div className="text-slate-300 leading-relaxed whitespace-pre-wrap text-sm md:text-base">
                    {result}
                </div>
            </div>
        )}
    </div>
  );
};