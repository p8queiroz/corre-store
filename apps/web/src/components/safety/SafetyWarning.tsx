import { Alert, Box, Typography } from "@mui/material";

export function SafetyWarning({ compact = false }: { compact?: boolean }) {
  return (
    <Alert severity="warning" sx={{ alignItems: "flex-start" }}>
      <Box>
        <Typography fontWeight={800} gutterBottom={!compact}>
          Ferramentas de confiança e segurança
        </Typography>
        <Typography variant="body2">
          StrideMarket não processa pagamentos, checkout, escrow ou entrega. Compre apenas de pessoas
          em quem você confia, tenha cuidado com pagamentos antecipados, confira a condição do produto
          antes de pagar e denuncie anúncios ou comportamentos suspeitos.
        </Typography>
      </Box>
    </Alert>
  );
}
