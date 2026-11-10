import React from 'react';
import { Camera, Volume2, VolumeX, Smartphone, Play, HelpCircle } from 'lucide-react';

interface TitleScreenProps {
  onStart: () => void;
  onOpenAPKModal: () => void;
  highScore: number;
  isMuted: boolean;
  onToggleMute: () => void;
  gyroEnabled: boolean;
  onToggleGyro: () => void;
  isInstallable: boolean;
  onInstallPWA: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStart,
  onOpenAPKModal,
  highScore,
  isMuted,
  onToggleMute,
  gyroEnabled,
  onToggleGyro,
  isInstallable,
  onInstallPWA,
}) => {
  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-between p-6 sm:p-10 select-none bg-gradient-to-b from-transparent via-[#060913]/40 to-[#060913]/90 pointer-events-auto">
      {/* Top Bar Status */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded border border-cyan-500/30 bg-cyan-950/40 text-cyan-400 font-mono-code text-xs tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            SYS: ONLINE
          </div>
          <div className="text-xs font-mono-code text-slate-400 tracking-wider">
            HIGH SCORE: <span className="text-amber-400 font-bold tabular-nums">{highScore.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleGyro}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono-code font-bold tracking-wide transition ${
              gyroEnabled
                ? 'border-emerald-400 bg-emerald-950/80 text-emerald-300 shadow-lg shadow-emerald-950/50'
                : 'border-slate-700 bg-slate-900/70 hover:bg-slate-800 text-slate-300'
            }`}
            title="Enable/Disable Mobile Gyroscope Tilt Flight Controls"
          >
            <Smartphone className={`w-3.5 h-3.5 ${gyroEnabled ? 'text-emerald-400' : 'text-cyan-400'}`} />
            <span>GYRO: {gyroEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {isInstallable && (
            <button
              onClick={onInstallPWA}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-400 text-xs font-semibold tracking-wide transition shadow-lg shadow-emerald-950/40"
              title="Install WebAPK directly on your Android phone"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Install App</span>
            </button>
          )}

          <a
            href="/cavedroid-3d.apk"
            download="CAVEDROID-3D-signed.apk"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/60 hover:bg-emerald-900/70 text-emerald-300 text-xs font-semibold tracking-wide transition shadow-lg shadow-emerald-950/40"
            title="Download Signed Android APK (1.4 MB)"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span>Download APK</span>
          </a>

          <button
            onClick={onOpenAPKModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900/70 hover:bg-slate-800 text-slate-300 text-xs font-medium tracking-wide transition"
            title="Android APK & Play Store AAB Bundle Details"
          >
            <span>APK Details</span>
          </button>

          <button
            onClick={onToggleMute}
            className="p-2 rounded-lg border border-slate-700 bg-slate-900/70 hover:bg-slate-800 text-slate-300 transition"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>
      </div>

      {/* Hero Centerpiece: Bespoke SVG Title Lockup */}
      <div className="flex flex-col items-center justify-center my-auto text-center px-4 max-w-2xl mx-auto">
        {/* Custom Inline SVG Logo */}
        <div className="relative mb-6">
          <svg className="w-64 h-24 sm:w-80 sm:h-28" viewBox="0 0 320 110" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="titleCyan" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8"/>
                <stop offset="50%" stopColor="#0284c7"/>
                <stop offset="100%" stopColor="#0369a1"/>
              </linearGradient>
              <linearGradient id="neonOrange" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b"/>
                <stop offset="100%" stopColor="#ef4444"/>
              </linearGradient>
              <filter id="glowTitle" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* Subterranean flight wings badge */}
            <path d="M20 75 L160 30 L300 75 L280 85 L160 48 L40 85 Z" fill="#0f172a" stroke="#0369a1" strokeWidth="1.5" opacity="0.8"/>
            <path d="M160 20 L185 55 L160 50 L135 55 Z" fill="url(#neonOrange)" />

            {/* Glowing Main Wordmark */}
            <text x="160" y="58" textAnchor="middle" fontFamily="'Chakra Petch', sans-serif" fontWeight="800" fontSize="34" letterSpacing="4" fill="#ffffff" filter="url(#glowTitle)">
              CAVEDROID
            </text>
            <text x="160" y="58" textAnchor="middle" fontFamily="'Chakra Petch', sans-serif" fontWeight="800" fontSize="34" letterSpacing="4" fill="url(#titleCyan)">
              CAVEDROID
            </text>

            {/* 3D Flight Subtitle */}
            <text x="160" y="82" textAnchor="middle" fontFamily="'JetBrains Mono', monospace" fontWeight="700" fontSize="11" letterSpacing="6" fill="#38bdf8">
              SUBTERRANEAN 3D FLIGHT
            </text>

            {/* Corner Targeting Accents */}
            <path d="M 10 30 L 10 12 L 28 12" stroke="#38bdf8" strokeWidth="2"/>
            <path d="M 310 30 L 310 12 L 292 12" stroke="#38bdf8" strokeWidth="2"/>
            <path d="M 10 75 L 10 95 L 28 95" stroke="#38bdf8" strokeWidth="2"/>
            <path d="M 310 75 L 310 95 L 292 95" stroke="#38bdf8" strokeWidth="2"/>
          </svg>
        </div>

        <p className="text-slate-300 text-sm sm:text-base max-w-lg mb-8 leading-relaxed font-light">
          Pilot your high-speed combat fighter deep into winding cyber caverns. Dodge rock spires, destroy rogue defense sentinels, and toggle between <span className="text-cyan-400 font-semibold">Isometric Tactical</span> and <span className="text-amber-400 font-semibold">FPS Cockpit</span> perspectives!
        </p>

        {/* Primary Start CTA Button */}
        <button
          onClick={onStart}
          className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-600 via-sky-500 to-blue-600 text-white font-bold text-lg tracking-wider transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-xl shadow-cyan-900/40 border border-cyan-400/40"
        >
          <Play className="w-5 h-5 fill-white" />
          <span>LAUNCH EXPEDITION</span>
          <span className="hidden sm:inline-block ml-2 text-xs font-mono-code bg-white/20 px-2 py-0.5 rounded text-white/90">
            SPACE / ENTER
          </span>
        </button>
      </div>

      {/* Flat Control Hints Bar */}
      <div className="flex flex-col items-center gap-2 pt-4 border-t border-slate-800/80">
        <div className="text-xs sm:text-sm text-slate-400 font-mono-code tracking-wide text-center">
          <span className="text-slate-200 font-medium">WASD / Arrows</span> Move · <span className="text-slate-200 font-medium">Space</span> Fire · <span className="text-slate-200 font-medium">Shift</span> Boost · <span className="text-cyan-400 font-medium">V</span> Switch View · <span className="text-slate-200 font-medium">Q/E</span> Roll · <span className="text-slate-200 font-medium">F</span> EMP · <span className="text-slate-200 font-medium">Esc</span> Pause
        </div>
        <div className="text-[11px] text-slate-500 tracking-wider">
          Mobile Gyroscope Tilt Steering, Touch Joystick & Virtual Flight Buttons enabled on Android / Mobile
        </div>
      </div>
    </div>
  );
};
