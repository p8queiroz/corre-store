import { Container, Paper, Typography } from "@mui/material";

/**
 * Admin panel — no public registration path.
 * Access requires ADMIN role (session check to be wired in middleware).
 * See docs/10-admin-and-rbac.md
 */
export default function AdminPage() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" fontWeight={800} gutterBottom>
          Admin panel
        </Typography>
        <Typography color="text.secondary">
          Moderate listings, users, banners, and featured products. Admin accounts
          are created via seed or backend CLI only — never through public signup.
        </Typography>
      </Paper>
    </Container>
  );
}
