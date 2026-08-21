import { useLayoutEffect, useRef, useState } from 'react';
import {
  AppBar,
  Box,
  Container,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import SoundSequence from '../components/SoundSequence';

// Raceday.me viewer link embedded on the home page. Swap the code to follow a
// different runner; the page is a self-contained live tracker.
const TRACKING_URL = 'https://raceday.me/v/4ac166';

/**
 * The tracker is responsive, which gives us two ways to embed it, and each suits
 * a different screen.
 *
 * On desktop it is rendered at a fixed design size and zoomed to fit, so its
 * layout never re-flows and one set of crop values holds at every window size.
 *
 * On a phone that same approach shrinks a 1152px-wide layout into ~390px and the
 * text becomes unreadable, so there the iframe is sized in percentages instead:
 * the tracker receives the phone's own width and uses its native mobile layout
 * at full size. That is a different layout, so it needs its own crop.
 *
 * `visibleWidth`/`visibleHeight` are the fractions left showing after cropping;
 * `fromTop` is the fraction clipped off the top.
 */
const DESKTOP = {
  designWidth: 1152,
  designHeight: 973,
  crop: { visibleWidth: 0.74, visibleHeight: 0.8, fromTop: 0.15 },
};

const MOBILE = {
  // Portrait, since the tracker's mobile layout stacks vertically.
  aspectRatio: 3 / 4,
  // 12% clipped off the top and 45% off the bottom, leaving 43% of the
  // tracker's height visible. Nothing off the sides.
  crop: { visibleWidth: 1, visibleHeight: 0.43, fromTop: 0.12 },
};

// Everything on the page sits at this share of the container: full bleed on
// phones, where the space is needed, and inset on larger screens.
const CONTENT_WIDTH = { xs: '100%', md: '80%' };

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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { ref, zoom } = useZoomToFit(DESKTOP.designWidth);

  const layout = isMobile ? MOBILE : DESKTOP;
  const { crop } = layout;
  const aspectRatio = isMobile
    ? MOBILE.aspectRatio
    : DESKTOP.designWidth / DESKTOP.designHeight;

  // Shared by both layouts: the iframe is oversized and the wrapper clips the
  // overflow. translateY rather than a negative margin because percentage
  // margins resolve against width, not height.
  const croppedFrame = {
    display: 'block',
    border: 0,
    width: `calc(100% / ${crop.visibleWidth})`,
    height: `calc(100% / ${crop.visibleHeight})`,
    transform: `translateY(-${crop.fromTop * 100}%)`,
  };

  return (
    <>
      <AppBar
        position="static"
        // elevation 0 removes the shadow, which would otherwise outline the bar
        // against a page it is meant to blend into.
        elevation={0}
        sx={{
          bgcolor: 'background.default',
          backgroundImage: 'none',
          color: 'text.primary',
        }}
      >
        <Toolbar
          sx={{
            justifyContent: 'center',
            // MUI's default 56/64px toolbar leaves the title floating in
            // empty space above the embed. The media query is needed because
            // the default itself is set through one.
            minHeight: 48,
            '@media (min-width:600px)': { minHeight: 48 },
          }}
        >
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 700,
              textAlign: 'center',
              textDecoration: 'underline',
            }}
          >
            New PRder
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ pt: 0 }}>
        <Box
          ref={ref}
          sx={{
            position: 'relative',
            overflow: 'hidden',
            width: CONTENT_WIDTH,
            // Never taller than the screen: capping the width caps the height
            // too, since the two are locked by the aspect ratio. dvh rather than
            // vh so mobile browser chrome does not shift it.
            maxWidth: `calc((100dvh - ${CHROME_HEIGHT}px) * ${aspectRatio})`,
            mx: 'auto',
            aspectRatio: `${aspectRatio}`,
            border: 1,
            borderColor: 'grey.800',
            // A bare number here would be multiplied by the theme's 4px unit,
            // so 10px has to be given as a string.
            borderRadius: '10px',
          }}
        >
          {isMobile ? (
            // Sized in percentages, so the tracker sees the phone's own width
            // and lays itself out for it.
            <Box
              component="iframe"
              src={TRACKING_URL}
              title="Raceday.me live tracking"
              allowFullScreen
              sx={croppedFrame}
            />
          ) : (
            // Fixed at the design size and zoomed as a whole, so the layout is
            // identical at every desktop width.
            <Box
              sx={{
                width: DESKTOP.designWidth,
                height: DESKTOP.designHeight,
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
              }}
            >
              <Box
                component="iframe"
                src={TRACKING_URL}
                title="Raceday.me live tracking"
                allowFullScreen
                sx={croppedFrame}
              />
            </Box>
          )}
        </Box>

        <Box
          sx={{
            width: CONTENT_WIDTH,
            // Same cap as the embed, so the two stay the same width.
            maxWidth: `calc((100dvh - ${CHROME_HEIGHT}px) * ${aspectRatio})`,
            mx: 'auto',
          }}
        >
          <SoundSequence />
        </Box>
      </Container>
    </>
  );
}
