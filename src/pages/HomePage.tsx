import { AppBar, Box, Container, Toolbar, Typography } from '@mui/material';
import SoundSequence from '../components/SoundSequence';

// Raceday.me viewer link embedded on the home page. Swap the code to follow a
// different runner; the page is a self-contained live tracker.
const TRACKING_URL = 'https://raceday.me/v/4ac166';


// Fractions of the tracker left visible after cropping: 26% is clipped from the
// right, 15% from the top and 5% from the bottom. These proportions are what the
// tracker was tuned to, and the same values apply at every size.
const CROP = { visibleWidth: 0.74, visibleHeight: 0.8, fromTop: 0.15 };

// Measured from the visible cropped box at the size the tracker lays out
// correctly. Held constant on every device: the box scales, its shape does not.
const ASPECT_RATIO = 1152 / 973;

// Room taken by the app bar, page padding and the player bar. Subtracting it
// lets the box cap its own width so its derived height still fits the screen.
const CHROME_HEIGHT = 200;

export default function HomePage() {
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

          {/*
            The inversion is applied by this overlay rather than by a filter on
            the iframe, because a filter always covers the whole element.
            backdrop-filter acts on whatever is composited behind the overlay, so
            limiting the overlay's width limits the effect. It works over
            cross-origin content because it operates on rendered pixels and never
            touches the frame's DOM. pointerEvents: none keeps the tracker
            clickable underneath.
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
