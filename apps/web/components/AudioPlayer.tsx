"use client";

import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, RotateCcw, FastForward, X } from "lucide-react";

interface AudioTrack {
  title: string;
  publicationName: string;
  audioUrl: string;
  durationSeconds: number;
}

export const AudioPlayer: React.FC = () => {
  const [track, setTrack] = useState<AudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Ascolta eventi globali per cambiare traccia
    const handlePlayPodcast = (e: CustomEvent<AudioTrack>) => {
      setTrack(e.detail);
      setCurrentTime(0);
      setIsPlaying(true);
      if (audioRef.current) {
        audioRef.current.src = e.detail.audioUrl;
        audioRef.current.play().catch(() => {});
      }
    };

    window.addEventListener("zerostack:play-audio" as any, handlePlayPodcast);
    return () => window.removeEventListener("zerostack:play-audio" as any, handlePlayPodcast);
  }, []);

  const togglePlay = () => {
    if (!audioRef.current || !track) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const cycleSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setPlaybackRate(nextSpeed);
    if (audioRef.current) audioRef.current.playbackRate = nextSpeed;
  };

  const skipSeconds = (seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(audioRef.current.currentTime + seconds, duration));
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins}:${remainingSecs < 10 ? "0" : ""}${remainingSecs}`;
  };

  if (!track) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 px-4 py-2.5 shadow-2xl backdrop-blur sm:px-6">
      <audio
        ref={audioRef}
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
        onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
        onEnded={() => setIsPlaying(false)}
      />
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        {/* Track info */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 font-bold">
            🎙️
          </div>
          <div className="truncate">
            <p className="truncate text-sm font-semibold text-gray-900">{track.title}</p>
            <p className="truncate text-xs text-gray-500">{track.publicationName}</p>
          </div>
        </div>

        {/* Player controls */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-4">
            <button
              onClick={() => skipSeconds(-15)}
              className="text-gray-500 hover:text-gray-900 transition"
              title="Indietro 15s"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              onClick={togglePlay}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow hover:bg-blue-700 transition"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
            </button>
            <button
              onClick={() => skipSeconds(15)}
              className="text-gray-500 hover:text-gray-900 transition"
              title="Avanti 15s"
            >
              <FastForward className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-gray-500">
            <span>{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={(e) => {
                const val = Number(e.target.value);
                setCurrentTime(val);
                if (audioRef.current) audioRef.current.currentTime = val;
              }}
              className="h-1 w-44 sm:w-80 cursor-pointer accent-blue-600"
            />
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right actions: Speed, Volume, Close */}
        <div className="flex items-center gap-3">
          <button
            onClick={cycleSpeed}
            className="rounded border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            {playbackRate}x
          </button>
          <button
            onClick={() => {
              if (!audioRef.current) return;
              audioRef.current.muted = !isMuted;
              setIsMuted(!isMuted);
            }}
            className="hidden sm:inline-block text-gray-500 hover:text-gray-900"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button
            onClick={() => {
              if (audioRef.current) audioRef.current.pause();
              setTrack(null);
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
