"use client";

import { useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from "@mui/material";
import FlagIcon from "@mui/icons-material/Flag";
import { trpc } from "@/lib/trpc";

export function ReportAction({
  listingId,
  sellerId,
  label = "Denunciar",
}: {
  listingId?: string;
  sellerId?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("Suspeita de golpe");
  const [details, setDetails] = useState("");
  const [done, setDone] = useState(false);
  const report = trpc.reports.create.useMutation({
    onSuccess: () => {
      setDone(true);
      setOpen(false);
      setDetails("");
    },
  });

  return (
    <>
      <Stack spacing={1} alignItems="flex-start">
        {done && <Alert severity="success">Denúncia enviada para revisão.</Alert>}
        <Button
          variant="outlined"
          color="warning"
          startIcon={<FlagIcon />}
          onClick={() => setOpen(true)}
        >
          {label}
        </Button>
      </Stack>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Denunciar comportamento suspeito</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {report.error && <Alert severity="error">{report.error.message}</Alert>}
            <TextField
              label="Motivo"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              fullWidth
            />
            <TextField
              label="Detalhes"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              multiline
              minRows={4}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            color="warning"
            disabled={reason.trim().length < 3 || report.isPending}
            onClick={() => report.mutate({ listingId, sellerId, reason, details })}
          >
            Enviar denúncia
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
