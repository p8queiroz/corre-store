import { Box, Container, Typography } from "@mui/material";

export function SiteFooter() {
  return (
    <Box
      component="footer"
      sx={{ mt: 8, py: 4, bgcolor: "grey.900", color: "grey.300" }}
    >
      <Container maxWidth="lg">
        <Typography variant="body2">
          ReRun — venda o que você não usa mais e reinvista no próximo passo.
        </Typography>
      </Container>
    </Box>
  );
}
