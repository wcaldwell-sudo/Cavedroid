/**
 * CAVEDROID 3D: Subterranean Flight
 * Main Game Shell & Engine Controller
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CaveFlightEngine, GameStats } from './game/gameEngine';
import { sound } from './game/audio';
import { usePWAInstall } from './hooks/usePWAInstall';
import { TitleScreen } from './components/TitleScreen';
import { HUD } from './components/HUD';
import { PauseModal } from './components/PauseModal';
import { GameOverModal } from './components/GameOverModal';
import { AndroidAPKModal } from './components/AndroidAPKModal';

type AppGameState = 'title' | 'playing' | 'paused' | 'gameover';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<CaveFlightEngine | null>(null);

  const [gameState, setGameState] = useState<AppGameState>('title');
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    multiplier: 1,
    shield: 100,
    maxShield: 100,
    boostEnergy: 100,
    maxBoostEnergy: 100,
    depthMeters: 0,
    speedKmh: 0,
    empCooldownPct: 100,
    viewMode: 'isometric',
    isPaused: false,
    isGameOver: false,
    gyroEnabled: false,
    gyroTiltX: 0,
    gyroTiltY: 0,
    gyroSensitivity: 1.0,
    gyroInvertY: false,
  });

  const [highScore, setHighScore] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('cavedroid_highscore');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showAPKModal, setShowAPKModal] = useState(false);

  // PWA & Android Installation Hook
  const { isInstallable, install } = usePWAInstall();

  // Initialize Three.js Game Engine once on mount
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const engine = new CaveFlightEngine(canvasMountRef.current, {
      onStatsUpdate: (newStats) => {
        setStats(newStats);
        if (newStats.score > highScore) {
          setHighScore(newStats.score);
          setIsNewHighScore(true);
          try {
            localStorage.setItem('cavedroid_highscore', newStats.score.toString());
          } catch {}
        }
      },
      onGameOver: () => {
        setGameState('gameover');
      },
    });

    engineRef.current = engine;
    engine.start();

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Keyboard shortcut listener for Title & Pause
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'title') {
        if (e.code === 'Space' || e.code === 'Enter') {
          handleStartGame();
        }
      } else if (gameState === 'playing') {
        if (e.code === 'Escape' || e.code === 'KeyP') {
          handleTogglePause();
        }
      } else if (gameState === 'paused') {
        if (e.code === 'Escape' || e.code === 'KeyP') {
          handleResumeGame();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [gameState]);

  const handleStartGame = useCallback(() => {
    sound.resume();
    setIsNewHighScore(false);
    if (engineRef.current) {
      engineRef.current.resetGame();
      if (engineRef.current.gyroEnabled) {
        engineRef.current.calibrateGyro();
      }
    }
    setGameState('playing');
  }, []);

  const handleTogglePause = useCallback(() => {
    if (engineRef.current) {
      const isPaused = engineRef.current.togglePause();
      setGameState(isPaused ? 'paused' : 'playing');
    }
  }, []);

  const handleResumeGame = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.togglePause();
    }
    setGameState('playing');
  }, []);

  const handleRestartGame = useCallback(() => {
    sound.resume();
    setIsNewHighScore(false);
    if (engineRef.current) {
      engineRef.current.resetGame();
      if (engineRef.current.gyroEnabled) {
        engineRef.current.calibrateGyro();
      }
    }
    setGameState('playing');
  }, []);

  const handleReturnToHome = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.resetGame();
    }
    setGameState('title');
  }, []);

  const handleToggleMute = useCallback(() => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  }, []);

  const handleTogglePerspective = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.togglePerspective();
    }
  }, []);

  const handleTriggerEmp = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.triggerEmpPulse();
    }
  }, []);

  const handleToggleGyro = useCallback(async () => {
    if (engineRef.current) {
      await engineRef.current.toggleGyro();
    }
  }, []);

  const handleCalibrateGyro = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.calibrateGyro();
    }
  }, []);

  const handleCycleGyroSensitivity = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.cycleGyroSensitivity();
    }
  }, []);

  const handleToggleGyroInvertY = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.toggleGyroInvertY();
    }
  }, []);

  const handleVirtualStick = useCallback((x: number, y: number) => {
    if (engineRef.current) {
      engineRef.current.setVirtualStick(x, y);
    }
  }, []);

  const handleVirtualButton = useCallback((action: 'fire' | 'boost' | 'rollLeft' | 'rollRight' | 'emp' | 'view', isPressed: boolean) => {
    if (engineRef.current) {
      engineRef.current.setVirtualButton(action, isPressed);
    }
  }, []);

  const handleInstallPWA = useCallback(async () => {
    const success = await install();
    if (!success) {
      setShowAPKModal(true);
    }
  }, [install]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#05070c] select-none">
      {/* 1. Dedicated Isolated 3D Canvas Mount (unaffected by React state updates) */}
      <div
        ref={canvasMountRef}
        className="absolute inset-0 z-0 w-full h-full"
      />

      {/* 2. Title Screen State */}
      {gameState === 'title' && (
        <TitleScreen
          onStart={handleStartGame}
          onOpenAPKModal={() => setShowAPKModal(true)}
          highScore={highScore}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          gyroEnabled={stats.gyroEnabled}
          onToggleGyro={handleToggleGyro}
          isInstallable={isInstallable}
          onInstallPWA={handleInstallPWA}
        />
      )}

      {/* 3. In-Game HUD (World-matched, low-occlusion UI) */}
      {gameState === 'playing' && (
        <HUD
          stats={stats}
          highScore={highScore}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onTogglePause={handleTogglePause}
          onTogglePerspective={handleTogglePerspective}
          onTriggerEmp={handleTriggerEmp}
          onToggleGyro={handleToggleGyro}
          onCalibrateGyro={handleCalibrateGyro}
          onVirtualStick={handleVirtualStick}
          onVirtualButton={handleVirtualButton}
        />
      )}

      {/* 4. Pause Modal */}
      {gameState === 'paused' && (
        <PauseModal
          onResume={handleResumeGame}
          onRestart={handleRestartGame}
          viewMode={stats.viewMode}
          onTogglePerspective={handleTogglePerspective}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          gyroEnabled={stats.gyroEnabled}
          gyroSensitivity={stats.gyroSensitivity}
          gyroInvertY={stats.gyroInvertY}
          onToggleGyro={handleToggleGyro}
          onCalibrateGyro={handleCalibrateGyro}
          onCycleGyroSensitivity={handleCycleGyroSensitivity}
          onToggleGyroInvertY={handleToggleGyroInvertY}
          onOpenAPKModal={() => setShowAPKModal(true)}
        />
      )}

      {/* 5. Game Over Modal */}
      {gameState === 'gameover' && (
        <GameOverModal
          stats={stats}
          highScore={highScore}
          isNewHighScore={isNewHighScore}
          onRestart={handleRestartGame}
          onHome={handleReturnToHome}
          onOpenAPKModal={() => setShowAPKModal(true)}
        />
      )}

      {/* 6. Android APK & Installation Hub Modal */}
      <AndroidAPKModal
        isOpen={showAPKModal}
        onClose={() => setShowAPKModal(false)}
        isInstallable={isInstallable}
        onInstallPWA={handleInstallPWA}
      />
    </div>
  );
}
