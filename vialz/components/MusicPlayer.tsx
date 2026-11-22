'use client';

import { useRef, useState } from 'react';

export default function MusicPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play();
    else audio.pause();
  };

  return (
    <div className="glass flex items-center gap-4 p-4">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Pause music' : 'Play music'}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[#07080b] transition hover:scale-105"
        style={{ background: 'var(--accent)' }}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
          {playing ? <path d="M6 5h4v14H6zM14 5h4v14h-4z" /> : <path d="M8 5v14l11-7z" />}
        </svg>
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Background music</p>
        <p className="text-xs text-white/40">{playing ? 'Playing' : 'Tap to play'}</p>
      </div>
      <audio
        ref={audioRef}
        src={src}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
    </div>
  );
}
