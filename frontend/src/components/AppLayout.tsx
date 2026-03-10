import { useState } from "react";
import { AppShell, NavLink, Group, Title, Text, Button, Burger, Modal, PasswordInput, Stack, Alert } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { api } from "../api/client";

const navItems = [
  { label: "Dashboard", path: "/" },
  { group: "Stammdaten", items: [
    { label: "Niederlassungen", path: "/niederlassungen", modul: "niederlassung" },
    { label: "OEMs", path: "/oems", modul: "oem" },
    { label: "Werke", path: "/werke", modul: "werk" },
    { label: "Lieferanten", path: "/lieferanten", modul: "lieferant" },
    { label: "Abladestellen", path: "/abladestellen", modul: "abladestelle" },
    { label: "Transport-Unternehmer", path: "/transport-unternehmer", modul: "tu" },
    { label: "Fahrzeuge (KFZ)", path: "/kfz", modul: "kfz" },
    { label: "Routen", path: "/routen", modul: "route" },
    { label: "Konditionen", path: "/konditionen", modul: "kondition" },
    { label: "Umschlagpunkte", path: "/umschlag-punkte", modul: "umschlagpunkt" },
  ]},
  { group: "Disposition", items: [
    { label: "Avise", path: "/avise", modul: "avis" },
    { label: "Touren", path: "/touren", modul: "tour" },
    { label: "Mengenplan", path: "/mengenplan", modul: "mengenplan" },
    { label: "Dispo-Orte", path: "/dispo-orte", modul: "dispoort" },
    { label: "Dispo-Regeln", path: "/dispo-regeln", modul: "disporegel" },
    { label: "EDI Simulator", path: "/edi-simulator", modul: "avis" },
  ]},
  { group: "Operativ", items: [
    { label: "Abfahrten", path: "/abfahrten", modul: "abfahrt" },
    { label: "Nacharbeit", path: "/nacharbeit", modul: "nacharbeit" },
    { label: "Sendungsbildung", path: "/sendungsbildung", modul: "sendung" },
  ]},
  { group: "Abrechnung", items: [
    { label: "TU-Abrechnung", path: "/tu-abrechnung", modul: "tuabrechnung" },
  ]},
  { group: "Berichte", items: [
    { label: "Berichte", path: "/berichte", modul: "berichte" },
  ]},
  { group: "Administration", items: [
    { label: "Benutzer", path: "/benutzer", modul: "benutzer" },
  ]},
];

export function AppLayout() {
  const { user, logout, hatRecht } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [opened, { toggle }] = useDisclosure();
  const [pwModal, { open: openPwModal, close: closePwModal }] = useDisclosure();
  const [pwForm, setPwForm] = useState({ alt: "", neu: "", bestaetigung: "" });
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  const pwReset = () => {
    setPwForm({ alt: "", neu: "", bestaetigung: "" });
    setPwError("");
    setPwSuccess("");
  };

  const pwSpeichern = async () => {
    setPwError("");
    setPwSuccess("");
    if (!pwForm.alt || !pwForm.neu) {
      setPwError("Altes und neues Passwort erforderlich");
      return;
    }
    if (pwForm.neu !== pwForm.bestaetigung) {
      setPwError("Neue Passwörter stimmen nicht überein");
      return;
    }
    if (pwForm.neu.length < 4) {
      setPwError("Neues Passwort muss mindestens 4 Zeichen lang sein");
      return;
    }
    try {
      await api("/auth/passwort-aendern", {
        method: "POST",
        body: JSON.stringify({ altesPasswort: pwForm.alt, neuesPasswort: pwForm.neu }),
      });
      setPwSuccess("Passwort wurde geändert");
      setPwForm({ alt: "", neu: "", bestaetigung: "" });
    } catch (err: any) {
      setPwError(err.message);
    }
  };

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{ width: 250, breakpoint: "sm", collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Title order={3}>TMSA</Title>
          </Group>
          <Group>
            <Text size="sm" c="dimmed">
              {user?.vorname} {user?.nachname} ({user?.niederlassung})
            </Text>
            <Button variant="subtle" size="xs" onClick={() => { pwReset(); openPwModal(); }}>
              Passwort ändern
            </Button>
            <Button variant="subtle" size="xs" onClick={logout}>
              Abmelden
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs">
        {navItems.map((item, i) => {
          if ("group" in item) {
            return (
              <NavLink key={i} label={item.group} defaultOpened>
                {item.items!
                  .filter((sub) => !sub.modul || hatRecht(sub.modul, "lesen"))
                  .map((sub) => (
                  <NavLink
                    key={sub.path}
                    label={sub.label}
                    active={location.pathname === sub.path}
                    onClick={(e) => { e.preventDefault(); navigate(sub.path); }}
                    href={sub.path}
                  />
                ))}
              </NavLink>
            );
          }
          return (
            <NavLink
              key={item.path}
              label={item.label}
              active={location.pathname === item.path}
              onClick={(e) => { e.preventDefault(); navigate(item.path); }}
              href={item.path}
            />
          );
        })}
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>

      <Modal opened={pwModal} onClose={closePwModal} title="Passwort ändern">
        {pwError && <Alert color="red" mb="md">{pwError}</Alert>}
        {pwSuccess && <Alert color="green" mb="md">{pwSuccess}</Alert>}
        <Stack>
          <PasswordInput label="Altes Passwort" required value={pwForm.alt} onChange={(e) => setPwForm({ ...pwForm, alt: e.target.value })} />
          <PasswordInput label="Neues Passwort" required value={pwForm.neu} onChange={(e) => setPwForm({ ...pwForm, neu: e.target.value })} />
          <PasswordInput label="Neues Passwort bestätigen" required value={pwForm.bestaetigung} onChange={(e) => setPwForm({ ...pwForm, bestaetigung: e.target.value })} />
          <Group justify="flex-end">
            <Button variant="default" onClick={closePwModal}>Abbrechen</Button>
            <Button onClick={pwSpeichern}>Passwort ändern</Button>
          </Group>
        </Stack>
      </Modal>
    </AppShell>
  );
}
