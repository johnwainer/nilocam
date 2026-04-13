import { BrandMark } from "@/components/brand-mark";
import { LinkButton } from "@/components/button";
import { Camera, ShieldCheck, Sparkles, Wifi, ScanFace } from "lucide-react";

const features = [
  {
    title: "PWA sin fricción",
    body: "Abre desde el QR en Android o iPhone, sin instalar nada.",
    icon: Wifi,
  },
  {
    title: "Fotos en vivo",
    body: "Subidas, capturas y fotos destacadas actualizadas al instante.",
    icon: Camera,
  },
  {
    title: "Moderación",
    body: "Cada evento puede publicar directo o pasar por revisión.",
    icon: ShieldCheck,
  },
];

const eventTypes = [
  "Cumpleaños",
  "Fiesta de 15",
  "Matrimonio",
  "Despedida de solter@",
  "Baby shower",
  "Bautizo",
  "Graduación",
  "Aniversario",
  "Corporativo",
  "Festival",
];

export default function Home() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 rounded-[32px] border border-[var(--app-border)] bg-white px-5 py-4 shadow-[0_18px_60px_rgba(15,23,42,0.05)] sm:flex-row sm:items-center sm:justify-between">
        <BrandMark />
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--app-muted)]">
          <span className="rounded-full border border-[var(--app-border)] bg-black/3 px-3 py-1.5">
            QR por evento
          </span>
          <span className="rounded-full border border-[var(--app-border)] bg-black/3 px-3 py-1.5">
            Landing personalizable
          </span>
          <span className="rounded-full border border-[var(--app-border)] bg-black/3 px-3 py-1.5">
            Galería en vivo
          </span>
        </div>
      </header>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="panel rounded-[40px] p-7 sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--app-border)] bg-black/3 px-4 py-2 text-xs uppercase tracking-[0.26em] text-[var(--app-muted)]">
            <Sparkles className="h-3.5 w-3.5" />
            Nilo Cam
          </div>

          <h1 className="mt-5 max-w-3xl font-[family-name:var(--font-space-grotesk)] text-5xl font-semibold leading-[0.92] tracking-tight text-black sm:text-7xl">
            Fotos de eventos con una interfaz blanca, limpia y en tiempo real.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--app-muted)]">
            Un sistema pensado para compartir un QR, abrir una landing moderna en cualquier
            teléfono, tomar o subir fotos, aplicar filtros y mostrarlas al instante en el evento.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton href="/admin" tone="primary">
              Entrar al admin
            </LinkButton>
            <LinkButton href="/e/fiesta-luna" tone="secondary">
              Ver ejemplo
            </LinkButton>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {features.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-[28px] border border-[var(--app-border)] bg-black/3 p-4">
                  <Icon className="h-5 w-5 text-black" />
                  <p className="mt-4 text-sm font-semibold text-black">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">{item.body}</p>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="panel rounded-[40px] p-7 sm:p-10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">
                  Flujo del invitado
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-black">Simple, rápido y amigable</h2>
              </div>
              <div className="rounded-full border border-[var(--app-border)] bg-white p-3">
                <ScanFace className="h-5 w-5 text-black" />
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {[
                "Escanea el QR del evento.",
                "Elige si tomar o subir una foto.",
                "Edita con filtro o plantilla.",
                "Publica y ve la foto aparecer en vivo.",
              ].map((step, index) => (
                <div key={step} className="flex gap-3 rounded-[24px] border border-[var(--app-border)] bg-white p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black text-xs font-semibold text-white">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-6 text-black">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="panel rounded-[40px] p-7 sm:p-10">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">Tipos iniciales</p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-black">
              {eventTypes.map((type) => (
                <div key={type} className="rounded-2xl border border-[var(--app-border)] bg-white px-3 py-2">
                  {type}
                </div>
              ))}
            </div>
          </div>

          <div className="panel-strong rounded-[40px] p-7 sm:p-10">
            <p className="text-xs uppercase tracking-[0.24em] text-white/60">Enfoque</p>
            <p className="mt-3 text-2xl font-semibold leading-tight">
              Blanco, negro, claro y suficientemente moderno para verse premium sin sentirse frío.
            </p>
            <p className="mt-4 text-sm leading-7 text-white/72">
              La marca usa un gato espía como logo, tipografía editorial y muchos llamados a la
              acción para que nadie tenga que buscar dónde subir una foto.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
