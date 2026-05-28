"use client";

import { ApolloProvider } from "@apollo/client";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { apolloClient } from "@/lib/apollo";
import { theme } from "@/theme";
import { trpc, createTrpcClient } from "@/lib/trpc";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() => createTrpcClient());

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <ApolloProvider client={apolloClient}>{children}</ApolloProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </ThemeProvider>
  );
}
