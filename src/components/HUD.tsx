import React, { useRef, useState, useEffect } from 'react';
import { Camera, Volume2, VolumeX, Pause, Zap, Shield, Gauge, Compass, Smartphone, Crosshair } from 'lucide-react';
import { GameStats } from '../game/gameEngine';

interface HUDProps {
  stats: GameStats;
  highScore: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onTogglePerspective: () => void;
  onTriggerEmp: () => void;
  onToggleGyro: () => void;
  onCalibrateGyro: () => void;
  onVirtualStick: (x: number, y: number) => void;
  onVirtualButton: (action: 'fire' | 'boost' | 'rollLeft' | 'rollRight' | 'emp' | 'view', isPressed: boolean) => void;
}

export const HUD: React.FC<HUDProps> = ({
  stats,
  isMuted,
  onToggleMute,
  onTogglePause,
  onTogglePerspective,
  onTriggerEmp,
  onToggleGyro,
  onCalibrateGyro,
  onVirtualStick,
  onVirtualButton,
}) => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Virtual joystick state
  const joystickContainerRef = useRef<HTMLDivElement>(null);
  const [stickActive, setStickActive] = useState(false);
  const [stickPos, setStickPos] = useState({ x: 0, y: 0 });
  const touchIdRef = useRef<number | null>(null);

  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  // Joystick touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (touchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    touchIdRef.current = touch.identifier;
    setStickActive(true);
    updateJoystickPos(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        updateJoystickPos(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        touchIdRef.current = null;
        setStickActive(false);
        setStickPos({ x: 0, y: 0 });
        onVirtualStick(0, 0);
        break;
      }
    }
  };

  const updateJoystickPos = (clientX: number, clientY: number) => {
    if (!joystickContainerRef.current) return;
    const rect = joystickContainerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const maxRadius = rect.width / 2;

    const distance = Math.sqrt(dx * dx + dy * dy);
    const clampedDist = Math.min(distance, maxRadius);
    const angle = Math.atan2(dy, dx);

    const clampedX = Math.cos(angle) * clampedDist;
    const clampedY = Math.sin(angle) * clampedDist;

    setStickPos({ x: clampedX, y: clampedY });

    // Normalize to -1 to 1 (invert Y for flight stick: push up = climb/move up)
    const normX = clampedX / maxRadius;
    const normY = -clampedY / maxRadius;
    onVirtualStick(normX, normY);
  };

  const shieldPct = Math.max(0, Math.min(100, (stats.shield / stats.maxShield) * 100));
  const boostPct = Math.max(0, Math.min(100, (stats.boostEnergy / stats.maxBoostEnergy) * 100));

  // Combine stick + gyro deflection for visual feedback in the steering pad
  const displayOffsetX = stickActive ? stickPos.x : stats.gyroEnabled ? stats.gyroTiltX * 42 : 0;
  const displayOffsetY = stickActive ? stickPos.y : stats.gyroEnabled ? -stats.gyroTiltY * 42 : 0;

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-30 flex flex-col justify-between p-4 sm:p-6 overflow-hidden">
      {/* TOP ROW CLUSTERS */}
      <div className="flex items-start justify-between w-full">
        {/* Top-Left: Shield & EMP Status */}
        <div className="flex flex-col gap-2 pointer-events-auto">
          {/* Shield Integrity Bar */}
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-200">
            <Shield className={`w-4 h-4 ${shieldPct > 35 ? 'text-cyan-400' : 'text-rose-500'}`} />
            <div className="flex flex-col">
              <div className="flex items-center justify-between gap-4 text-[11px] font-mono-code text-slate-400">
                <span>SHIELD INTEGRITY</span>
                <span className={`font-bold tabular-nums ${shieldPct > 35 ? 'text-cyan-400' : 'text-rose-400'}`}>
                  {stats.shield}%
                </span>
              </div>
              <div className="w-32 sm:w-44 h-2 bg-slate-900 rounded-full overflow-hidden mt-1 border border-slate-700/60">
                <div
                  className={`h-full transition-all duration-150 ${
                    shieldPct > 50
                      ? 'bg-gradient-to-r from-cyan-500 to-sky-400'
                      : shieldPct > 25
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                      : 'bg-gradient-to-r from-rose-600 to-red-500'
                  }`}
                  style={{ width: `${shieldPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* EMP Shockwave Button / Indicator */}
          <div className="flex items-center gap-2">
            <button
              onClick={onTriggerEmp}
              disabled={stats.empCooldownPct < 100}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono-code transition ${
                stats.empCooldownPct >= 100
                  ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300 hover:bg-cyan-900/80 shadow-md shadow-cyan-950 cursor-pointer active:scale-95'
                  : 'bg-slate-950/60 border-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>EMP PULSE</span>
              <span className="font-bold tabular-nums ml-2">
                {stats.empCooldownPct >= 100 ? 'READY [F]' : `${stats.empCooldownPct}%`}
              </span>
            </button>

            {/* Mobile Gyro Toggle & Calibrate Controls */}
            <button
              onClick={onToggleGyro}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono-code font-bold transition active:scale-95 ${
                stats.gyroEnabled
                  ? 'bg-emerald-950/85 border-emerald-400 text-emerald-300 shadow-md shadow-emerald-950'
                  : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle Mobile Gyroscope Tilt Steering"
            >
              <Smartphone className={`w-3.5 h-3.5 ${stats.gyroEnabled ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span>GYRO: {stats.gyroEnabled ? 'ON' : 'OFF'}</span>
            </button>

            {stats.gyroEnabled && (
              <button
                onClick={onCalibrateGyro}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-cyan-500/40 bg-slate-950/85 hover:bg-slate-900 text-cyan-300 text-xs font-mono-code transition active:scale-95"
                title="Recenter Gyro Zero-Point to Current Holding Angle"
              >
                <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">CENTER</span>
              </button>
            )}
          </div>
        </div>

        {/* Top-Right: Score, Multiplier & Depth */}
        <div className="flex flex-col items-end gap-1 pointer-events-auto">
          <div className="px-4 py-2 rounded-lg bg-slate-950/80 border border-slate-800 text-right">
            <div className="text-[10px] font-mono-code text-slate-400 tracking-wider">EXPEDITION SCORE</div>
            <div className="text-xl sm:text-2xl font-bold font-cyber text-white tabular-nums tracking-wide">
              {stats.score.toLocaleString()}
            </div>
            <div className="flex items-center justify-end gap-2 text-xs font-mono-code mt-0.5">
              <span className="text-slate-400">COMBO:</span>
              <span
                className={`px-1.5 py-0.2 rounded font-bold tabular-nums ${
                  stats.multiplier > 1
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'text-slate-400'
                }`}
              >
                {stats.multiplier}X
              </span>
            </div>
          </div>

          {/* Depth in Meters */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-slate-950/70 border border-slate-800/80 text-xs font-mono-code text-slate-300">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">DEPTH:</span>
            <span className="text-cyan-300 font-bold tabular-nums">{stats.depthMeters} M</span>
          </div>
        </div>
      </div>

      {/* CENTER HUD: FPS Targeting Reticle (visible only in FPS view mode) */}
      {stats.viewMode === 'fps' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <svg className="w-28 h-28 opacity-80" viewBox="0 0 100 100" fill="none">
            {/* Outer dotted ring */}
            <circle cx="50" cy="50" r="32" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.6"/>
            {/* Inner crosshair reticle */}
            <circle cx="50" cy="50" r="6" stroke="#38bdf8" strokeWidth="1.5" fill="none"/>
            <line x1="50" y1="36" x2="50" y2="44" stroke="#38bdf8" strokeWidth="2"/>
            <line x1="50" y1="56" x2="50" y2="64" stroke="#38bdf8" strokeWidth="2"/>
            <line x1="36" y1="50" x2="44" y2="50" stroke="#38bdf8" strokeWidth="2"/>
            <line x1="56" y1="50" x2="64" y2="50" stroke="#38bdf8" strokeWidth="2"/>
            {/* Lead indicators */}
            <line x1="28" y1="50" x2="24" y2="50" stroke="#f59e0b" strokeWidth="1.5"/>
            <line x1="72" y1="50" x2="76" y2="50" stroke="#f59e0b" strokeWidth="1.5"/>
          </svg>
        </div>
      )}

      {/* BOTTOM ROW CLUSTERS */}
      <div className="flex items-end justify-between w-full">
        {/* Bottom-Left: Thruster Boost & Speedometer */}
        <div className="flex flex-col gap-2 pointer-events-auto">
          {/* Boost Thruster Heat Bar */}
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-200">
            <Gauge className="w-4 h-4 text-sky-400" />
            <div className="flex flex-col">
              <div className="flex items-center justify-between gap-4 text-[11px] font-mono-code text-slate-400">
                <span>BOOST THRUSTER</span>
                <span className="font-bold text-sky-400 tabular-nums">{stats.boostEnergy}%</span>
              </div>
              <div className="w-28 sm:w-36 h-2 bg-slate-900 rounded-full overflow-hidden mt-1 border border-slate-700/60">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-sky-400 transition-all duration-100"
                  style={{ width: `${boostPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Speed Indicator */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-slate-950/70 border border-slate-800/80 text-xs font-mono-code text-slate-300">
            <span className="text-slate-400">SPEED:</span>
            <span className="text-amber-400 font-bold tabular-nums">{stats.speedKmh} KM/H</span>
          </div>
        </div>

        {/* Bottom-Right: Camera Mode Pill, Audio & Pause Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Perspective Switcher Button */}
          <button
            onClick={onTogglePerspective}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-cyan-500/40 bg-slate-900/90 hover:bg-slate-800 text-cyan-300 text-xs font-mono-code font-bold tracking-wider transition shadow-lg active:scale-95"
            title="Toggle Isometric 3D vs First-Person Cockpit View (Hotkey: V)"
          >
            <Camera className="w-4 h-4 text-cyan-400" />
            <span className="uppercase">
              {stats.viewMode === 'isometric' ? 'VIEW: ISOMETRIC' : 'VIEW: FPS COCKPIT'}
            </span>
            <span className="hidden sm:inline-block text-[10px] bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-500/30 text-cyan-400">
              V
            </span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleMute}
            className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/90 hover:bg-slate-800 text-slate-300 transition active:scale-95"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          {/* Pause */}
          <button
            onClick={onTogglePause}
            className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/90 hover:bg-slate-800 text-slate-300 transition active:scale-95"
            title="Pause Flight (Escape / P)"
          >
            <Pause className="w-4 h-4 text-slate-200" />
          </button>
        </div>
      </div>

      {/* VIRTUAL TOUCH & GYRO CONTROLS FOR ANDROID & MOBILE SCREENS */}
      {(isTouchDevice || stats.gyroEnabled) && (
        <div className="absolute inset-0 pointer-events-none flex justify-between items-end p-4 pb-20 sm:pb-6">
          {/* Left: Virtual Touch Joystick & Live Gyro Horizon Telemetry */}
          <div className="flex flex-col items-center gap-1.5 pointer-events-auto">
            {stats.gyroEnabled && (
              <button
                onClick={onCalibrateGyro}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-[10px] font-mono-code font-bold shadow-lg active:scale-95"
              >
                <Crosshair className="w-3 h-3 text-emerald-400" />
                <span>RECENTER GYRO</span>
              </button>
            )}
            <div
              ref={joystickContainerRef}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className={`w-32 h-32 rounded-full border-2 relative flex items-center justify-center touch-none shadow-xl ${
                stats.gyroEnabled
                  ? 'border-emerald-500/40 bg-slate-950/50'
                  : 'border-cyan-500/30 bg-slate-950/40'
              }`}
            >
              {/* Crosshair reference lines inside pad */}
              <div className="w-full h-px bg-slate-700/40 absolute pointer-events-none" />
              <div className="h-full w-px bg-slate-700/40 absolute pointer-events-none" />

              {/* Joystick / Gyro Center Nub */}
              <div
                className={`w-14 h-14 rounded-full border transition-transform duration-75 ${
                  stickActive
                    ? 'border-cyan-400 bg-cyan-500/60 scale-105'
                    : stats.gyroEnabled
                    ? 'border-emerald-400/90 bg-emerald-500/40'
                    : 'border-cyan-400/80 bg-cyan-600/30'
                }`}
                style={{
                  transform: `translate(${displayOffsetX}px, ${displayOffsetY}px)`,
                }}
              />
              <div className="absolute bottom-1.5 text-[9px] font-mono-code tracking-wider text-cyan-300/80">
                {stats.gyroEnabled && !stickActive ? 'GYRO TILT' : 'STEER'}
              </div>
            </div>
          </div>

          {/* Right: Virtual Action Flight Buttons */}
          {isTouchDevice && (
            <div className="flex flex-col items-end gap-3 pointer-events-auto touch-none">
              <div className="flex items-center gap-3">
                {/* Barrel Roll Button */}
                <button
                  onTouchStart={(e) => {
                    e.preventDefault();
                    onVirtualButton('rollLeft', true);
                  }}
                  className="w-12 h-12 rounded-full border border-slate-700 bg-slate-900/80 text-cyan-400 text-xs font-bold active:bg-cyan-900 flex items-center justify-center shadow-lg"
                >
                  ROLL
                </button>

                {/* Boost Button */}
                <button
                  onTouchStart={(e) => {
                    e.preventDefault();
                    onVirtualButton('boost', true);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    onVirtualButton('boost', false);
                  }}
                  className="w-14 h-14 rounded-full border border-sky-400 bg-sky-950/80 text-sky-300 text-xs font-bold active:bg-sky-700 flex items-center justify-center shadow-lg"
                >
                  BOOST
                </button>
              </div>

              <div className="flex items-center gap-3">
                {/* EMP Button */}
                <button
                  onTouchStart={(e) => {
                    e.preventDefault();
                    onVirtualButton('emp', true);
                  }}
                  className="w-12 h-12 rounded-full border border-purple-500/60 bg-purple-950/80 text-purple-300 text-xs font-bold active:bg-purple-800 flex items-center justify-center shadow-lg"
                >
                  EMP
                </button>

                {/* Primary Fire Button (Large) */}
                <button
                  onTouchStart={(e) => {
                    e.preventDefault();
                    onVirtualButton('fire', true);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    onVirtualButton('fire', false);
                  }}
                  className="w-16 h-16 rounded-full border-2 border-cyan-400 bg-gradient-to-br from-cyan-600 to-blue-700 text-white font-bold text-sm active:scale-95 flex items-center justify-center shadow-xl shadow-cyan-950"
                >
                  FIRE
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
