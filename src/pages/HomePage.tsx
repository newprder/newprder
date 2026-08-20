import { AppBar, Box, Container, Toolbar, Typography } from '@mui/material';
import SoundSequence from '../components/SoundSequence';

// Raceday.me viewer link embedded on the home page. Swap the code to follow a
// different runner; the page is a self-contained live tracker.
const TRACKING_URL = 'https://raceday.me/v/4ac166';

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
            height: { xs: '70vh', md: '78vh' },
            minHeight: 420,
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
              // Render the tracker larger than its frame and let the wrapper clip
              // the overflow: the rightmost 26%, the top 15% and the bottom 5%
              // are cropped away, leaving 80% of the tracker's height visible.
              // translateY is used rather than a negative margin because
              // percentage margins resolve against width, not height.
              display: 'block',
              width: 'calc(100% / 0.74)',
              height: 'calc(100% / 0.8)',
              transform: 'translateY(-15%)',
              border: 0,
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

        <SoundSequence />
      </Container>
    </>
  );
}
