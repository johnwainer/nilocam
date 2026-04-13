import { BrandMark } from "@/components/brand-mark";
import { LinkButton } from "@/components/button";
import {
  Camera,
  CheckCircle2,
  ChevronRight,
  LayoutDashboard,
  ScanFace,
  ShieldCheck,
  Sparkles,
  Smartphone,
  Upload,
  Wifi,
} from "lucide-react";

const productStats = [
  { value: "PWA", label: "sin instalación" },
  { value: "QR", label: "por evento" },
  { value: "Live", label: "galería en tiempo real" },
  { value: "10", label: "tipos de eventos" },
];

const benefits = [
  {
    icon: Smartphone,
    title: "Funciona en Android y iPhone",
    body: "La persona entra desde el QR y usa la app en el navegador, sin descargar nada.",
  },
  {
    icon: Camera,
    title: "Tomar o subir fotos",
    body: "El evento permite capturar con cámara o elegir imágenes del teléfono con un flujo muy simple.",
  },
  {
    icon: LayoutDashboard,
    title: "Admin operativo",
    body: "El dueño del evento puede crear, editar y organizar landing, accesos y fotos desde un panel claro.",
  },
  {
    icon: ShieldCheck,
    title: "Moderación flexible",
    body: "Cada evento define si las fotos se publican de inmediato o pasan por revisión antes de salir al muro.",
  },
  {
    icon: Wifi,
    title: "Actualización en vivo",
    body: "Las fotos publicadas aparecen al instante dentro del landing del evento.",
  },
  {
    icon: Upload,
    title: "Experiencia guiada",
    body: "Los llamados a la acción están pensados para que nadie se quede sin saber qué hacer.",
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

const workflow = [
  {
    step: "01",
    title: "Escanear",
    body: "Cada evento tiene un QR único y una URL corta para compartir en pantalla, mesa o impresión.",
  },
  {
    step: "02",
    title: "Participar",
    body: "El invitado toma o sube una foto desde una landing limpia, moderna y optimizada para móviles.",
  },
  {
    step: "03",
    title: "Editar",
    body: "Antes de publicar, la foto puede pasar por filtros y plantillas para verse mejor dentro del evento.",
  },
  {
    step: "04",
    title: "Publicar en vivo",
    body: "La foto entra al muro del evento y se ve destacada al instante para que el landing siempre tenga actividad.",
  },
];

const platformBenefits = [
  "Landing personalizable por evento",
  "Fondo blanco y experiencia monocromática",
  "Marca con logo del gato espía",
  "Secciones editables desde admin",
  "Galería destacada en tiempo real",
  "Moderación o publicación directa",
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-clip bg-white">
      <section className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="panel reveal rounded-[32px] px-5 py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <BrandMark />
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--app-muted)]">
              <span className="rounded-full border border-[var(--app-border)] bg-black/3 px-3 py-1.5">
                PWA para eventos
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

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="panel reveal reveal-delay-1 rounded-[40px] p-6 sm:p-8 lg:p-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--app-border)] bg-black/3 px-4 py-2 text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">
              <Sparkles className="h-3.5 w-3.5" />
              Nilo Cam
            </div>

            <h1 className="mt-6 max-w-4xl font-[family-name:var(--font-space-grotesk)] text-5xl font-semibold leading-[0.96] tracking-tight text-black sm:text-6xl lg:text-[5.5rem]">
              Una plataforma moderna para fotos de eventos con QR, landing y muro en vivo.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--app-muted)] sm:text-lg">
              Nilo Cam está diseñada para ofrecer un servicio profesional: los invitados entran
              desde el teléfono, toman o suben fotos, las editan, y el evento las muestra en tiempo
              real dentro de una landing limpia y fácil de usar.
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
              {productStats.map((stat) => (
                <div key={stat.label} className="rounded-[26px] border border-[var(--app-border)] bg-white p-4">
                  <p className="text-2xl font-semibold text-black">{stat.value}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--app-muted)]">{stat.label}</p>
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
          </section>

          <aside className="space-y-6">
            <div className="panel reveal reveal-delay-2 rounded-[40px] p-6 sm:p-8">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">Flujo del usuario</p>
                  <h2 className="mt-2 text-2xl font-semibold text-black">Simple para invitados</h2>
                </div>
                <div className="rounded-full border border-[var(--app-border)] bg-white p-3">
                  <ScanFace className="h-5 w-5 text-black" />
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {workflow.map((item) => (
                  <div
                    key={item.step}
                    className="flex gap-4 rounded-[26px] border border-[var(--app-border)] bg-white p-4"
                  >
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

            <div className="panel reveal reveal-delay-3 rounded-[40px] p-6 sm:p-8">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">Tipos de evento</p>
              <h2 className="mt-2 text-2xl font-semibold text-black">10 plantillas iniciales</h2>
              <div className="snap-scroll mt-5 flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
                {eventTypes.map((type) => (
                  <div
                    key={type}
                    className="min-w-[168px] snap-start rounded-[24px] border border-[var(--app-border)] bg-black/3 px-4 py-3 text-sm font-medium text-black"
                  >
                    {type}
                  </div>
                ))}
              </div>
            </div>

            <div className="panel-strong reveal reveal-delay-4 rounded-[40px] p-6 sm:p-8">
              <p className="text-xs uppercase tracking-[0.24em] text-white/60">Beneficio comercial</p>
              <p className="mt-3 text-2xl font-semibold leading-tight">
                Está lista para venderse como un servicio profesional de fotos para eventos.
              </p>
              <p className="mt-4 text-sm leading-7 text-white/72">
                El diseño prioriza claridad, confianza y rapidez para que el cliente entienda qué
                compra y el invitado entienda qué hacer en menos de 10 segundos.
              </p>
            </div>
          </aside>
        </div>

        <section className="panel reveal reveal-delay-4 mt-6 rounded-[40px] p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">Beneficios</p>
              <h2 className="mt-2 text-3xl font-semibold text-black">Lo que hace valiosa la app</h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-[var(--app-muted)]">
              La propuesta se centra en experiencia, control y velocidad: tomar o subir fotos,
              moderarlas, mostrarlas en vivo y personalizar la landing por evento.
            </p>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {benefits.slice(4).map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="rounded-[28px] border border-[var(--app-border)] bg-white p-5"
                >
                  <Icon className="h-5 w-5 text-black" />
                  <h3 className="mt-4 text-base font-semibold text-black">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">{item.body}</p>
                </article>
              );
            })}
            {platformBenefits.map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-[28px] border border-[var(--app-border)] bg-black/3 p-5"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-black" />
                <p className="text-sm leading-6 text-black">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="panel reveal reveal-delay-4 mt-6 rounded-[40px] p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">Interfaz</p>
              <h2 className="mt-2 text-3xl font-semibold text-black">Pensada para verse limpia y profesional</h2>
            </div>
            <LinkButton href="/e/fiesta-luna" tone="secondary">
              Probar demo
              <ChevronRight className="h-4 w-4" />
            </LinkButton>
          </div>

          <div className="mt-7 grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-[32px] border border-[var(--app-border)] bg-white p-6">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">Landing pública</p>
              <p className="mt-3 text-sm leading-7 text-[var(--app-muted)]">
                Un home por evento con CTA visibles, info clara, secciones editables y un mural que
                muestra la actividad del momento.
              </p>
            </div>
            <div className="rounded-[32px] border border-[var(--app-border)] bg-black/3 p-6">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">Admin</p>
              <p className="mt-3 text-sm leading-7 text-[var(--app-muted)]">
                Un panel para crear eventos, cambiar el landing, moderar fotos y controlar la URL que
                se convierte en QR.
              </p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
