import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';

// When the sequence begins: 11:07pm Pacific on 19 Aug 2026. The -07:00 offset
// pins it to one instant, so every viewer hears it simultaneously regardless of
// their own timezone.
const START_TIME = '2026-08-19T23:07:00-07:00';

const BUCKET = 'new-prder.firebasestorage.app';

// Firebase Storage serves objects at this endpoint. No download token is needed
// while storage.rules grants public read, so the URLs stay predictable and the
// app needs no Firebase SDK.
const fileUrl = (path: string) =>
  `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media`;

// Played in order, back to back. Paths are relative to the bucket root.
const TRACKS = [
  { title: 'Track 1', src: fileUrl('audio/01.mp3') },
  { title: 'Track 2', src: fileUrl('audio/02.mp3') },
  { title: 'Track 3', src: fileUrl('audio/03.mp3') },
];

type Phase = 'idle' | 'loading' | 'armed' | 'playing' | 'done' | 'missed' | 'error';

/** Where the sequence stands `elapsed` ms after the start time. */
type Position = { index: number; offset: number };

function formatCountdown(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Read a track's duration in seconds without adding it to the page. */
function probeDuration(src: string) {
  return new Promise<number>((resolve, reject) => {
    const probe = new Audio();
    probe.preload = 'metadata';
    probe.addEventListener('loadedmetadata', () => resolve(probe.duration), {
      once: true,
    });
    probe.addEventListener('error', () => reject(new Error(src)), { once: true });
    probe.src = src;
  });
}

export default function SoundSequence() {
  const audioRef = useRef<HTMLAudioElement>(null);
  // Seconds to seek into the next track, when joining mid-sequence.
  const pendingOffset = useRef(0);

  const [phase, setPhase] = useState<Phase>('loading');
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [durations, setDurations] = useState<number[] | null>(null);
  const [isPaused, setIsPaused] = useState(true);

  const startAt = new Date(START_TIME).getTime();

  // Durations are needed to work out where the sequence would be if the page is
  // armed late, so they are fetched up front rather than at start time.
  useEffect(() => {
    let cancelled = false;
    Promise.all(TRACKS.map((t) => probeDuration(t.src)))
      .then((secs) => {
        if (cancelled) return;
        setDurations(secs);
        setPhase('idle');
      })
      .catch(() => {
        if (!cancelled) setPhase('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Walk the tracks accumulating durations to find which one covers `elapsed`.
   * Returns null when the whole sequence has already finished.
   */
  const positionAt = useCallback(
    (elapsed: number): Position | null => {
      if (!durations) return { index: 0, offset: 0 };
      let cursor = elapsed / 1000;
      for (let i = 0; i < durations.length; i += 1) {
        if (cursor < durations[i]) return { index: i, offset: cursor };
        cursor -= durations[i];
      }
      return null;
    },
    [durations],
  );

  // Browsers block programmatic playback until the user has interacted with the
  // page. Playing and immediately pausing inside the click handler unlocks the
  // element, so the scheduled play() is allowed later.
  const arm = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = TRACKS[0].src;
    try {
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
      setPhase('armed');
    } catch {
      setPhase('error');
    }
  }, []);

  // Tick while armed. Once the start time has passed, jump straight to whichever
  // track is due and how far into it the sequence already is.
  useEffect(() => {
    if (phase !== 'armed') return;
    const tick = () => {
      const left = startAt - Date.now();
      setRemaining(left);
      if (left > 0) return;

      const position = positionAt(-left);
      if (!position) {
        setPhase('missed');
        return;
      }
      pendingOffset.current = position.offset;
      setIndex(position.index);
      setPhase('playing');
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [phase, startAt, positionAt]);

  // Load the current track, seek if we joined late, then play. currentTime can
  // only be set once metadata has loaded, hence the listener.
  useEffect(() => {
    if (phase !== 'playing') return;
    const audio = audioRef.current;
    if (!audio) return;

    const offset = pendingOffset.current;
    pendingOffset.current = 0;

    const onMeta = () => {
      if (offset > 0) audio.currentTime = offset;
      audio.play().catch(() => setPhase('error'));
    };

    audio.addEventListener('loadedmetadata', onMeta, { once: true });
    audio.src = TRACKS[index].src;
    audio.load();

    return () => audio.removeEventListener('loadedmetadata', onMeta);
  }, [phase, index]);

  // One control for the whole lifecycle: arm before the start time, pause and
  // resume during playback, replay once the sequence has finished.
  const handleToggle = () => {
    if (phase === 'idle') {
      void arm();
      return;
    }
    if (phase === 'done' || phase === 'missed') {
      pendingOffset.current = 0;
      setIndex(0);
      setPhase('playing');
      return;
    }
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => setPhase('error'));
    } else {
      audio.pause();
    }
  };

  const handleEnded = () => {
    if (index < TRACKS.length - 1) {
      setIndex((i) => i + 1);
    } else {
      setPhase('done');
    }
  };

  const status = (() => {
    switch (phase) {
      case 'loading':
        return 'Loading audio…';
      case 'idle':
        return '';
      case 'armed':
        return remaining !== null && remaining > 0
          ? `Armed — starts in ${formatCountdown(remaining)}`
          : 'Armed — starting';
      case 'playing':
        return `Now playing — ${TRACKS[index].title}`;
      case 'done':
        return 'Sequence complete';
      case 'missed':
        return 'Sequence already finished';
      case 'error':
        return 'Could not load audio — check the files are uploaded';
    }
  })();

  return (
    <Box
      sx={{
        mt: 1.5,
        px: { xs: 1.5, sm: 2 },
        py: 1.25,
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 1, sm: 2 },
        border: 1,
        borderColor: 'grey.800',
        borderRadius: '10px',
        bgcolor: 'grey.900',
      }}
    >
      <Typography
        sx={{
          flex: 1,
          minWidth: 0,
          color: phase === 'error' ? 'error.light' : 'grey.300',
          fontSize: 14,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {status}
      </Typography>

      <Typography
        sx={{
          // Dropped on phones so the track title keeps the space instead.
          display: { xs: 'none', sm: 'block' },
          color: 'grey.500',
          fontSize: 13,
          flexShrink: 0,
        }}
      >
        {phase === 'playing' || phase === 'done'
          ? `${Math.min(index + 1, TRACKS.length)} / ${TRACKS.length}`
          : `${TRACKS.length} tracks`}
      </Typography>

      <IconButton
        onClick={handleToggle}
        disabled={phase === 'loading' || phase === 'armed' || phase === 'error'}
        aria-label={isPaused ? 'Play' : 'Pause'}
        sx={{
          width: 56,
          height: 56,
          flexShrink: 0,
          color: 'grey.200',
          border: 1,
          borderColor: 'grey.700',
          '&:hover': { bgcolor: 'grey.800' },
          '&.Mui-disabled': { color: 'grey.700', borderColor: 'grey.800' },
        }}
      >
        {isPaused ? (
          <PlayArrowRoundedIcon sx={{ fontSize: 34 }} />
        ) : (
          <PauseRoundedIcon sx={{ fontSize: 34 }} />
        )}
      </IconButton>

      <Box
        component="audio"
        ref={audioRef}
        onEnded={handleEnded}
        onPlay={() => setIsPaused(false)}
        onPause={() => setIsPaused(true)}
        preload="auto"
      />
    </Box>
  );
}
