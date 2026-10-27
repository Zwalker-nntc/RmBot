import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from "@tanstack/react-query"
import { queryClientInstance } from "@/lib/query-client"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import ScrollToTop from "@/components/ScrollToTop"
import RMbotNet from "@/pages/RMbotNet"

export default function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<RMbotNet />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </QueryClientProvider>
  )
}
