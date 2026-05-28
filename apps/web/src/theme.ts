import { createTheme } from "@mui/material/styles";

/**
 * Marketplace UI theme — OLX/Mercado Livre inspired:
 * - High contrast CTAs (conversion)
 * - Trustworthy neutrals + energetic accent (running niche)
 */
export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#0B6E4F" },
    secondary: { main: "#FF6B35" },
    background: { default: "#F7F8FA", paper: "#FFFFFF" },
    text: { primary: "#1A1D21", secondary: "#5C6570" },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 800, letterSpacing: "-0.02em" },
    h2: { fontWeight: 700 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 10, paddingInline: 20 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: "1px solid rgba(0,0,0,0.06)",
        },
      },
    },
  },
});
