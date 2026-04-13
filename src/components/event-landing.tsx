"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { EventRecord, PhotoFilter, PhotoRecord, PhotoTemplate } from "@/lib/types";
import { Button, LinkButton } from "@/components/button";
import { PhotoEditor } from "@/components/photo-editor";
import { BrandMark } from "@/components/brand-mark";
import {
  Camera,
  ChevronRight,
  Heart,
  ImagePlus,
  ShieldCheck,
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

  useEffect(() => subscribeToStore((store) => {
    const nextEvent = store.events.find((item) => item.slug === initialEvent.slug);
    if (nextEvent) setEvent(nextEvent);
    setPhotos(store.photos.filter((item) => item.eventSlug === initialEvent.slug));
  }), [initialEvent.slug]);

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
        ? "La foto ya está visible en el muro en tiempo real."
        : "La foto quedó en moderación y se verá cuando el dueño del evento la apruebe.",
    );
  }

  const sectionEnabled = (kind: string) =>
    event.landingSections.some((section) => section.kind === kind && section.enabled);

  return (
    <main className="relative min-h-screen overflow-hidden bg-white">
      <div className="absolute inset-0 grid-noise opacity-70" />

      <section className="relative mx-auto max-w-[1560px] px-4 py-5 sm:px-6 lg:px-10">
        <div className="panel reveal rounded-[32px] px-5 py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <BrandMark compact />
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--app-muted)]">
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--app-border)] bg-white px-3 py-1.5">
                <Wifi className="h-3.5 w-3.5" />
                En vivo
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--app-border)] bg-white px-3 py-1.5">
                <Heart className="h-3.5 w-3.5" />
                {publishedPhotos.length} fotos
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--app-border)] bg-white px-3 py-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                {event.visibility === "public" ? "Publica directo" : "Con moderación"}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="relative mx-auto grid max-w-[1560px] gap-8 px-4 pb-8 pt-2 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-10">
        <div className="space-y-6">
          <div className="panel reveal reveal-delay-1 rounded-[40px] p-6 sm:p-8 lg:p-10">
            <div className="inline-flex rounded-full border border-[var(--app-border)] bg-black/3 px-4 py-2 text-xs uppercase tracking-[0.22em] text-[var(--app-muted)]">
              Evento {event.eventType.replace("_", " ")}
            </div>

            <h1 className="mt-6 max-w-2xl font-[family-name:var(--font-space-grotesk)] text-5xl font-semibold leading-[0.92] tracking-tight text-black sm:text-6xl lg:text-[5.6rem]">
              {event.title}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--app-muted)]">
              {event.description}
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <Button onClick={() => openUpload("camera")} className="justify-center py-4">
                <Camera className="h-4 w-4" />
                {event.ctas.primary}
              </Button>
              <Button tone="secondary" onClick={() => openUpload("gallery")} className="justify-center py-4">
                <Upload className="h-4 w-4" />
                {event.ctas.secondary}
              </Button>
              <LinkButton tone="ghost" href="#galeria" className="justify-center py-4">
                Ver galería
                <ChevronRight className="h-4 w-4" />
              </LinkButton>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[26px] border border-[var(--app-border)] bg-white p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--app-muted)]">Fecha</p>
                <p className="mt-2 text-sm font-semibold text-black">{event.dateLabel}</p>
              </div>
              <div className="rounded-[26px] border border-[var(--app-border)] bg-white p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--app-muted)]">Lugar</p>
                <p className="mt-2 text-sm font-semibold text-black">{event.venue}</p>
              </div>
              <div className="rounded-[26px] border border-[var(--app-border)] bg-white p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--app-muted)]">Dueño</p>
                <p className="mt-2 text-sm font-semibold text-black">{event.organizer}</p>
              </div>
            </div>
          </div>

          {sectionEnabled("instructions") && (
            <div className="panel reveal reveal-delay-2 rounded-[36px] p-6 sm:p-8">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--app-muted)]">Cómo funciona</p>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {[
                  "Abre el QR y entra al evento sin instalar nada.",
                  "Toma o sube una foto desde tu teléfono.",
                  "Edita con filtro o plantilla y publícala.",
                ].map((item, index) => (
                  <div key={item} className="rounded-[28px] border border-[var(--app-border)] bg-white p-5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-sm font-semibold text-white">
                      {index + 1}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-black">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {featuredPhoto && (
            <div className="panel reveal reveal-delay-3 overflow-hidden rounded-[36px]">
              <div className="flex items-center justify-between border-b border-[var(--app-border)] px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-black">Foto destacada</p>
                  <p className="text-xs text-[var(--app-muted)]">
                    {clampText(featuredPhoto.note || "Última foto publicada", 46)}
                  </p>
                </div>
                <span className="rounded-full border border-[var(--app-border)] bg-black/3 px-3 py-1 text-xs font-semibold text-black">
                  {formatRelativeTime(featuredPhoto.createdAt)}
                </span>
              </div>
              <div className="grid gap-0 md:grid-cols-[1.25fr_0.75fr]">
                <div className="relative h-96 w-full">
                  <Image
                    src={featuredPhoto.src}
                    alt="Destacada"
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 60vw"
                  />
                </div>
                <div className="p-5 lg:p-6">
                  <div className="rounded-[28px] border border-[var(--app-border)] bg-white p-5">
                    <p className="text-xs uppercase tracking-[0.22em] text-[var(--app-muted)]">Autor</p>
                    <p className="mt-2 text-sm font-semibold text-black">
                      {featuredPhoto.anonymous ? "Invitado anónimo" : featuredPhoto.authorName}
                    </p>
                    <p className="mt-3 text-sm text-[var(--app-muted)]">{featuredPhoto.note}</p>
                  </div>
                  <div className="mt-5 grid gap-3">
                    <Button onClick={() => openUpload("camera")} className="py-4">
                      <Camera className="h-4 w-4" />
                      Subir otra foto
                    </Button>
                    <Button tone="secondary" onClick={() => openUpload("gallery")} className="py-4">
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
              <div className="panel rounded-[32px] p-6">
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--app-muted)]">Historia viva</p>
                <p className="mt-3 text-sm leading-7 text-[var(--app-muted)]">
                  Cada foto puede entrar directo al muro o esperar aprobación. La galería se actualiza
                  en tiempo real para que el evento siempre tenga actividad.
                </p>
              </div>
              <div className="panel rounded-[32px] p-6">
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--app-muted)]">Privacidad</p>
                <p className="mt-3 text-sm leading-7 text-[var(--app-muted)]">
                  El invitado puede dejar su nombre, usar rol invitado o publicar como anónimo.
                  Siempre queda asociado al evento.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="panel reveal reveal-delay-1 rounded-[36px] p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-black">Publica una foto</p>
                <p className="text-xs text-[var(--app-muted)]">Tomar, subir y editar</p>
              </div>
              <span className="rounded-full border border-[var(--app-border)] bg-black/3 px-3 py-1 text-xs font-semibold text-black">
                {event.visibility === "public" ? "Sin moderación" : "Con revisión"}
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Button onClick={() => openUpload("camera")} className="py-4">
                <Camera className="h-4 w-4" />
                Tomar foto
              </Button>
              <Button tone="secondary" onClick={() => openUpload("gallery")} className="py-4">
                <Upload className="h-4 w-4" />
                Subir foto
              </Button>
            </div>

            <div className="mt-5 rounded-[24px] border border-[var(--app-border)] bg-black/3 p-5">
              <div className="flex items-center gap-2 text-sm text-black">
                <User className="h-4 w-4 text-black/60" />
                Sin registro, con nombre opcional
              </div>
              <p className="mt-2 text-xs leading-6 text-[var(--app-muted)]">
                El flujo permite anónimo o invitado, con términos y condiciones antes de publicar.
              </p>
            </div>
          </div>

          <div className="panel rounded-[36px] p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-black">Muro vivo</p>
                <p className="text-xs text-[var(--app-muted)]">Actualización instantánea</p>
              </div>
              <span className="rounded-full border border-[var(--app-border)] bg-black/3 px-3 py-1 text-xs font-semibold text-black">
                {publishedPhotos.length} visibles
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {publishedPhotos.slice(0, 4).map((photo) => (
                <div key={photo.id} className="overflow-hidden rounded-[26px] border border-[var(--app-border)] bg-white">
                  <div className="relative h-36 w-full">
                    <Image
                      src={photo.src}
                      alt={photo.note}
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                  </div>
                  <div className="space-y-1 p-3">
                    <p className="truncate text-sm font-semibold text-black">
                      {photo.anonymous ? "Anónimo" : photo.authorName}
                    </p>
                    <p className="text-xs text-[var(--app-muted)]">{photo.note || "Sin nota"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="galeria" className="relative mx-auto max-w-[1560px] px-4 pb-16 sm:px-6 lg:px-10">
        <div className="panel reveal reveal-delay-4 rounded-[40px] p-6 sm:p-8 lg:p-10">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-black">Galería del evento</p>
              <p className="text-xs text-[var(--app-muted)]">
                Las nuevas fotos aparecen destacadas en cuanto llegan.
              </p>
            </div>
            <Button tone="secondary" onClick={() => openUpload("gallery")}>
              <Upload className="h-4 w-4" />
              Sube una foto
            </Button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3 xl:grid-cols-4">
            {publishedPhotos.map((photo) => (
              <article
                key={photo.id}
                className="overflow-hidden rounded-[28px] border border-[var(--app-border)] bg-white"
              >
                <div className="relative h-56 w-full">
                  <Image
                    src={photo.src}
                    alt={photo.note}
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                </div>
                <div className="space-y-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-black">
                      {photo.anonymous ? "Invitado anónimo" : photo.authorName}
                    </p>
                    <span className="text-xs text-[var(--app-muted)]">{formatRelativeTime(photo.createdAt)}</span>
                  </div>
                  <p className="text-xs leading-5 text-[var(--app-muted)]">
                    {photo.note || "Sin descripción"}
                  </p>
                </div>
              </article>
            ))}
          </div>

          {pendingPhotos.length > 0 && event.visibility === "moderated" && (
            <div className="mt-6 rounded-[28px] border border-black/10 bg-black/3 p-5">
              <p className="text-sm font-semibold text-black">Pendientes de moderación</p>
              <p className="mt-1 text-xs text-[var(--app-muted)]">
                El dueño del evento decide cuándo esas fotos se publican en el mural.
              </p>
            </div>
          )}
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-7xl px-4 pb-4 sm:px-6 lg:px-8">
        <div className="panel-strong flex items-center justify-between gap-4 rounded-[28px] px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-white">Nilo Cam Live</p>
            <p className="text-xs text-white/65">
              CTAs persistentes para que nadie tenga que buscar cómo subir fotos
            </p>
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
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 px-4 backdrop-blur-sm">
          <div className="panel w-full max-w-xl rounded-[32px] p-5">
            <p className="text-sm font-semibold text-black">Termina de publicar</p>
            <p className="mt-1 text-xs text-[var(--app-muted)]">
              Agrega nombre o deja la foto anónima.
            </p>
            {statusMessage && (
              <p className="mt-2 rounded-2xl border border-[var(--app-border)] bg-black/3 px-3 py-2 text-xs text-black">
                {statusMessage}
              </p>
            )}

            <div className="mt-4 space-y-3">
              <input
                value={authorName}
                onChange={(event) => setAuthorName(event.target.value)}
                placeholder="Tu nombre (opcional)"
                className="w-full rounded-2xl border border-[var(--app-border)] bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-black/30"
              />
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Agregar una nota corta"
                className="min-h-24 w-full rounded-2xl border border-[var(--app-border)] bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-black/30"
              />
              <label className="flex items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-black/3 px-4 py-3 text-sm text-black">
                <input
                  type="checkbox"
                  checked={anonymous}
                  onChange={(event) => setAnonymous(event.target.checked)}
                  className="h-4 w-4 rounded border-[var(--app-border)] bg-white"
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
