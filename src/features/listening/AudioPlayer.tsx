import { useEffect, useRef, useState } from 'react';
import { audioURL } from '../../platform/audioStorage';
import type { MediaRecord } from '../../domain/listening';

export function AudioPlayer({
  media,
  rate,
  onPlay,
  onRate,
  onReady,
}: {
  media: MediaRecord;
  rate: number;
  onPlay: () => void;
  onRate: (rate: number) => void;
  onReady: (ready: boolean) => void;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [url, setURL] = useState('');
  const [error, setError] = useState('');
  const [repeat, setRepeat] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let release: (() => void) | undefined;
    onReady(false);
    setError('');
    audioURL(media)
      .then((result) => {
        if (cancelled) result.release();
        else {
          release = result.release;
          setURL(result.url);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : '无法读取音频');
      });
    return () => {
      cancelled = true;
      audio.current?.pause();
      release?.();
    };
  }, [media.id, media.storage]);
  useEffect(() => {
    if (audio.current) audio.current.playbackRate = rate;
  }, [rate, url]);
  async function replay() {
    const element = audio.current;
    if (!element) return;
    element.currentTime = 0;
    try {
      if (!element.paused) onPlay();
      await element.play();
    } catch {
      setError('播放未启动，请再次点击系统播放器播放按钮。');
    }
  }
  return (
    <div className="listening-player">
      <audio
        ref={audio}
        src={url || undefined}
        controls
        loop={repeat}
        preload="metadata"
        aria-label="听力音频播放器"
        onPlay={onPlay}
        onLoadedMetadata={() => {
          if (audio.current) audio.current.playbackRate = rate;
          onReady(true);
        }}
        onError={() => {
          onReady(false);
          setError('音频无法播放，请核对文件编码并补绑兼容的 WAV 副本。');
        }}
      />
      <div className="playback-controls">
        <button type="button" className="secondary" disabled={!url} onClick={replay}>
          从头重播
        </button>
        <label>
          倍速
          <select
            aria-label="听力播放速度"
            value={rate}
            onChange={(e) => onRate(Number(e.target.value))}
          >
            {[0.75, 0.85, 1, 1.25, 1.5].map((n) => (
              <option key={n} value={n}>
                {n}×
              </option>
            ))}
          </select>
        </label>
        <label>
          <input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} />
          循环播放
        </label>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
