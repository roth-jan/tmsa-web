import { AppShell, NavLink, Group, Title, Text, Button, Burger } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const navItems = [
  { label: "Dashboard", path: "/" },
  { group: "Stammdaten", items: [
    { label: "Niederlassungen", path: "/niederlassungen" },
    { label: "OEMs", path: "/oems" },
    { label: "Werke", path: "/werke" },
    { label: "Lieferanten", path: "/lieferanten" },
    { label: "Abladestellen", path: "/abladestellen" },
    { label: "Transport-Unternehmer", path: "/transport-unternehmer" },
    { label: "Fahrzeuge (KFZ)", path: "/kfz" },
    { label: "Routen", path: "/routen" },
    { label: "Konditionen", path: "/konditionen" },
  ]},
];

export function AppLayout() {
  const { user, logout } = useAuth();
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
                {item.items.map((sub) => (
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
