/**
 * Playback Engine
 * Reconstructs code editing session from event log
 */

import type { Event, CodeChangeEvent } from '@/lib/types/database';

export interface PlaybackState {
  code: string;
  timestamp: number;
  line: number;
  column: number;
}

interface PlaybackOptions {
  speed?: number; // 0.5x, 1x, 2x, etc
  autoPlay?: boolean;
}

/**
 * Playback engine for reconstructing code editing sessions
 */
export class PlaybackEngine {
  private events: Event[] = [];
  private currentIndex = 0;
  private isPlaying = false;
  private speed: number = 1;
  private animationFrameId: number | null = null;
  private lastEventTime = 0;
  private elapsedTime = 0;

  constructor(events: Event[], options: PlaybackOptions = {}) {
    this.events = events.sort((a, b) => a.timestamp_ms - b.timestamp_ms);
    this.speed = options.speed || 1;
    if (options.autoPlay) {
      this.play();
    }
  }

  /**
   * Get initial code state (empty)
   */
  getInitialState(): PlaybackState {
    return {
      code: '',
      timestamp: 0,
      line: 0,
      column: 0,
    };
  }

  /**
   * Reconstruct code at specific timestamp
   */
  reconstructCodeAtTime(timeMs: number): string {
    let code = '';
    const relevantEvents = this.events.filter((e) => e.timestamp_ms <= timeMs);

    for (const event of relevantEvents) {
      if (event.event_type === 'code_change') {
        const payload = event.payload as CodeChangeEvent;
        // Apply code change
        code = this._applyCodeChange(code, payload);
      }
    }

    return code;
  }

  /**
   * Get event at index
   */
  getEventAt(index: number): Event | null {
    return this.events[index] || null;
  }

  /**
   * Get all events
   */
  getEvents(): Event[] {
    return this.events;
  }

  /**
   * Get total duration in milliseconds
   */
  getTotalDuration(): number {
    if (this.events.length === 0) return 0;
    return this.events[this.events.length - 1].timestamp_ms;
  }

  /**
   * Play from current position
   */
  play(callback?: (state: PlaybackState) => void): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.lastEventTime = Date.now();

    const animate = () => {
      if (!this.isPlaying) return;

      const now = Date.now();
      const deltaTime = (now - this.lastEventTime) * this.speed;
      this.elapsedTime += deltaTime;
      this.lastEventTime = now;

      // Process events that should occur by this time
      while (
        this.currentIndex < this.events.length &&
        this.events[this.currentIndex].timestamp_ms <= this.elapsedTime
      ) {
        const event = this.events[this.currentIndex];
        const code = this.reconstructCodeAtTime(event.timestamp_ms);

        if (callback) {
          callback({
            code,
            timestamp: event.timestamp_ms,
            line: 0,
            column: 0,
          });
        }

        this.currentIndex++;
      }

      // Check if we're done
      if (this.currentIndex >= this.events.length) {
        this.isPlaying = false;
        return;
      }

      this.animationFrameId = requestAnimationFrame(animate);
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  /**
   * Pause playback
   */
  pause(): void {
    this.isPlaying = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  /**
   * Resume playback
   */
  resume(callback?: (state: PlaybackState) => void): void {
    if (!this.isPlaying) {
      this.play(callback);
    }
  }

  /**
   * Stop playback and reset
   */
  stop(): void {
    this.pause();
    this.currentIndex = 0;
    this.elapsedTime = 0;
  }

  /**
   * Seek to time
   */
  seekToTime(timeMs: number, callback?: (state: PlaybackState) => void): void {
    this.elapsedTime = Math.min(timeMs, this.getTotalDuration());

    // Find events up to this time
    let eventIndex = 0;
    for (let i = 0; i < this.events.length; i++) {
      if (this.events[i].timestamp_ms <= this.elapsedTime) {
        eventIndex = i + 1;
      }
    }

    this.currentIndex = eventIndex;

    // Reconstruct code at this point
    const code = this.reconstructCodeAtTime(this.elapsedTime);

    if (callback) {
      callback({
        code,
        timestamp: this.elapsedTime,
        line: 0,
        column: 0,
      });
    }
  }

  /**
   * Seek to percentage (0-100)
   */
  seekToPercentage(percentage: number, callback?: (state: PlaybackState) => void): void {
    const totalDuration = this.getTotalDuration();
    const timeMs = (percentage / 100) * totalDuration;
    this.seekToTime(timeMs, callback);
  }

  /**
   * Get current progress as percentage
   */
  getProgress(): number {
    const totalDuration = this.getTotalDuration();
    if (totalDuration === 0) return 0;
    return (this.elapsedTime / totalDuration) * 100;
  }

  /**
   * Check if currently playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Set playback speed
   */
  setSpeed(speed: number): void {
    this.speed = Math.max(0.25, Math.min(4, speed)); // Clamp between 0.25x and 4x
  }

  /**
   * Apply a code change event to code
   */
  private _applyCodeChange(code: string, change: CodeChangeEvent): string {
    // Simple implementation: split code into lines and modify
    const lines = code.split('\n');

    const startLine = Math.min(change.start.line, lines.length);
    const startCol = change.start.column;
    const endLine = Math.min(change.end.line, lines.length);
    const endCol = change.end.column;

    if (startLine === endLine) {
      // Single line change
      const line = lines[startLine] || '';
      const before = line.substring(0, startCol);
      const after = line.substring(endCol);
      lines[startLine] = before + change.text + after;
    } else {
      // Multi-line change
      const startLineContent = (lines[startLine] || '').substring(0, startCol) + change.text;
      const endLineContent = (lines[endLine] || '').substring(endCol);

      // Remove intermediate lines and replace with new content
      lines.splice(startLine, endLine - startLine + 1, startLineContent + endLineContent);
    }

    return lines.join('\n');
  }
}
