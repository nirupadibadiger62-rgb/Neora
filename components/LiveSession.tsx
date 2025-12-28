import React, { useEffect, useRef, useState } from 'react';
import { LiveService } from '../services/live';
import { IconMic, IconVideo } from './ui/Icons';

export const LiveSession: React.FC = () => {
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const liveService = useRef(new LiveService());
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Visualizer State
  const volumeRef = useRef(0); // Use ref for animation loop to avoid re-renders
  const particlesRef = useRef<any[]>([]);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      liveService.current.disconnect();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  useEffect(() => {
      if (cameraEnabled && videoRef.current) {
          navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
            .then(stream => {
                if (videoRef.current) videoRef.current.srcObject = stream;
            })
            .catch(err => console.error("Camera error", err));
      } else if (videoRef.current) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream?.getTracks().forEach(t => t.stop());
          videoRef.current.srcObject = null;
      }
  }, [cameraEnabled]);

  // Canvas Animation Logic
  useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Initialize Particles
      const particleCount = 60;
      particlesRef.current = Array.from({ length: particleCount }).map(() => ({
          x: (Math.random() - 0.5) * 2, // normalized spherical coords
          y: (Math.random() - 0.5) * 2,
          z: (Math.random() - 0.5) * 2,
          baseRadius: 2 + Math.random() * 2,
          pulsePhase: Math.random() * Math.PI * 2
      }));

      let rotation = 0;

      const render = () => {
          if (!canvas || !ctx) return;
          
          // Responsive resize
          const { clientWidth, clientHeight } = canvas.parentElement || { clientWidth: 300, clientHeight: 300 };
          if (canvas.width !== clientWidth || canvas.height !== clientHeight) {
              canvas.width = clientWidth;
              canvas.height = clientHeight;
          }

          const width = canvas.width;
          const height = canvas.height;
          const volume = volumeRef.current; // 0 to ~2
          
          // Clear
          ctx.clearRect(0, 0, width, height);

          // Center
          const cx = width / 2;
          const cy = height / 2;
          
          // Dynamic parameters
          const baseSphereRadius = Math.min(width, height) * 0.25;
          const expansion = volume * 50; 
          const sphereRadius = baseSphereRadius + expansion;
          const rotationSpeed = 0.002 + (volume * 0.01);
          rotation += rotationSpeed;

          // Color calculation
          // Idle: Indigo/Purple. Active: Cyan/White
          const r = active ? 100 + volume * 155 : 75;
          const g = active ? 100 + volume * 155 : 85; 
          const b = 255;
          const color = `rgba(${r}, ${g}, ${b},`;

          // Sort particles by Z for depth
          particlesRef.current.forEach(p => {
              // Rotate around Y axis
              const cos = Math.cos(rotation);
              const sin = Math.sin(rotation);
              const x = p.x * cos - p.z * sin;
              const z = p.x * sin + p.z * cos;
              p.rx = x;
              p.ry = p.y;
              p.rz = z;
          });
          particlesRef.current.sort((a, b) => a.rz - b.rz);

          // Draw connections
          ctx.strokeStyle = `${color} 0.15)`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let i = 0; i < particlesRef.current.length; i++) {
              const p1 = particlesRef.current[i];
              for (let j = i + 1; j < particlesRef.current.length; j++) {
                  const p2 = particlesRef.current[j];
                  const dist = (p1.rx - p2.rx)**2 + (p1.ry - p2.ry)**2 + (p1.rz - p2.rz)**2;
                  if (dist < 0.5) { // Threshold for connection
                      // Project
                      const scale1 = 200 / (200 - p1.rz * sphereRadius * 0.01); // Perspective
                      const x1 = cx + p1.rx * sphereRadius;
                      const y1 = cy + p1.ry * sphereRadius;
                      
                      const scale2 = 200 / (200 - p2.rz * sphereRadius * 0.01);
                      const x2 = cx + p2.rx * sphereRadius;
                      const y2 = cy + p2.ry * sphereRadius;

                      ctx.moveTo(x1, y1);
                      ctx.lineTo(x2, y2);
                  }
              }
          }
          ctx.stroke();

          // Draw particles
          particlesRef.current.forEach(p => {
              const scale = 300 / (300 - p.rz); // Simple perspective
              const x = cx + p.rx * sphereRadius;
              const y = cy + p.ry * sphereRadius;
              
              const pSize = p.baseRadius * (1 + volume) * (active ? 1 : 0.5);
              const alpha = (p.rz + 2) / 3; // Fade out back particles

              ctx.fillStyle = `${color} ${alpha})`;
              ctx.beginPath();
              ctx.arc(x, y, pSize, 0, Math.PI * 2);
              ctx.fill();
          });
          
          animationRef.current = requestAnimationFrame(render);
      };

      render();

      return () => {
          if (animationRef.current) cancelAnimationFrame(animationRef.current);
      };
  }, [active]);

  const toggleSession = async () => {
    if (active) {
      liveService.current.disconnect();
      setActive(false);
      volumeRef.current = 0;
    } else {
      setError(null);
      await liveService.current.connect({
        onOpen: () => setActive(true),
        onClose: () => setActive(false),
        onError: (e) => {
            setError(e.message);
            setActive(false);
        },
        onVolume: (vol) => {
            // Smooth volume transition
            volumeRef.current = volumeRef.current * 0.8 + vol * 0.2;
        } 
      }, videoRef.current || undefined);
    }
  };

  return (
    <div className="flex flex-col items-center h-full w-full relative overflow-hidden bg-black">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-950/40 via-black to-black pointer-events-none" />
      
      {/* Header */}
      <div className="absolute top-0 w-full p-6 flex justify-between items-center z-20">
          <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${active ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-xs font-mono text-slate-400 tracking-widest uppercase">
                  {active ? 'Neural Link Active' : 'System Standby'}
              </span>
          </div>
          <div className="text-xs font-mono text-slate-600">
              V 2.5
          </div>
      </div>

      {/* Main Visualizer Area */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center">
        <canvas ref={canvasRef} className="w-full h-full absolute inset-0 z-10" />
        
        {/* Central Text Overlay (Only when inactive) */}
        {!active && (
             <div className="z-10 text-center animate-in fade-in zoom-in duration-700">
                 <h1 className="text-4xl md:text-6xl font-thin tracking-tighter text-white opacity-80 mb-2">NEORA</h1>
                 <p className="text-indigo-400 text-sm tracking-[0.3em]">INTELLIGENCE ONLINE</p>
             </div>
        )}
      </div>

      {/* Video Preview Bubble */}
      <div className={`absolute top-20 right-6 z-20 transition-all duration-500 ${cameraEnabled ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0 pointer-events-none'}`}>
          <div className="w-32 h-44 md:w-48 md:h-64 rounded-2xl overflow-hidden border border-slate-700/50 bg-black/50 backdrop-blur-md shadow-2xl relative">
              <video 
                ref={videoRef} 
                autoPlay 
                muted 
                playsInline 
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 flex gap-1">
                  <span className="w-1 h-1 bg-red-500 rounded-full animate-ping" />
              </div>
          </div>
      </div>

      {/* Glass Controls Dock */}
      <div className="absolute bottom-10 z-30 w-full flex justify-center px-4">
        <div className="flex items-center gap-6 p-4 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
            
            <button 
                onClick={() => setCameraEnabled(!cameraEnabled)}
                className={`p-4 rounded-full transition-all duration-300 ${cameraEnabled ? 'bg-slate-700 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'bg-transparent text-slate-400 hover:bg-white/10 hover:text-white'}`}
            >
                <IconVideo className="w-6 h-6" />
            </button>

            <div className="w-px h-8 bg-white/10" />
            
            <button 
                onClick={toggleSession}
                className={`relative group p-6 rounded-full transition-all duration-300 flex items-center justify-center ${active ? 'bg-red-500/80 hover:bg-red-600 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]'}`}
            >
                <div className={`absolute inset-0 rounded-full border border-white/30 scale-110 opacity-0 transition-all duration-500 ${active ? 'animate-ping opacity-30' : 'group-hover:scale-125 group-hover:opacity-100'}`} />
                <IconMic className={`w-8 h-8 transition-transform duration-300 ${active ? 'scale-90' : 'group-hover:scale-110'}`} />
            </button>

            {/* Optional text or settings could go here */}
        </div>
      </div>

      {error && (
        <div className="absolute top-24 bg-red-500/10 border border-red-500/50 text-red-200 px-6 py-3 rounded-full backdrop-blur-md text-sm shadow-xl z-50">
          {error}
        </div>
      )}
    </div>
  );
};