import { AppShell, NavLink, Group, Title, Text, Button, Burger } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

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
  ]},
];

export function AppLayout() {
  const { user, logout, hatRecht } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [opened, { toggle }] = useDisclosure();

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
            <Title order={3}>TMSA Web</Title>
          </Group>
          <Group>
            <Text size="sm" c="dimmed">
              {user?.vorname} {user?.nachname} ({user?.niederlassung})
            </Text>
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
                {item.items
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
    </AppShell>
  );
}
