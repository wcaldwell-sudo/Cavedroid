import React from 'react';
import { Play, RotateCcw, Camera, Volume2, VolumeX, Smartphone, Crosshair, Sliders, ArrowUpDown } from 'lucide-react';
import { CameraViewMode } from '../game/gameEngine';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  viewMode: CameraViewMode;
  onTogglePerspective: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  gyroEnabled: boolean;
  gyroSensitivity: number;
  gyroInvertY: boolean;
  onToggleGyro: () => void;
  onCalibrateGyro: () => void;
  onCycleGyroSensitivity: () => void;
  onToggleGyroInvertY: () => void;
  onOpenAPKModal: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  viewMode,
  onTogglePerspective,
  isMuted,
  onToggleMute,
  gyroEnabled,
  gyroSensitivity,
  gyroInvertY,
  onToggleGyro,
  onCalibrateGyro,
  onCycleGyroSensitivity,
  onToggleGyroInvertY,
  onOpenAPKModal,
}) => {
  const sensitivityLabel =
    gyroSensitivity > 1.1 ? 'HIGH (1.4x)' : gyroSensitivity < 0.9 ? 'LOW (0.7x)' : 'NORMAL (1.0x)';

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 select-none overflow-y-auto">
      <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700/80 p-6 shadow-2xl flex flex-col items-center text-center my-auto">
        {/* Title */}
        <div className="text-xs font-mono-code text-cyan-400 tracking-widest uppercase mb-1">
          NAVIGATION PAUSED
        </div>
        <h2 className="text-2xl font-bold font-cyber text-white mb-5">
          MISSION STANDBY
        </h2>

        {/* Buttons List */}
        <div className="flex flex-col gap-2.5 w-full">
          <button
            onClick={onResume}
            className="flex items-center justify-center gap-2.5 w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition shadow-lg shadow-cyan-950/50"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>RESUME FLIGHT</span>
          </button>

          <button
            onClick={onRestart}
            className="flex items-center justify-center gap-2.5 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition border border-slate-700"
          >
            <RotateCcw className="w-4 h-4 text-cyan-400" />
            <span>RESTART RUN</span>
          </button>

          <button
            onClick={onTogglePerspective}
            className="flex items-center justify-center gap-2.5 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition border border-slate-700"
          >
            <Camera className="w-4 h-4 text-sky-400" />
            <span>VIEW: {viewMode.toUpperCase()}</span>
          </button>

          {/* Gyroscope Controls Section */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-2 mt-1">
            <button
              onClick={onToggleGyro}
              className={`flex items-center justify-center gap-2 w-full py-2 rounded-lg text-xs font-bold transition border ${
                gyroEnabled
                  ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Smartphone className={`w-4 h-4 ${gyroEnabled ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span>GYRO TILT CONTROLS: {gyroEnabled ? 'ON' : 'OFF'}</span>
            </button>

            {gyroEnabled && (
              <>
                <button
                  onClick={onCalibrateGyro}
                  className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 text-xs font-mono-code font-semibold border border-cyan-500/30 transition"
                >
                  <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                  <span>RECENTER GYRO ZERO-POINT</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={onCycleGyroSensitivity}
                    className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] font-mono-code border border-slate-800 transition"
                  >
                    <Sliders className="w-3 h-3 text-amber-400 shrink-0" />
                    <span className="truncate">{sensitivityLabel}</span>
                  </button>

                  <button
                    onClick={onToggleGyroInvertY}
                    className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] font-mono-code border border-slate-800 transition"
                  >
                    <ArrowUpDown className="w-3 h-3 text-sky-400 shrink-0" />
                    <span className="truncate">PITCH: {gyroInvertY ? 'INVERT' : 'NORMAL'}</span>
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            onClick={onToggleMute}
            className="flex items-center justify-center gap-2.5 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition border border-slate-700"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            <span>{isMuted ? 'UNMUTE AUDIO' : 'MUTE AUDIO'}</span>
          </button>

          <button
            onClick={onOpenAPKModal}
            className="flex items-center justify-center gap-2.5 w-full py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition border border-slate-700/80 mt-1"
          >
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span>Android APK & Install Options</span>
          </button>
        </div>
      </div>
    </div>
  );
};
