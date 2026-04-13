import { BrandMark } from "@/components/brand-mark";
import { LinkButton } from "@/components/button";
import { Camera, ShieldCheck, Sparkles, Wifi, ScanFace, ChevronRight } from "lucide-react";

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

const storyCards = [
  {
    title: "Landing con aire",
    body: "Bloques grandes, márgenes generosos y CTAs que nunca quedan pegados.",
  },
  {
    title: "Galería viva",
    body: "Las fotos suben y se ven destacadas en el mismo momento en que llegan.",
  },
  {
    title: "Marca clara",
    body: "Blanco y negro con un gato espía que se siente premium y amigable.",
  },
  {
    title: "Eventos flexibles",
    body: "10 tipos iniciales con estructura editable y comportamiento distinto.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <section className="mx-auto flex min-h-[100svh] w-full max-w-[1560px] flex-col justify-between px-4 py-4 sm:px-6 lg:px-10">
        <header className="panel rounded-[32px] px-5 py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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
          </div>
        </header>

        <div className="grid flex-1 gap-6 py-6 lg:grid-cols-[1.08fr_0.92fr] lg:py-8">
          <section className="panel flex flex-col justify-between rounded-[40px] p-7 sm:p-10 lg:p-12">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--app-border)] bg-black/3 px-4 py-2 text-xs uppercase tracking-[0.26em] text-[var(--app-muted)]">
                <Sparkles className="h-3.5 w-3.5" />
                Nilo Cam
              </div>

              <h1 className="mt-6 max-w-4xl font-[family-name:var(--font-space-grotesk)] text-6xl font-semibold leading-[0.92] tracking-tight text-black sm:text-7xl lg:text-[6.5rem]">
                Fotos de eventos con una interfaz blanca, limpia y en tiempo real.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--app-muted)]">
                Un sistema pensado para compartir un QR, abrir una landing moderna en cualquier
                teléfono, tomar o subir fotos, aplicar filtros y mostrarlas al instante en el evento.
              </p>

              <div className="mt-10 flex flex-wrap gap-3">
                <LinkButton href="/admin" tone="primary">
                  Entrar al admin
                </LinkButton>
                <LinkButton href="/e/fiesta-luna" tone="secondary">
                  Ver ejemplo
                </LinkButton>
              </div>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {features.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="rounded-[30px] border border-[var(--app-border)] bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.04)]"
                  >
                    <Icon className="h-5 w-5 text-black" />
                    <p className="mt-5 text-sm font-semibold text-black">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">{item.body}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <aside className="flex flex-col gap-6">
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

              <div className="mt-7 space-y-4">
                {[
                  "Escanea el QR del evento.",
                  "Elige si tomar o subir una foto.",
                  "Edita con filtro o plantilla.",
                  "Publica y ve la foto aparecer en vivo.",
                ].map((step, index) => (
                  <div
                    key={step}
                    className="flex gap-4 rounded-[26px] border border-[var(--app-border)] bg-white p-5"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-xs font-semibold text-white">
                      {index + 1}
                    </div>
                    <p className="self-center text-sm leading-6 text-black">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel rounded-[40px] p-7 sm:p-10">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">
                    Tipos iniciales
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold text-black">10 tipos listos</h3>
                </div>
                <ChevronRight className="h-5 w-5 text-black/40" />
              </div>
              <div className="mt-5 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none]">
                {eventTypes.map((type) => (
                  <div
                    key={type}
                    className="min-w-[150px] shrink-0 rounded-[24px] border border-[var(--app-border)] bg-black/3 px-4 py-3 text-sm font-medium text-black"
                  >
                    {type}
                  </div>
                ))}
              </div>
            </div>

            <div className="panel-strong rounded-[40px] p-7 sm:p-10">
              <p className="text-xs uppercase tracking-[0.24em] text-white/60">Enfoque</p>
              <p className="mt-3 text-2xl font-semibold leading-tight">
                Blanco, negro, aire visual y ritmo editorial.
              </p>
              <p className="mt-4 text-sm leading-7 text-white/72">
                La marca usa un gato espía como logo, tipografía limpia y muchos llamados a la
                acción para que nadie tenga que buscar dónde subir una foto.
              </p>
            </div>
          </aside>
        </div>

        <section className="panel rounded-[40px] p-6 sm:p-8 lg:p-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">Slider</p>
              <h2 className="mt-2 text-3xl font-semibold text-black">Cards que respiran</h2>
            </div>
            <p className="max-w-lg text-sm leading-6 text-[var(--app-muted)]">
              Esta banda horizontal ayuda a explicar el producto sin apretar la pantalla.
            </p>
          </div>

          <div className="mt-6 flex gap-4 overflow-x-auto pb-3 [scrollbar-width:none]">
            {storyCards.map((card, index) => (
              <article
                key={card.title}
                className={`min-w-[280px] shrink-0 rounded-[32px] border border-[var(--app-border)] p-6 ${
                  index % 2 === 0 ? "bg-white" : "bg-black/3"
                }`}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-sm font-semibold text-white">
                  0{index + 1}
                </div>
                <h3 className="mt-5 text-xl font-semibold text-black">{card.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--app-muted)]">{card.body}</p>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
