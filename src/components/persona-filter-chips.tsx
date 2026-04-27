"use client";

// Filter chips shown above the gallery to filter photos by tagged person.

import { useEffect, useRef, useState } from "react";

export type PublicPerson = {
  id: string;
  display_name: string;
  instagram: string | null;
  tiktok: string | null;
  cover_photo_url: string | null;
  cover_bbox: { x: number; y: number; width: number; height: number } | null;
  face_count: number;
};

type Props = {
  eventId: string;
  selectedPersonId: string | null;
  onSelect: (personId: string | null) => void;
};

export function PersonaFilterChips({ eventId, selectedPersonId, onSelect }: Props) {
  const [persons, setPersons] = useState<PublicPerson[]>([]);

  useEffect(() => {
    fetch(`/api/events/${eventId}/persons/public`)
      .then((r) => r.json())
      .then((json: { ok: boolean; persons?: PublicPerson[] }) => {
        if (json.ok) setPersons(json.persons ?? []);
      })
      .catch(() => {});
  }, [eventId]);

  if (persons.length === 0) return null;

  return (
    <div style={s.row} role="group" aria-label="Filtrar por persona">
      <button
        type="button"
        style={selectedPersonId === null ? s.chipActive : s.chip}
        onClick={() => onSelect(null)}
      >
        Todas
      </button>
      {persons.map((p) => (
        <PersonChip
          key={p.id}
          person={p}
          isActive={selectedPersonId === p.id}
          onClick={() => onSelect(selectedPersonId === p.id ? null : p.id)}
        />
      ))}
    </div>
  );
}

function PersonChip({
  person,
  isActive,
  onClick,
}: {
  person: PublicPerson;
  isActive: boolean;
  onClick: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!person.cover_photo_url || !person.cover_bbox) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const bbox = person.cover_bbox!;
      const pad = Math.max(bbox.width, bbox.height) * 0.25;
      const sx = Math.max(0, bbox.x - pad);
      const sy = Math.max(0, bbox.y - pad);
      const sw = Math.min(img.width - sx, bbox.width + pad * 2);
      const sh = Math.min(img.height - sy, bbox.height + pad * 2);
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 28, 28);
    };
    img.src = person.cover_photo_url;
  }, [person.cover_photo_url, person.cover_bbox]);

  const label = person.display_name;

  return (
    <button
      type="button"
      style={isActive ? s.chipActive : s.chip}
      onClick={onClick}
      title={`${label}${person.instagram ? ` · @${person.instagram}` : ""}`}
    >
      {person.cover_photo_url && person.cover_bbox && (
        <canvas
          ref={canvasRef}
          width={28}
          height={28}
          style={{ borderRadius: "50%", flexShrink: 0, marginRight: 6 }}
        />
      )}
      {label}
    </button>
  );
}

const s: Record<string, React.CSSProperties> = {
  row: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    padding: "0 0 12px",
    alignItems: "center",
  },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    padding: "5px 14px",
    borderRadius: 999,
    border: "1px solid rgba(0,0,0,0.15)",
    background: "rgba(255,255,255,0.06)",
    color: "var(--text, #111)",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    backdropFilter: "blur(4px)",
    transition: "background 0.15s, border-color 0.15s",
  },
  chipActive: {
    display: "inline-flex",
    alignItems: "center",
    padding: "5px 14px",
    borderRadius: 999,
    border: "1px solid rgba(0,0,0,0.7)",
    background: "#111",
    color: "#fff",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    backdropFilter: "blur(4px)",
  },
};
