"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { EventRecord, PhotoFilter, PhotoRecord, PhotoTemplate } from "@/lib/types";
import { Button, LinkButton } from "@/components/button";
import { PhotoEditor } from "@/components/photo-editor";
import {
  Camera,
  ChevronRight,
  Heart,
  ImagePlus,
  ShieldCheck,
  Sparkles,
  Upload,
  User,
  Wifi,
} from "lucide-react";
import { clampText, formatRelativeTime } from "@/lib/utils";
import { savePhoto, subscribeToStore } from "@/lib/browser-store";

type Props = {
  initialEvent: EventRecord;
  initialPhotos: PhotoRecord[];
};

function eventCopy(event: EventRecord) {
  return {
    hero: event.heroTagline,
    lead: event.description,
  };
}

export function EventLanding({ initialEvent, initialPhotos }: Props) {
  const [event, setEvent] = useState(initialEvent);
  const [photos, setPhotos] = useState(initialPhotos);
  const [editorFile, setEditorFile] = useState<File | null>(null);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [note, setNote] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const captureInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return subscribeToStore((store) => {
      const nextEvent = store.events.find((item) => item.slug === initialEvent.slug);
      if (nextEvent) setEvent(nextEvent);
      setPhotos(store.photos.filter((item) => item.eventSlug === initialEvent.slug));
    });
  }, [initialEvent.slug]);

  const publishedPhotos = useMemo(
    () => photos.filter((photo) => photo.status === "published"),
    [photos],
  );
  const pendingPhotos = useMemo(
    () => photos.filter((photo) => photo.status === "pending"),
    [photos],
  );

  const featuredPhoto = publishedPhotos[0];

  function openUpload(kind: "camera" | "gallery") {
    if (kind === "camera") {
      captureInputRef.current?.click();
    } else {
      fileInputRef.current?.click();
    }
  }

  function handleFileChosen(file?: File | null) {
    if (!file) return;
    setStatusMessage("");
    setPendingUrl(null);
    setEditorFile(file);
  }

  function handleEditorSave(payload: {
    previewUrl: string;
    filter: PhotoFilter;
    template: PhotoTemplate;
  }) {
    setPendingUrl(payload.previewUrl);
    setEditorFile(null);
    setStatusMessage("Foto lista. Completa el nombre y publícala.");
  }

  function handlePublish() {
    if (!pendingUrl) return;

    const photo: PhotoRecord = {
      id: crypto.randomUUID(),
      eventSlug: event.slug,
      src: pendingUrl,
      authorName: anonymous ? "Invitado anónimo" : authorName.trim() || "Invitado Nilo",
      anonymous,
      note: note.trim(),
      status: event.visibility === "public" ? "published" : "pending",
      filter: "none",
      template: "full-bleed",
      createdAt: new Date().toISOString(),
    };

    savePhoto(photo);
    setPendingUrl(null);
    setAuthorName("");
    setAnonymous(false);
    setNote("");
    setStatusMessage(
      photo.status === "published"
        ? "La foto ya está visible en el mural en tiempo real."
        : "La foto quedó en moderación y se verá cuando el dueño del evento la apruebe.",
    );
  }

  const sectionEnabled = (kind: string) =>
    event.landingSections.some((section) => section.kind === kind && section.enabled);

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 grid-noise opacity-60" />

      <section className="relative mx-auto max-w-7xl px-4 pb-8 pt-5 sm:px-6 lg:px-8">
        <div className="glass-card rounded-[30px] px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--app-accent)]/20 ring-1 ring-white/10">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{event.logoText}</p>
                <p className="text-xs text-white/50">{event.qrLabel}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-white/70">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                <Wifi className="h-3.5 w-3.5" />
                En vivo
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                <Heart className="h-3.5 w-3.5" />
                {publishedPhotos.length} fotos publicadas
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                {event.visibility === "public" ? "Publicación directa" : "Moderación activa"}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="relative mx-auto grid max-w-7xl gap-8 px-4 pb-6 pt-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <div className="space-y-6">
          <div className="glass-card rounded-[36px] p-6 sm:p-8">
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/60">
              Evento {event.eventType.replace("_", " ")}
            </div>

            <h1 className="mt-5 max-w-xl font-[family-name:var(--font-space-grotesk)] text-5xl font-bold leading-[0.95] text-white sm:text-6xl">
              {event.title}
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-white/72">
              {eventCopy(event).lead}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Button onClick={() => openUpload("camera")} className="justify-center py-4">
                <Camera className="h-4 w-4" />
                {event.ctas.primary}
              </Button>
              <Button tone="secondary" onClick={() => openUpload("gallery")} className="justify-center py-4">
                <Upload className="h-4 w-4" />
                {event.ctas.secondary}
              </Button>
              <LinkButton
                tone="ghost"
                href="#galeria"
                className="justify-center py-4 ring-1 ring-white/10"
              >
                Ver galería
                <ChevronRight className="h-4 w-4" />
              </LinkButton>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/40">Fecha</p>
                <p className="mt-2 text-sm font-semibold text-white">{event.dateLabel}</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/40">Lugar</p>
                <p className="mt-2 text-sm font-semibold text-white">{event.venue}</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/40">Nombre</p>
                <p className="mt-2 text-sm font-semibold text-white">{event.organizer}</p>
              </div>
            </div>
          </div>

          {sectionEnabled("instructions") && (
            <div className="glass-card rounded-[32px] p-6">
              <p className="text-xs uppercase tracking-[0.22em] text-white/40">Cómo funciona</p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {[
                  "Abre el QR y entra al evento sin instalar nada.",
                  "Toma una foto o súbela desde la galería.",
                  "Edita con filtro o plantilla y publícala.",
                ].map((item, index) => (
                  <div key={item} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10 text-sm font-bold text-white">
                      {index + 1}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-white/76">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {featuredPhoto && (
            <div className="glass-card overflow-hidden rounded-[32px]">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-white">Foto destacada</p>
                  <p className="text-xs text-white/50">{clampText(featuredPhoto.note || "Última foto publicada", 46)}</p>
                </div>
                <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                  {formatRelativeTime(featuredPhoto.createdAt)}
                </span>
              </div>
              <div className="grid gap-0 md:grid-cols-[1.2fr_0.8fr]">
                <img src={featuredPhoto.src} alt="Destacada" className="h-80 w-full object-cover" />
                <div className="p-5">
                  <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-white/40">Autor</p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {featuredPhoto.anonymous ? "Invitado anónimo" : featuredPhoto.authorName}
                    </p>
                    <p className="mt-3 text-sm text-white/65">{featuredPhoto.note}</p>
                  </div>
                  <div className="mt-4 grid gap-3">
                    <Button onClick={() => openUpload("camera")}>
                      <Camera className="h-4 w-4" />
                      Subir otra foto
                    </Button>
                    <Button tone="secondary" onClick={() => openUpload("gallery")}>
                      <ImagePlus className="h-4 w-4" />
                      Elegir desde galería
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {sectionEnabled("story") && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="glass-card rounded-[30px] p-6">
                <p className="text-xs uppercase tracking-[0.22em] text-white/40">Historia viva</p>
                <p className="mt-3 text-sm leading-7 text-white/70">
                  Cada foto aparece en el momento exacto en el que se publica. Si el evento está en
                  moderación, el dueño la aprueba desde el admin antes de mostrarla en el muro.
                </p>
              </div>
              <div className="glass-card rounded-[30px] p-6">
                <p className="text-xs uppercase tracking-[0.22em] text-white/40">Privacidad</p>
                <p className="mt-3 text-sm leading-7 text-white/70">
                  Los invitados pueden dejar nombre o entrar como anónimos. Siempre queda asociada
                  al evento y se pueden mostrar términos y condiciones antes de publicar.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="glass-card rounded-[34px] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Publica una foto</p>
                <p className="text-xs text-white/50">Tomar o subir, editar y enviar</p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/70">
                {event.visibility === "public" ? "Sin moderación" : "Con revisión"}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Button onClick={() => openUpload("camera")} className="py-4">
                <Camera className="h-4 w-4" />
                Tomar foto
              </Button>
              <Button tone="secondary" onClick={() => openUpload("gallery")} className="py-4">
                <Upload className="h-4 w-4" />
                Subir foto
              </Button>
            </div>

            <div className="mt-4 rounded-[24px] border border-dashed border-white/12 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-sm text-white/80">
                <User className="h-4 w-4 text-white/55" />
                Sin registro, con nombre opcional
              </div>
              <p className="mt-2 text-xs leading-6 text-white/50">
                El invitado puede escribir su nombre, dejar la foto anónima o usar el rol invitado
                para que quede asociada al evento.
              </p>
            </div>
          </div>

          <div className="glass-card rounded-[34px] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Muro vivo</p>
                <p className="text-xs text-white/50">
                  Se actualiza al instante cuando entran fotos nuevas
                </p>
              </div>
              <span className="rounded-full bg-cyan-400/15 px-3 py-1 text-xs font-semibold text-cyan-200">
                {publishedPhotos.length} visibles
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {publishedPhotos.slice(0, 4).map((photo) => (
                <div key={photo.id} className="overflow-hidden rounded-[24px] bg-white/5">
                  <img src={photo.src} alt={photo.note} className="h-36 w-full object-cover" />
                  <div className="space-y-1 p-3">
                    <p className="text-xs font-semibold text-white">
                      {photo.anonymous ? "Anónimo" : photo.authorName}
                    </p>
                    <p className="text-xs text-white/50">{photo.note || "Sin nota"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="galeria" className="relative mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="glass-card rounded-[34px] p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Galería del evento</p>
              <p className="text-xs text-white/50">
                El contenido subido por invitados se ve en tiempo real aquí.
              </p>
            </div>
            <Button tone="secondary" onClick={() => openUpload("gallery")}>
              <Upload className="h-4 w-4" />
              Sube una foto
            </Button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3 xl:grid-cols-4">
            {publishedPhotos.map((photo) => (
              <article
                key={photo.id}
                className="overflow-hidden rounded-[28px] border border-white/10 bg-white/5"
              >
                <img src={photo.src} alt={photo.note} className="h-56 w-full object-cover" />
                <div className="space-y-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-white">
                      {photo.anonymous ? "Invitado anónimo" : photo.authorName}
                    </p>
                    <span className="text-xs text-white/45">{formatRelativeTime(photo.createdAt)}</span>
                  </div>
                  <p className="text-xs leading-5 text-white/55">{photo.note || "Sin descripción"}</p>
                </div>
              </article>
            ))}
          </div>

          {pendingPhotos.length > 0 && event.visibility === "moderated" && (
            <div className="mt-6 rounded-[28px] border border-amber-400/20 bg-amber-400/10 p-4">
              <p className="text-sm font-semibold text-amber-200">Pendientes de moderación</p>
              <p className="mt-1 text-xs text-amber-100/70">
                Estas fotos ya fueron enviadas, pero el dueño del evento decide cuándo aparecen en
                el muro principal.
              </p>
            </div>
          )}
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-7xl px-4 pb-4 sm:px-6 lg:px-8">
        <div className="glass-card flex items-center justify-between gap-4 rounded-[28px] px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-white">Nilo Cam Live</p>
            <p className="text-xs text-white/50">CTAs persistentes para que nadie pierda la oportunidad de subir fotos</p>
          </div>
          <div className="flex gap-2">
            <Button tone="secondary" onClick={() => openUpload("gallery")} className="px-4 py-2">
              Subir foto
            </Button>
            <Button onClick={() => openUpload("camera")} className="px-4 py-2">
              Tomar foto
            </Button>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => handleFileChosen(event.target.files?.[0])}
      />
      <input
        ref={captureInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => handleFileChosen(event.target.files?.[0])}
      />

      {editorFile && (
        <PhotoEditor
          file={editorFile}
          onCancel={() => setEditorFile(null)}
          onSave={handleEditorSave}
        />
      )}

      {pendingUrl && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 px-4 backdrop-blur-sm">
          <div className="glass-card w-full max-w-xl rounded-[28px] p-5">
            <p className="text-sm font-semibold text-white">Termina de publicar</p>
            <p className="mt-1 text-xs text-white/50">{statusMessage || "Agrega nombre o deja la foto anónima."}</p>

            <div className="mt-4 space-y-3">
              <input
                value={authorName}
                onChange={(event) => setAuthorName(event.target.value)}
                placeholder="Tu nombre (opcional)"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
              />
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Agregar una nota corta"
                className="min-h-24 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
              />
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
                <input
                  type="checkbox"
                  checked={anonymous}
                  onChange={(event) => setAnonymous(event.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-transparent"
                />
                Publicar como anónimo
              </label>
            </div>

            <div className="mt-4 flex gap-3">
              <Button tone="secondary" className="flex-1" onClick={() => setPendingUrl(null)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handlePublish}>
                Publicar ahora
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
