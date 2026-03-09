import "@mantine/core/styles.css";
import { MantineProvider } from "@mantine/core";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./components/AuthProvider";
import { useAuth } from "./hooks/useAuth";
import { AppLayout } from "./components/AppLayout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { BenutzerPage } from "./pages/BenutzerPage";
import {
  NiederlassungenPage,
  OemsPage,
  WerkePage,
  LieferantenPage,
  AbladestellenPage,
  TransportUnternehmerPage,
  KfzPage,
  RoutenPage,
  KonditionenPage,
  DispoOrtePage,
  DispoRegelnPage,
} from "./pages/stammdaten";
import { AvisPage } from "./pages/AvisPage";
import { TourPage } from "./pages/TourPage";
import { MengenplanPage } from "./pages/MengenplanPage";
import { NacharbeitPage } from "./pages/NacharbeitPage";
import { AbfahrtPage } from "./pages/AbfahrtPage";
import { SendungsbildungPage } from "./pages/SendungsbildungPage";
import { TuAbrechnungPage } from "./pages/TuAbrechnungPage";
import { BerichtePage } from "./pages/BerichtePage";

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/niederlassungen" element={<NiederlassungenPage />} />
        <Route path="/oems" element={<OemsPage />} />
        <Route path="/werke" element={<WerkePage />} />
        <Route path="/lieferanten" element={<LieferantenPage />} />
        <Route path="/abladestellen" element={<AbladestellenPage />} />
        <Route path="/transport-unternehmer" element={<TransportUnternehmerPage />} />
        <Route path="/kfz" element={<KfzPage />} />
        <Route path="/routen" element={<RoutenPage />} />
        <Route path="/konditionen" element={<KonditionenPage />} />
        <Route path="/dispo-orte" element={<DispoOrtePage />} />
        <Route path="/dispo-regeln" element={<DispoRegelnPage />} />
        <Route path="/avise" element={<AvisPage />} />
        <Route path="/touren" element={<TourPage />} />
        <Route path="/mengenplan" element={<MengenplanPage />} />
        <Route path="/abfahrten" element={<AbfahrtPage />} />
        <Route path="/nacharbeit" element={<NacharbeitPage />} />
        <Route path="/sendungsbildung" element={<SendungsbildungPage />} />
        <Route path="/tu-abrechnung" element={<TuAbrechnungPage />} />
        <Route path="/berichte" element={<BerichtePage />} />
        <Route path="/benutzer" element={<BenutzerPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <MantineProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </MantineProvider>
  );
}
