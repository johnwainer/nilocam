import { BrandMark } from "@/components/brand-mark";
import { LinkButton } from "@/components/button";
import {
  Camera,
  CheckCircle2,
  ChevronRight,
  LayoutDashboard,
  ScanFace,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Upload,
  Wifi,
} from "lucide-react";

const heroStats = [
  { value: "PWA", label: "sin instalación" },
  { value: "QR", label: "por evento" },
  { value: "Live", label: "fotos en tiempo real" },
  { value: "10", label: "tipos iniciales" },
];

const howItWorks = [
  {
    step: "01",
    title: "Escanea el QR",
    body: "Cada evento abre una URL corta y limpia, lista para compartir en mesas, pantallas o impresos.",
  },
  {
    step: "02",
    title: "Toma o sube fotos",
    body: "El invitado entra a una experiencia diseñada para Android y iPhone, sin crear cuenta ni instalar nada.",
  },
  {
    step: "03",
    title: "Edita y publica",
    body: "La foto puede pasar por filtros y plantillas antes de llegar al muro del evento.",
  },
  {
    step: "04",
    title: "Se ve en vivo",
    body: "Las fotos publicadas se reflejan al instante para mantener la energía del landing.",
  },
];

const benefits = [
  {
    icon: Smartphone,
    title: "Funciona en cualquier teléfono",
    body: "La experiencia está pensada para abrir rápido desde el navegador, con una UI simple y cómoda.",
  },
  {
    icon: Camera,
    title: "Fotos desde cámara o galería",
    body: "El flujo permite tomar una foto al momento o subirla desde el dispositivo con pocos toques.",
  },
  {
    icon: LayoutDashboard,
    title: "Panel operativo",
    body: "El dueño del evento puede crear eventos, cambiar landing y moderar fotos desde el admin.",
  },
  {
    icon: ShieldCheck,
    title: "Control por evento",
    body: "Cada evento decide si publica directo o pasa por moderación antes de salir al muro.",
  },
  {
    icon: Wifi,
    title: "Galería viva",
    body: "Las fotos aparecen en tiempo real para que el evento siempre tenga movimiento y presencia.",
  },
  {
    icon: Upload,
    title: "CTAs claros",
    body: "El landing usa llamados a la acción repetidos para que la gente siempre sepa qué hacer.",
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

const templates = [
  "Minimal black",
  "Elegant white",
  "Editorial strip",
  "Gallery spotlight",
  "Live wall",
  "Classic frame",
];

const faq = [
  {
    q: "¿Las personas necesitan instalar una app?",
    a: "No. Nilo Cam funciona como PWA y se abre desde el QR en el navegador del teléfono.",
  },
  {
    q: "¿Las fotos se publican solas?",
    a: "Depende del evento. Puedes usar publicación directa o moderación previa desde el admin.",
  },
  {
    q: "¿Se puede personalizar el landing?",
    a: "Sí. Cada evento puede tener secciones editables, textos propios y un estilo distinto.",
  },
  {
    q: "¿El muro se actualiza en vivo?",
    a: "Sí. Las fotos nuevas aparecen al instante para que el landing muestre actividad real.",
  },
];

const featureNotes = [
  "Landing personalizable por evento",
  "QR único por experiencia",
  "Logo del gato espía",
  "Moderación opcional",
  "Textos y CTAs configurables",
  "Diseño blanco y negro",
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-clip bg-white">
      <section className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="panel reveal rounded-[30px] px-5 py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <BrandMark />
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--app-muted)]">
              <span className="rounded-full border border-[var(--app-border)] bg-black/3 px-3 py-1.5">
                QR por evento
              </span>
              <span className="rounded-full border border-[var(--app-border)] bg-black/3 px-3 py-1.5">
                Fotos en vivo
              </span>
              <span className="rounded-full border border-[var(--app-border)] bg-black/3 px-3 py-1.5">
                Admin profesional
              </span>
            </div>
          </div>
        </div>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="panel reveal reveal-delay-1 rounded-[38px] p-6 sm:p-8 lg:p-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--app-border)] bg-black/3 px-4 py-2 text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">
              <Sparkles className="h-3.5 w-3.5" />
              Nilo Cam
            </div>

            <h1 className="mt-6 max-w-3xl font-[family-name:var(--font-space-grotesk)] text-5xl font-semibold leading-[0.95] tracking-tight text-black sm:text-6xl lg:text-[5.45rem]">
              Fotografía para eventos, pensada como una experiencia de producto real.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--app-muted)] sm:text-lg">
              Nilo Cam permite compartir un QR, abrir una landing profesional en cualquier teléfono,
              subir o tomar fotos, editarlas y verlas en vivo dentro del evento. Sin apps. Sin fricción.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href="/admin" tone="primary">
                Abrir admin
              </LinkButton>
              <LinkButton href="/e/fiesta-luna" tone="secondary">
                Ver demo
              </LinkButton>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {heroStats.map((item) => (
                <div key={item.label} className="rounded-[24px] border border-[var(--app-border)] bg-white p-4">
                  <p className="text-2xl font-semibold text-black">{item.value}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--app-muted)]">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {benefits.slice(0, 4).map((item) => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.title}
                    className="rounded-[28px] border border-[var(--app-border)] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)]"
                  >
                    <Icon className="h-5 w-5 text-black" />
                    <h2 className="mt-4 text-base font-semibold text-black">{item.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">{item.body}</p>
                  </article>
                );
              })}
            </div>
          </div>

          <aside className="space-y-6">
            <div className="panel reveal reveal-delay-2 rounded-[38px] p-6 sm:p-8">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">Cómo funciona</p>
                  <h2 className="mt-2 text-2xl font-semibold text-black">Flujo de invitados</h2>
                </div>
                <div className="rounded-full border border-[var(--app-border)] bg-white p-3">
                  <ScanFace className="h-5 w-5 text-black" />
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {howItWorks.map((item) => (
                  <div key={item.step} className="flex gap-4 rounded-[24px] border border-[var(--app-border)] bg-white p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-xs font-semibold text-white">
                      {item.step}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-black">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-[var(--app-muted)]">{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel reveal reveal-delay-3 rounded-[38px] p-6 sm:p-8">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">Tipos de eventos</p>
              <h2 className="mt-2 text-2xl font-semibold text-black">10 configuraciones iniciales</h2>
              <div className="snap-scroll mt-5 flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
                {eventTypes.map((type) => (
                  <div
                    key={type}
                    className="min-w-[168px] snap-start rounded-[22px] border border-[var(--app-border)] bg-black/3 px-4 py-3 text-sm font-medium text-black"
                  >
                    {type}
                  </div>
                ))}
              </div>
            </div>

            <div className="panel-strong reveal reveal-delay-4 rounded-[38px] p-6 sm:p-8">
              <p className="text-xs uppercase tracking-[0.24em] text-white/60">Beneficio comercial</p>
              <p className="mt-3 text-2xl font-semibold leading-tight">
                Está listo para venderse como servicio profesional para eventos.
              </p>
              <p className="mt-4 text-sm leading-7 text-white/72">
                El valor está en la experiencia completa: QR, landing, moderación, edición y galería
                viva con una estética monocromática moderna.
              </p>
            </div>
          </aside>
        </section>

        <section className="panel reveal reveal-delay-4 mt-6 rounded-[38px] p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">Ventajas</p>
              <h2 className="mt-2 text-3xl font-semibold text-black">Lo que hace fuerte al producto</h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-[var(--app-muted)]">
              La landing debe vender claridad, rapidez y control. Aquí la app se explica como una
              solución completa para eventos con fotos en vivo.
            </p>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {benefits.slice(4).map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="rounded-[26px] border border-[var(--app-border)] bg-white p-5">
                  <Icon className="h-5 w-5 text-black" />
                  <h3 className="mt-4 text-base font-semibold text-black">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">{item.body}</p>
                </article>
              );
            })}
          </div>

          <div className="mt-7 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {featureNotes.map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-[26px] border border-[var(--app-border)] bg-black/3 p-4"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-black" />
                <p className="text-sm leading-6 text-black">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.94fr_1.06fr]">
          <div className="panel reveal rounded-[38px] p-6 sm:p-8 lg:p-10">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">Plantillas</p>
            <h2 className="mt-2 text-3xl font-semibold text-black">Personalización por evento</h2>
            <p className="mt-4 text-sm leading-7 text-[var(--app-muted)]">
              Cada evento puede tener una estructura y una identidad propias, sin perder la claridad
              visual del sistema.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {templates.map((item, index) => (
                <div key={item} className={`rounded-[24px] border border-[var(--app-border)] p-4 ${index % 2 === 0 ? "bg-white" : "bg-black/3"}`}>
                  <p className="text-sm font-semibold text-black">{item}</p>
                  <p className="mt-1 text-xs text-[var(--app-muted)]">Se puede adaptar como estilo base del landing.</p>
                </div>
              ))}
            </div>
          </div>

          <div className="panel reveal reveal-delay-1 rounded-[38px] p-6 sm:p-8 lg:p-10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">Herramienta</p>
                <h2 className="mt-2 text-2xl font-semibold text-black">Admin preparado para operar</h2>
              </div>
              <div className="rounded-full border border-[var(--app-border)] bg-white p-3">
                <LayoutDashboard className="h-5 w-5 text-black" />
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                "Crear eventos personalizados",
                "Cambiar landing por evento",
                "Aprobar o rechazar fotos",
                "Editar URL y QR",
              ].map((item) => (
                <div key={item} className="rounded-[24px] border border-[var(--app-border)] bg-white p-4 text-sm text-black">
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[28px] border border-[var(--app-border)] bg-black p-6 text-white">
              <p className="text-xs uppercase tracking-[0.24em] text-white/60">Resultado</p>
              <p className="mt-3 text-lg leading-8 text-white/90">
                Una landing que no solo informa, sino que también impulsa participación y genera
                contenido en vivo para cada evento.
              </p>
            </div>
          </div>
        </section>

        <section className="panel reveal reveal-delay-4 mt-6 rounded-[38px] p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">FAQ</p>
              <h2 className="mt-2 text-3xl font-semibold text-black">Preguntas frecuentes</h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-[var(--app-muted)]">
              Una sección como la de la competencia ayuda a resolver dudas rápido y aumenta confianza.
            </p>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-2">
            {faq.map((item) => (
              <article key={item.q} className="rounded-[28px] border border-[var(--app-border)] bg-white p-5">
                <p className="text-base font-semibold text-black">{item.q}</p>
                <p className="mt-3 text-sm leading-7 text-[var(--app-muted)]">{item.a}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel reveal reveal-delay-4 mt-6 rounded-[38px] p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">Demo</p>
              <h2 className="mt-2 text-3xl font-semibold text-black">La experiencia pública ya está lista para probarse</h2>
              <p className="mt-4 text-sm leading-7 text-[var(--app-muted)]">
                Abre el evento demo para ver cómo se siente la landing: limpia, rápida y enfocada en
                participación real.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <LinkButton href="/e/fiesta-luna" tone="secondary">
                Ver evento demo
                <ChevronRight className="h-4 w-4" />
              </LinkButton>
              <LinkButton href="/admin" tone="primary">
                Ir al admin
              </LinkButton>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
