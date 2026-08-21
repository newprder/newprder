import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import HomePage from './pages/HomePage';

const theme = createTheme({
  typography: {
    // Courier New is the fallback because it is the one typewriter face present
    // on most desktops; Android has no equivalent and would drop to its default
    // monospace, so the webfont is what actually guarantees the look.
    fontFamily: '"Courier Prime", "Courier New", Courier, monospace',
  },
  palette: {
    primary: { main: '#1976d2' },
    // CssBaseline paints the body from background.default. This value was
    // originally chosen to match an inversion filter that has since been
    // removed, so it is now just a dark grey.
    background: { default: '#1a1a1a' },
  },
});

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
