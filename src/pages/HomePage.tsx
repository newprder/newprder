import { useLayoutEffect, useRef, useState } from 'react';
import { AppBar, Box, Container, Toolbar, Typography } from '@mui/material';
import SoundSequence from '../components/SoundSequence';

// Raceday.me viewer link embedded on the home page. Swap the code to follow a
// different runner; the page is a self-contained live tracker.
const TRACKING_URL = 'https://raceday.me/v/4ac166';

// Fractions of the tracker left visible after cropping: 26% is clipped from the
// right, 15% from the top and 5% from the bottom. These proportions are what the
// tracker was tuned to, and the same values apply at every size.
const CROP = { visibleWidth: 0.74, visibleHeight: 0.8, fromTop: 0.15 };

// The visible cropped box at the size the tracker lays out correctly. The
// tracker is always rendered at exactly this size and then zoomed to fit, so it
// never re-flows and the crop means the same thing on every device.
const DESIGN_WIDTH = 1152;
const DESIGN_HEIGHT = 973;
const ASPECT_RATIO = DESIGN_WIDTH / DESIGN_HEIGHT;

// Room taken by the app bar, page padding and the player bar. Subtracting it
// lets the box cap its own width so its derived height still fits the screen.
const CHROME_HEIGHT = 200;

/**
 * Tracks an element's width and returns the factor that maps `designWidth` onto
 * it. CSS cannot express this: a scale factor is unitless, and CSS has no way to
 * divide one length by another.
 */
function useZoomToFit(designWidth: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const measure = (width: number) => setZoom(width / designWidth);

    // Measured before the first paint, so the tracker never appears at full
    // size and then snap-scales.
    measure(element.getBoundingClientRect().width);

    const observer = new ResizeObserver(([entry]) => {
      measure(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [designWidth]);

  return { ref, zoom };
}

export default function HomePage() {
  const { ref, zoom } = useZoomToFit(DESIGN_WIDTH);

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="h1" sx={{ fontWeight: 700 }}>
            NewPRder
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ pt: 3 }}>
        <Box
          ref={ref}
          sx={{
            position: 'relative',
            overflow: 'hidden',
            width: '100%',
            // Never taller than the screen: capping the width caps the height
            // too, since the two are locked by the aspect ratio. dvh rather than
            // vh so mobile browser chrome does not shift it.
            maxWidth: `calc((100dvh - ${CHROME_HEIGHT}px) * ${ASPECT_RATIO})`,
            mx: 'auto',
            // Derives height from the width the element actually gets, so the
            // shape holds on any screen.
            aspectRatio: `${ASPECT_RATIO}`,
            border: 1,
            borderColor: 'grey.800',
            // A bare number here would be multiplied by the theme's 4px unit,
            // so 10px has to be given as a string.
            borderRadius: '10px',
          }}
        >
          {/*
            Fixed at the design size and zoomed as a whole. Sizing the iframe in
            percentages instead would hand the tracker a different viewport at
            every screen width, and a responsive page re-flows — which moves
            whatever the crop was tuned to reveal.
          */}
          <Box
            sx={{
              width: DESIGN_WIDTH,
              height: DESIGN_HEIGHT,
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
            }}
          >
            <Box
              component="iframe"
              src={TRACKING_URL}
              title="Raceday.me live tracking"
              allowFullScreen
              sx={{
                // Oversize the frame and let the wrapper clip the overflow.
                // translateY is used rather than a negative margin because
                // percentage margins resolve against width, not height.
                display: 'block',
                border: 0,
                width: `calc(100% / ${CROP.visibleWidth})`,
                height: `calc(100% / ${CROP.visibleHeight})`,
                transform: `translateY(-${CROP.fromTop * 100}%)`,
              }}
            />
          </Box>

          {/*
            The inversion is applied by this overlay rather than by a filter on
            the iframe, because a filter always covers the whole element.
            backdrop-filter acts on whatever is composited behind the overlay, so
            limiting the overlay's width limits the effect. It works over
            cross-origin content because it operates on rendered pixels and never
            touches the frame's DOM. pointerEvents: none keeps the tracker
            clickable underneath.

            It sits outside the zoomed element so its width stays a share of what
            is actually visible, rather than being scaled along with the tracker.
          */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '34.5%',
              height: '100%',
              zIndex: 1,
              pointerEvents: 'none',
              backdropFilter: 'invert(1) hue-rotate(180deg) contrast(0.8)',
              WebkitBackdropFilter: 'invert(1) hue-rotate(180deg) contrast(0.8)',
            }}
          />
        </Box>

        <Box
          sx={{
            width: '100%',
            // Same cap as the embed, so the two stay the same width.
            maxWidth: `calc((100dvh - ${CHROME_HEIGHT}px) * ${ASPECT_RATIO})`,
            mx: 'auto',
          }}
        >
          <SoundSequence />
        </Box>
      </Container>
    </>
  );
}
