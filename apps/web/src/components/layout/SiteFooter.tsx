import { Box, Container, Typography } from "@mui/material";

export function SiteFooter() {
  return (
    <Box
      component="footer"
      sx={{ mt: 8, py: 4, bgcolor: "grey.900", color: "grey.300" }}
    >
      <Container maxWidth="lg">
        <Typography variant="body2">
          StrideMarket — Educational running gear marketplace (AI learning project)
        </Typography>
      </Container>
    </Box>
  );
}
