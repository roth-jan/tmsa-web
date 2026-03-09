import { useState } from "react";
import {
  TextInput,
  PasswordInput,
  Button,
  Paper,
  Title,
  Text,
  Stack,
  Center,
  Alert,
} from "@mantine/core";
import { useAuth } from "../hooks/useAuth";

export function LoginPage() {
  const { login } = useAuth();
  const [benutzername, setBenutzername] = useState("");
  const [passwort, setPasswort] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(benutzername, passwort);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Center style={{ minHeight: "100vh", background: "#f0f2f5" }}>
      <Paper shadow="md" p="xl" radius="md" style={{ width: 400 }}>
        <Title order={2} mb="xs">
          TMSA Web
        </Title>
        <Text c="dimmed" size="sm" mb="lg">
          Transport-Management-System Automotive
        </Text>

        {error && (
          <Alert color="red" mb="md">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Stack>
            <TextInput
              label="Benutzername"
              value={benutzername}
              onChange={(e) => setBenutzername(e.target.value)}
              required
              autoFocus
            />
            <PasswordInput
              label="Passwort"
              value={passwort}
              onChange={(e) => setPasswort(e.target.value)}
              required
            />
            <Button type="submit" loading={loading} fullWidth>
              Anmelden
            </Button>
          </Stack>
        </form>
      </Paper>
    </Center>
  );
}
