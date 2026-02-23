'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { PlaybackEngine } from '@/lib/playback/engine';
import { Play, Pause, RotateCcw, SkipBack, SkipForward } from 'lucide-react';
import type { Event } from '@/lib/types/database';

const MonacoEditor = dynamic(
  async () => {
    const { default: Editor } = await import('@monaco-editor/react');
    return Editor;
  },
  { ssr: false }
);

interface SessionPlaybackProps {
  sessionId: string;
  userId: string;
  events: Event[];
  language?: string;
}

/**
 * Session Playback Component
 * Replay entire coding session with frame-by-frame control
 */
export function SessionPlayback({
  sessionId,
  userId,
  events,
  language = 'javascript',
}: SessionPlaybackProps) {
  const [engine, setEngine] = useState<PlaybackEngine | null>(null);
  const [code, setCode] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [totalDuration, setTotalDuration] = useState(0);

  // Initialize playback engine
  useEffect(() => {
    if (events.length === 0) return;

    const newEngine = new PlaybackEngine(events, { autoPlay: false });
    setEngine(newEngine);
    setTotalDuration(newEngine.getTotalDuration());
    setCode(newEngine.getInitialState().code);

    return () => {
      newEngine.stop();
    };
  }, [events]);

  // Update playback
  useEffect(() => {
    if (!engine) return;

    const updateInterval = setInterval(() => {
      if (isPlaying) {
        setProgress(engine.getProgress());

        // Reconstruct code at current playback time
        const totalDuration = engine.getTotalDuration();
        const timeMs = (engine.getProgress() / 100) * totalDuration;
        const reconstructedCode = engine.reconstructCodeAtTime(timeMs);
        setCode(reconstructedCode);

        if (!engine.getIsPlaying()) {
          setIsPlaying(false);
        }
      }
    }, 50);

    return () => clearInterval(updateInterval);
  }, [engine, isPlaying]);

  const handlePlay = useCallback(() => {
    if (engine) {
      engine.play();
      setIsPlaying(true);
    }
  }, [engine]);

  const handlePause = useCallback(() => {
    if (engine) {
      engine.pause();
      setIsPlaying(false);
    }
  }, [engine]);

  const handleReset = useCallback(() => {
    if (engine) {
      engine.stop();
      setCode(engine.getInitialState().code);
      setProgress(0);
      setIsPlaying(false);
    }
  }, [engine]);

  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (engine) {
        const percentage = parseFloat(e.target.value);
        engine.seekToPercentage(percentage, (state) => {
          setCode(state.code);
          setProgress(percentage);
        });
      }
    },
    [engine]
  );

  const handleSpeedChange = useCallback(
    (newSpeed: number) => {
      setSpeed(newSpeed);
      if (engine) {
        engine.setSpeed(newSpeed);
      }
    },
    [engine]
  );

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
  };

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-900 px-4 py-4">
        <h2 className="text-lg font-bold text-white">Session Playback</h2>
        <p className="text-xs text-slate-400">
          Replay: Session {sessionId.slice(0, 8)} • User {userId.slice(0, 8)}
        </p>
      </div>

      {/* Editor Area */}
      <div className="flex-1 overflow-hidden">
        <MonacoEditor
          height="100%"
          language={language}
          value={code}
          theme="vs-dark"
          options={{
            readOnly: true,
            minimap: { enabled: false },
            lineNumbers: 'on',
            automaticLayout: true,
            fontSize: 13,
          }}
        />
      </div>

      {/* Playback Controls */}
      <div className="border-t border-slate-700 bg-slate-900 p-4 space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={handleSeek}
            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-xs text-slate-400">
            <span>{formatTime((progress / 100) * totalDuration)}</span>
            <span>{formatTime(totalDuration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="rounded p-2 hover:bg-slate-700 transition-colors"
              title="Reset"
            >
              <RotateCcw size={18} />
            </button>
            <button
              onClick={handlePause}
              className="rounded p-2 hover:bg-slate-700 transition-colors"
              title="Step back"
            >
              <SkipBack size={18} />
            </button>

            {isPlaying ? (
              <button
                onClick={handlePause}
                className="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 hover:bg-blue-700 transition-colors"
              >
                <Pause size={16} />
                Pause
              </button>
            ) : (
              <button
                onClick={handlePlay}
                className="flex items-center gap-2 rounded bg-green-600 px-4 py-2 hover:bg-green-700 transition-colors"
              >
                <Play size={16} />
                Play
              </button>
            )}

            <button
              onClick={handlePause}
              className="rounded p-2 hover:bg-slate-700 transition-colors"
              title="Step forward"
            >
              <SkipForward size={18} />
            </button>
          </div>

          {/* Speed Control */}
          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-400">Speed</label>
            <select
              value={speed}
              onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
              className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-100 border border-slate-600"
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={1.5}>1.5x</option>
              <option value={2}>2x</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 text-xs text-slate-400">
          <div>
            <span className="text-slate-300">Events:</span> {events.length}
          </div>
          <div>
            <span className="text-slate-300">Duration:</span> {formatTime(totalDuration)}
          </div>
        </div>
      </div>
    </div>
  );
}
