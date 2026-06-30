import { Container, Paper, Stack, Typography } from "@mui/material";
import { SafetyWarning } from "@/components/safety/SafetyWarning";

export default function SafetyPage() {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Typography variant="h3" fontWeight={800}>
          Segurança no StrideMarket
        </Typography>
        <SafetyWarning />
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={800} gutterBottom>
            Como reduzir risco
          </Typography>
          <Typography color="text.secondary">
            Use os sinais públicos do vendedor, confira redes sociais quando disponíveis, faça perguntas
            sobre condição e uso, prefira encontros seguros ou métodos de compra com proteção própria e
            evite pressão por pagamento antecipado. As denúncias ajudam a equipe a revisar anúncios e
            vendedores suspeitos.
          </Typography>
        </Paper>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={800} gutterBottom>
            O que a plataforma faz
          </Typography>
          <Typography color="text.secondary">
            O StrideMarket oferece moderação, histórico de denúncias, perfis públicos de vendedor,
            contato rastreado e avisos de segurança. Isso reduz riscos, mas não torna uma negociação
            totalmente livre de fraude.
          </Typography>
        </Paper>
      </Stack>
    </Container>
  );
}
