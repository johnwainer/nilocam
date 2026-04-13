import { BrandMark } from "@/components/brand-mark";
import { LinkButton } from "@/components/button";
import { Camera, ChevronRight, ScanFace, ShieldCheck, Sparkles, Upload, Wifi } from "lucide-react";

const stats = [
  { value: "PWA", label: "sin instalación" },
  { value: "QR", label: "por evento" },
  { value: "Live", label: "fotos en vivo" },
  { value: "10", label: "tipos listos" },
];

const featureCards = [
  {
    icon: Wifi,
    title: "Un producto que sí parece listo para vender",
    body: "Landing pública, admin funcional, QR único y flujo simple para invitados. Todo pensado para operación real.",
  },
  {
    icon: Camera,
    title: "Las fotos entran al muro al instante",
    body: "Cada foto puede publicarse directo o pasar por moderación. El evento siempre se ve activo y ordenado.",
  },
  {
    icon: ShieldCheck,
    title: "Diseñado para Android y iPhone",
    body: "Se abre desde el QR sin fricción, en un navegador moderno, sin descargar apps ni registrar cuentas.",
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

const flowSlides = [
  {
    step: "01",
    title: "Escanea el QR",
    body: "Cada evento tiene una URL corta y un QR limpio para compartir en mesas, pantallas o impresos.",
  },
  {
    step: "02",
    title: "Toma o sube fotos",
    body: "La landing abre cámara o galería con CTAs grandes y claros para que nadie se pierda.",
  },
  {
    step: "03",
    title: "Edita antes de publicar",
    body: "Filtros, plantillas y un editor ligero para que la foto salga con mejor presencia.",
  },
  {
    step: "04",
    title: "Vívelo en tiempo real",
    body: "La galería se actualiza al instante y las fotos destacadas aparecen arriba del evento.",
  },
];

const productCards = [
  {
    title: "Landing editorial",
    body: "Secciones amplias, CTA repetidos, jerarquía clara y estructura personalizable por evento.",
  },
  {
    title: "Admin por secciones",
    body: "Eventos, identidad, landing, fotos y acceso en un panel operativo para el dueño del evento.",
  },
  {
    title: "Moderación flexible",
    body: "Publicación directa o revisión previa, según el tipo de evento y el nivel de control que quieras.",
  },
  {
    title: "Muro en vivo",
    body: "Las imágenes subidas se pueden destacar al instante para que el landing nunca se sienta vacío.",
  },
  {
    title: "Marca blanca",
    body: "El sistema puede adaptarse al branding del evento con logo, títulos, enlaces y visuales propios.",
  },
  {
    title: "Escala comercial",
    body: "Pensado para venderse como servicio a clientes, planners, marcas y productores de eventos.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <section className="mx-auto flex min-h-[100svh] w-full max-w-[1560px] flex-col px-4 py-4 sm:px-6 lg:px-10">
        <header className="panel reveal rounded-[32px] px-5 py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <BrandMark />
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--app-muted)]">
              <span className="rounded-full border border-[var(--app-border)] bg-black/3 px-3 py-1.5">
                Landing pública
              </span>
              <span className="rounded-full border border-[var(--app-border)] bg-black/3 px-3 py-1.5">
                Admin profesional
              </span>
              <span className="rounded-full border border-[var(--app-border)] bg-black/3 px-3 py-1.5">
                Fotos en vivo
              </span>
            </div>
          </div>
        </header>

        <div className="grid flex-1 gap-6 py-6 lg:grid-cols-[1.08fr_0.92fr] lg:py-8">
          <section className="panel reveal reveal-delay-1 flex flex-col justify-between rounded-[42px] p-7 sm:p-10 lg:p-12">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--app-border)] bg-black/3 px-4 py-2 text-xs uppercase tracking-[0.26em] text-[var(--app-muted)]">
                <Sparkles className="h-3.5 w-3.5" />
                Nilo Cam
              </div>

              <h1 className="mt-6 max-w-4xl font-[family-name:var(--font-space-grotesk)] text-6xl font-semibold leading-[0.92] tracking-tight text-black sm:text-7xl lg:text-[6.8rem]">
                La forma más elegante de capturar fotos de eventos desde un QR.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--app-muted)]">
                Una app profesional para compartir una landing moderna, tomar o subir fotos, editarlas
                en el momento y mostrarlas en vivo dentro del evento. Sin instalar nada. Sin fricción.
              </p>

              <div className="mt-10 flex flex-wrap gap-3">
                <LinkButton href="/admin" tone="primary">
                  Entrar al admin
                </LinkButton>
                <LinkButton href="/e/fiesta-luna" tone="secondary">
                  Ver demo en vivo
                </LinkButton>
              </div>

              <div className="mt-10 grid gap-3 sm:grid-cols-4">
                {stats.map((item) => (
                  <div key={item.label} className="rounded-[28px] border border-[var(--app-border)] bg-white p-4">
                    <p className="text-2xl font-semibold text-black">{item.value}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--app-muted)]">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {featureCards.map((item) => {
                const Icon = item.icon;
                return (
                <article
                  key={item.title}
                  className="rounded-[32px] border border-[var(--app-border)] bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.04)]"
                >
                  <Icon className="h-5 w-5 text-black" />
                  <p className="text-sm font-semibold text-black">{item.title}</p>
                  <p className="mt-3 text-sm leading-6 text-[var(--app-muted)]">{item.body}</p>
                </article>
                );
              })}
            </div>
          </section>

          <aside className="flex flex-col gap-6">
            <div className="panel reveal reveal-delay-2 rounded-[42px] p-7 sm:p-10">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">
                    Flujo del invitado
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-black">Simple, claro y bonito</h2>
                </div>
                <div className="rounded-full border border-[var(--app-border)] bg-white p-3">
                  <ScanFace className="h-5 w-5 text-black" />
                </div>
              </div>

              <div className="mt-7 space-y-4">
                {[
                  "Escanea el QR del evento desde cualquier teléfono.",
                  "Abre una landing que parece hecha a medida.",
                  "Toma una foto o súbela desde la galería.",
                  "Edita con filtro o plantilla antes de publicar.",
                ].map((step, index) => (
                  <div
                    key={step}
                    className="flex gap-4 rounded-[28px] border border-[var(--app-border)] bg-white p-5"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-xs font-semibold text-white">
                      {index + 1}
                    </div>
                    <p className="self-center text-sm leading-6 text-black">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel rounded-[42px] p-7 sm:p-10">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">
                    Tipos iniciales
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold text-black">10 eventos listos</h3>
                </div>
                <ChevronRight className="h-5 w-5 text-black/40" />
              </div>
              <div className="snap-scroll mt-5 flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
                {eventTypes.map((type) => (
                  <div
                    key={type}
                    className="min-w-[160px] snap-start shrink-0 rounded-[24px] border border-[var(--app-border)] bg-black/3 px-4 py-3 text-sm font-medium text-black"
                  >
                    {type}
                  </div>
                ))}
              </div>
            </div>

            <div className="panel-strong reveal reveal-delay-3 rounded-[42px] p-7 sm:p-10">
              <p className="text-xs uppercase tracking-[0.24em] text-white/60">Enfoque</p>
              <p className="mt-3 text-2xl font-semibold leading-tight">
                Aire editorial, blanco y negro, y una experiencia que se siente premium.
              </p>
              <p className="mt-4 text-sm leading-7 text-white/72">
                El producto está pensado para venderse como servicio: QR por evento, landing
                personalizable, flujo de fotos y una vista viva que hace que el evento se sienta activo.
              </p>
            </div>
          </aside>
        </div>

        <section className="panel reveal reveal-delay-4 rounded-[42px] p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">Qué incluye</p>
              <h2 className="mt-2 text-3xl font-semibold text-black">Un sistema listo para operar</h2>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-[var(--app-muted)]">
              La landing vende la app con claridad: captura fotos, edítalas, modéralas y publícalas
              en vivo para que el evento gane participación.
            </p>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {productCards.map((card, index) => (
              <article
                key={card.title}
                className={`rounded-[32px] border border-[var(--app-border)] p-6 ${
                  index % 3 === 0 ? "bg-white" : "bg-black/3"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-sm font-semibold text-white">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  {index === 0 && (
                    <span className="rounded-full border border-[var(--app-border)] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-black">
                      Core
                    </span>
                  )}
                </div>
                <h3 className="mt-5 text-xl font-semibold text-black">{card.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--app-muted)]">{card.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel reveal reveal-delay-4 mt-6 rounded-[42px] p-6 sm:p-8 lg:p-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">Slides</p>
              <h2 className="mt-2 text-3xl font-semibold text-black">La experiencia en 4 pasos</h2>
            </div>
            <p className="max-w-lg text-sm leading-6 text-[var(--app-muted)]">
              Esta banda horizontal explica el producto como una secuencia simple y comercial.
            </p>
          </div>

          <div className="snap-scroll mt-6 flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory">
            {flowSlides.map((card) => (
              <article
                key={card.title}
                className="min-w-[290px] snap-start shrink-0 rounded-[34px] border border-[var(--app-border)] bg-white p-6"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--app-muted)]">
                  Paso {card.step}
                </p>
                <h3 className="mt-5 text-xl font-semibold text-black">{card.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--app-muted)]">{card.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="panel reveal rounded-[42px] p-6 sm:p-8 lg:p-10">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">Modos</p>
            <h2 className="mt-2 text-3xl font-semibold text-black">Pensado para cada tipo de evento</h2>
            <p className="mt-4 text-sm leading-7 text-[var(--app-muted)]">
              Cada evento puede activar su propia estructura de landing, ajustar el tono visual y
              definir si las fotos se publican al instante o pasan por moderación.
            </p>
            <div className="mt-6 rounded-[32px] border border-[var(--app-border)] bg-black/3 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-black">
                <ShieldCheck className="h-4 w-4" />
                Control del evento
              </div>
              <p className="mt-3 text-sm leading-7 text-[var(--app-muted)]">
                Un mismo sistema sirve para un cumpleaños íntimo o para una activación corporativa con
                branding, QR y galería en vivo.
              </p>
            </div>
          </div>

          <div className="panel reveal reveal-delay-1 rounded-[42px] p-6 sm:p-8 lg:p-10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">
                  Arrastre horizontal
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-black">CTAs visibles todo el tiempo</h3>
              </div>
              <div className="rounded-full border border-[var(--app-border)] bg-white p-3">
                <Upload className="h-5 w-5 text-black" />
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                "Tomar foto ahora",
                "Subir desde galería",
                "Editar antes de publicar",
                "Ver el muro vivo",
              ].map((cta) => (
                <div
                  key={cta}
                  className="rounded-[26px] border border-[var(--app-border)] bg-white px-4 py-4 text-sm font-medium text-black"
                >
                  {cta}
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[32px] border border-[var(--app-border)] bg-black p-6 text-white">
              <p className="text-xs uppercase tracking-[0.24em] text-white/60">Resultado</p>
              <p className="mt-3 text-lg leading-8 text-white/90">
                Una landing que no solo se ve bien, sino que empuja a la gente a participar y generar
                contenido en tiempo real.
              </p>
            </div>
          </div>
        </section>

        <section className="panel reveal reveal-delay-4 mt-6 rounded-[42px] p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">Demo</p>
              <h2 className="mt-2 text-3xl font-semibold text-black">La demo ya funciona y muestra el flujo real</h2>
            </div>
            <LinkButton href="/e/fiesta-luna" tone="secondary">
              Abrir evento demo
            </LinkButton>
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--app-muted)]">
            La experiencia pública está pensada para que la persona entre, suba o tome una foto y vea
            el resultado en el momento, sin pasos extra ni pantallas pesadas.
          </p>
        </section>
      </section>
    </main>
  );
}
