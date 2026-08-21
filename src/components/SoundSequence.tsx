import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';

// When the sequence begins: 11:53pm Pacific on 19 Aug 2026. The -07:00 offset
// pins it to one instant, so every viewer hears it simultaneously regardless of
// their own timezone.
const START_TIME = '2026-08-19T23:53:00-07:00';

const BUCKET = 'new-prder.firebasestorage.app';

// Firebase Storage serves objects at this endpoint. No download token is needed
// while storage.rules grants public read, so the URLs stay predictable and the
// app needs no Firebase SDK.
const fileUrl = (path: string) =>
  `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media`;

// Played in order, back to back, looping. `lineOne` renders bold, `lineTwo`
// regular; leave `lineTwo` empty to show only the first line. Audio and cover
// art share a file number, so both URLs derive from `id`.
const TRACKS = [
  {
    id: '01',
    lineOne: 'The Dripping Tap',
    lineTwo: 'King Gizzard & The Lizard Wizard',
  },
  { id: '02', lineOne: 'Dot in the Sky', lineTwo: 'Drab Majesty' },
  { id: '03', lineOne: 'Void To Be', lineTwo: 'Blackwater Holylight' },
].map((track) => ({
  ...track,
  src: fileUrl(`audio/${track.id}.mp3`),
  art: fileUrl(`art/${track.id}.jpg`),
}));

// Both controls are square. The art is the taller of the two, so with the bar's
// 10px vertical padding and 1px border it is what sets the bar's height: 198 +
// 22 gives a 220px bar.
const BUTTON_SIZE = { xs: 58, sm: 96 };
const ART_SIZE = { xs: 72, sm: 120 };
const ICON_SIZE = { xs: 36, sm: 59 };

// The caption is positioned absolutely, so the row beneath it is padded by the
// height it occupies. An explicit line height keeps the two in step.
const CAPTION_SIZE = { xs: 13, sm: 18 };
const CAPTION_LINE_HEIGHT = { xs: '16px', sm: '27px' };

// Track title, artist line and the status line beneath them.
const LINE_ONE_SIZE = { xs: 16, sm: 21 };
const LINE_TWO_SIZE = { xs: 13, sm: 18 };
const STATUS_SIZE = { xs: 12, sm: 14 };

// Temporarily presentational: the player still follows the schedule and shows
// the current track, but cannot be played. Set to true to restore interaction.
const INTERACTIVE = false;

type Phase = 'idle' | 'loading' | 'armed' | 'playing' | 'error';

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
    probe.addEventListener('error', () => reject(new Error(src)), {
      once: true,
    });
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

  // Fetched ahead of time so a track change swaps the art instantly.
  useEffect(() => {
    TRACKS.forEach((track) => {
      const image = new Image();
      image.src = track.art;
    });
  }, []);

  /**
   * Walk the tracks accumulating durations to find which one covers `elapsed`.
   * The sequence loops, so elapsed time wraps around the total: joining an hour
   * late still lands at the right point in the current cycle.
   */
  const positionAt = useCallback(
    (elapsed: number): Position => {
      if (!durations || elapsed < 0) return { index: 0, offset: 0 };
      const total = durations.reduce((sum, d) => sum + d, 0);
      if (total <= 0) return { index: 0, offset: 0 };

      let cursor = (elapsed / 1000) % total;
      for (let i = 0; i < durations.length; i += 1) {
        if (cursor < durations[i]) return { index: i, offset: cursor };
        cursor -= durations[i];
      }
      return { index: 0, offset: 0 };
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

  // Follows the schedule whenever the audio is not driving it, so the art and
  // track text show what *would* be playing even before anyone arms the player.
  // Once playing, the audio element takes over and this stands down.
  useEffect(() => {
    if (phase === 'playing' || phase === 'loading' || phase === 'error') return;

    const tick = () => {
      const left = startAt - Date.now();
      setRemaining(left);

      const position = positionAt(-left);
      setIndex(position.index);

      // Armed and the moment has arrived: hand over mid-track.
      if (left <= 0 && phase === 'armed') {
        pendingOffset.current = position.offset;
        setPhase('playing');
      }
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

  // One control for the whole lifecycle: arm before the start time, then pause
  // and resume during playback.
  const handleToggle = () => {
    if (phase === 'idle') {
      void arm();
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

  // Wraps back to the first track, so the sequence runs continuously.
  const handleEnded = () => {
    setIndex((i) => (i + 1) % TRACKS.length);
  };

  // A third line under the track text. Empty when there is nothing to add, so
  // the line disappears rather than leaving a gap.
  const status = (() => {
    switch (phase) {
      case 'loading':
        return 'Loading audio…';
      case 'idle':
        return remaining !== null && remaining > 0
          ? `Starts in ${formatCountdown(remaining)} — press play to listen along`
          : 'Press play to listen along';
      case 'armed':
        return remaining !== null && remaining > 0
          ? `Armed — starts in ${formatCountdown(remaining)}`
          : 'Armed — starting';
      case 'playing':
        return '';
      case 'error':
        return 'Could not load audio — check the files are uploaded';
    }
  })();

  return (
    <Box
      sx={{
        mt: 1.5,
        // Dimmed and inert while INTERACTIVE is false. pointerEvents also stops
        // hover states firing, which would otherwise imply it is clickable.
        opacity: INTERACTIVE ? 1 : 0.2,
        pointerEvents: INTERACTIVE ? 'auto' : 'none',
        display: 'flex',
        flexDirection: 'column',
        border: 1,
        borderColor: 'grey.800',
        borderRadius: '10px',
        bgcolor: 'grey.900',
        // Clips the title bar's square corners to the rounded outer shape.
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          px: { xs: 1, sm: 1.5 },
          py: { xs: 0.5, sm: 0.75 },
          borderBottom: 1,
          borderColor: 'grey.800',
          textAlign: 'center',
        }}
      >
        <Typography
          sx={{
            fontStyle: 'italic',
            color: 'grey.500',
            fontSize: CAPTION_SIZE,
            lineHeight: CAPTION_LINE_HEIGHT,
          }}
        >
          Listen along to my race playlist
        </Typography>
      </Box>

      <Box
        sx={{
          px: { xs: 1, sm: 1.5 },
          py: { xs: 0.75, sm: 1 },
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 1, sm: 2 },
        }}
      >
        <IconButton
          onClick={handleToggle}
          // Disabled as well as inert, so it is skipped by keyboard focus
          // rather than merely unresponsive to clicks.
          disabled={
            !INTERACTIVE ||
            phase === 'loading' ||
            phase === 'armed' ||
            phase === 'error'
          }
          aria-label={isPaused ? 'Play' : 'Pause'}
          sx={{
            width: BUTTON_SIZE,
            height: BUTTON_SIZE,
            flexShrink: 0,
            color: 'grey.200',
            border: 1,
            borderColor: 'grey.700',
            '&:hover': { bgcolor: 'grey.800' },
            '&.Mui-disabled': { color: 'grey.700', borderColor: 'grey.800' },
          }}
        >
          {isPaused ? (
            <PlayArrowRoundedIcon sx={{ fontSize: ICON_SIZE }} />
          ) : (
            <PauseRoundedIcon sx={{ fontSize: ICON_SIZE }} />
          )}
        </IconButton>

        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 0.25,
          }}
        >
          {phase === 'loading' || phase === 'error' ? (
            <Typography
              sx={{
                color: phase === 'error' ? 'error.light' : 'grey.300',
                fontSize: STATUS_SIZE,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {status}
            </Typography>
          ) : (
            <>
              <Typography
                sx={{
                  color: 'grey.300',
                  fontSize: LINE_ONE_SIZE,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                <Box component="span" sx={{ fontWeight: 700 }}>
                  {TRACKS[index].lineOne}
                </Box>
              </Typography>

              {TRACKS[index].lineTwo && (
                <Typography
                  sx={{
                    color: 'grey.400',
                    fontSize: LINE_TWO_SIZE,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {TRACKS[index].lineTwo}
                </Typography>
              )}

              {status && (
                <Typography
                  sx={{
                    color: 'grey.500',
                    fontSize: STATUS_SIZE,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {status}
                </Typography>
              )}
            </>
          )}
        </Box>

        <Box
          component="img"
          src={TRACKS[index].art}
          alt={`${TRACKS[index].lineOne} cover art`}
          sx={{
            // An explicit square. Sizing this by stretch instead lets the flex
            // algorithm start from the image's intrinsic width — over 1000px —
            // which flexShrink: 0 then refuses to reduce.
            width: ART_SIZE,
            height: ART_SIZE,
            flexShrink: 0,
            borderRadius: '10px',
            // Crops to the square rather than distorting a non-square source.
            objectFit: 'cover',
            bgcolor: 'grey.800',
          }}
        />
      </Box>

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
