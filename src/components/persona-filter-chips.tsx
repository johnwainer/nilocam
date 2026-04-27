"use client";

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ dragging: false, startX: 0, scrollLeft: 0 });

  useEffect(() => {
    fetch(`/api/events/${eventId}/persons/public`)
      .then((r) => r.json())
      .then((json: { ok: boolean; persons?: PublicPerson[] }) => {
        if (json.ok) setPersons(json.persons ?? []);
      })
      .catch(() => {});
  }, [eventId]);

  if (persons.length === 0) return null;
  const onMouseDown = (e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    dragRef.current = { dragging: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current.dragging) return;
    const el = scrollRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    el.scrollLeft = dragRef.current.scrollLeft - (x - dragRef.current.startX);
  };
  const onMouseUp = () => { dragRef.current.dragging = false; };

  return (
    <div style={s.wrap}>
      <div
        ref={scrollRef}
        style={s.strip}
        role="group"
        aria-label="Filtrar por persona"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {/* "Todas" card */}
        <button
          type="button"
          style={{ ...s.card, ...(selectedPersonId === null ? s.cardActive : {}) }}
          onClick={() => onSelect(null)}
        >
          <div style={{ ...s.avatar, ...(selectedPersonId === null ? s.avatarActive : s.avatarAll) }}>
            <GridIcon />
          </div>
          <span style={s.name}>Todas</span>
        </button>

        {persons.map((p) => (
          <PersonCard
            key={p.id}
            person={p}
            isActive={selectedPersonId === p.id}
            onClick={() => onSelect(selectedPersonId === p.id ? null : p.id)}
          />
        ))}
      </div>
    </div>
  );
}

function PersonCard({
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
      const pad = Math.max(bbox.width, bbox.height) * 0.35;
      const sx = Math.max(0, bbox.x - pad);
      const sy = Math.max(0, bbox.y - pad);
      const sw = Math.min(img.width - sx, bbox.width + pad * 2);
      const sh = Math.min(img.height - sy, bbox.height + pad * 2);
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 52, 52);
    };
    img.src = person.cover_photo_url;
  }, [person.cover_photo_url, person.cover_bbox]);

  const handle = person.instagram
    ? `@${person.instagram}`
    : person.tiktok
    ? `@${person.tiktok}`
    : null;

  return (
    <button
      type="button"
      style={{ ...s.card, ...(isActive ? s.cardActive : {}) }}
      onClick={onClick}
    >
      <div style={{ ...s.avatar, ...(isActive ? s.avatarActive : {}) }}>
        {person.cover_photo_url && person.cover_bbox ? (
          <canvas
            ref={canvasRef}
            width={52}
            height={52}
            style={{ display: "block", width: 52, height: 52 }}
          />
        ) : (
          <span style={s.avatarInitial}>
            {person.display_name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <span style={{ ...s.name, ...(isActive ? s.nameActive : {}) }}>
        {person.display_name}
      </span>
      {handle && (
        <span style={{ ...s.handle, ...(isActive ? s.handleActive : {}) }}>
          {handle}
        </span>
      )}
    </button>
  );
}

function GridIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrap: {
    position: "relative",
    marginBottom: 20,
    // Fade edges to hint scrollability
    WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 32px, black calc(100% - 32px), transparent 100%)",
    maskImage: "linear-gradient(to right, transparent 0%, black 32px, black calc(100% - 32px), transparent 100%)",
  },
  strip: {
    display: "flex",
    gap: 10,
    overflowX: "auto",
    paddingBottom: 6,
    paddingLeft: 4,
    paddingRight: 4,
    scrollbarWidth: "none",
    msOverflowStyle: "none",
    cursor: "grab",
    userSelect: "none",
  } as React.CSSProperties,
  card: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    padding: "10px 12px",
    borderRadius: 14,
    border: "1.5px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.05)",
    cursor: "pointer",
    flexShrink: 0,
    minWidth: 72,
    transition: "border-color 0.15s, background 0.15s",
    backdropFilter: "blur(8px)",
  } as React.CSSProperties,
  cardActive: {
    border: "1.5px solid rgba(255,255,255,0.6)",
    background: "rgba(255,255,255,0.14)",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: "50%",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(255,255,255,0.08)",
    border: "2px solid rgba(255,255,255,0.12)",
    flexShrink: 0,
    color: "rgba(255,255,255,0.55)",
    transition: "border-color 0.15s",
  } as React.CSSProperties,
  avatarActive: {
    border: "2.5px solid #ffffff",
    color: "#fff",
  },
  avatarAll: {
    color: "rgba(255,255,255,0.55)",
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: 700,
    color: "rgba(255,255,255,0.7)",
  },
  name: {
    fontSize: 11,
    fontWeight: 600,
    color: "rgba(255,255,255,0.65)",
    textAlign: "center" as const,
    maxWidth: 68,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
    lineHeight: 1.2,
  },
  nameActive: {
    color: "#ffffff",
  },
  handle: {
    fontSize: 10,
    fontWeight: 400,
    color: "rgba(255,255,255,0.35)",
    textAlign: "center" as const,
    maxWidth: 68,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  handleActive: {
    color: "rgba(255,255,255,0.6)",
  },
};
