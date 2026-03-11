import { Modal, Text, Group, Button } from "@mantine/core";

interface ConfirmModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  color?: string;
}

export function ConfirmModal({
  opened,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Löschen",
  color = "red",
}: ConfirmModalProps) {
  return (
    <Modal opened={opened} onClose={onClose} title={title} size="sm" centered>
      <Text size="sm" mb="lg">{message}</Text>
      <Group justify="flex-end">
        <Button variant="default" onClick={onClose}>Abbrechen</Button>
        <Button color={color} onClick={() => { onConfirm(); onClose(); }}>
          {confirmLabel}
        </Button>
      </Group>
    </Modal>
  );
}

/**
 * Hook für einfache Confirm-Modal-Nutzung.
 * Gibt [ConfirmModal-Props, openConfirm-Funktion] zurück.
 */
import { useState, useCallback, useRef } from "react";

export function useConfirm() {
  const [opened, setOpened] = useState(false);
  const [config, setConfig] = useState({ title: "", message: "", confirmLabel: "Löschen", color: "red" });
  const callbackRef = useRef<(() => void) | null>(null);

  const openConfirm = useCallback(
    (opts: { title: string; message: string; confirmLabel?: string; color?: string; onConfirm: () => void }) => {
      setConfig({
        title: opts.title,
        message: opts.message,
        confirmLabel: opts.confirmLabel || "Löschen",
        color: opts.color || "red",
      });
      callbackRef.current = opts.onConfirm;
      setOpened(true);
    },
    []
  );

  const modalProps = {
    opened,
    onClose: () => setOpened(false),
    onConfirm: () => callbackRef.current?.(),
    ...config,
  };

  return { modalProps, openConfirm };
}
