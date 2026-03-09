import { Title, Text, SimpleGrid, Paper, Stack } from "@mantine/core";
import { useAuth } from "../hooks/useAuth";

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <Stack>
      <Title order={2}>Dashboard</Title>
      <Text c="dimmed">
        Willkommen, {user?.vorname} {user?.nachname}
      </Text>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} mt="md">
        <Paper shadow="xs" p="md" radius="md" withBorder>
          <Text fw={700}>Niederlassung</Text>
          <Text size="xl">{user?.niederlassung || "—"}</Text>
        </Paper>
        <Paper shadow="xs" p="md" radius="md" withBorder>
          <Text fw={700}>Rolle</Text>
          <Text size="xl">
            {user?.rechte && user.rechte.length > 50
              ? "Administrator"
              : "Disponent"}
          </Text>
        </Paper>
        <Paper shadow="xs" p="md" radius="md" withBorder>
          <Text fw={700}>Berechtigungen</Text>
          <Text size="xl">{user?.rechte?.length || 0} Rechte</Text>
        </Paper>
      </SimpleGrid>
    </Stack>
  );
}
