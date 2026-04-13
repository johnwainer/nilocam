import { LinkButton } from "@/components/button";
import { Camera, ShieldCheck, Sparkles, Wifi } from "lucide-react";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="glass-card rounded-[38px] p-7 sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.24em] text-white/60">
            <Sparkles className="h-3.5 w-3.5" />
            Nilo Cam
          </div>
          <h1 className="mt-5 max-w-3xl font-[family-name:var(--font-space-grotesk)] text-5xl font-bold leading-[0.95] text-white sm:text-7xl">
            Fotos en vivo para eventos con QR, landing y admin.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/70">
            Un sistema PWA que abre desde Android o iPhone sin instalar nada. Cada evento tiene su
            URL, su QR, su landing personalizable y una galería que se actualiza en tiempo real.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton href="/admin" tone="primary">
              Entrar al admin
            </LinkButton>
            <LinkButton href="/e/fiesta-luna" tone="secondary">
              Ver ejemplo en vivo
            </LinkButton>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              {
                title: "PWA",
                body: "Sin instalación, pensado para móvil y QR.",
                icon: Wifi,
              },
              {
                title: "Fotos",
                body: "Tomar, subir, editar y publicar con filtros.",
                icon: Camera,
              },
              {
                title: "Moderación",
                body: "Directo o con aprobación del dueño del evento.",
                icon: ShieldCheck,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-[28px] border border-white/10 bg-white/5 p-4">
                  <Icon className="h-5 w-5 text-white/75" />
                  <p className="mt-4 text-sm font-semibold text-white">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-white/60">{item.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        <aside className="glass-card rounded-[38px] p-7 sm:p-10">
          <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-white/10 to-transparent p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-white/45">Flujo</p>
            <div className="mt-5 space-y-4">
              {[
                "Escaneas el QR y entras al evento.",
                "Tomas o subes una foto.",
                "Le aplicas filtro o plantilla.",
                "La foto aparece en el muro en vivo.",
                "El admin decide si publica directo o con moderación.",
              ].map((step, index) => (
                <div key={step} className="flex gap-3 rounded-[22px] border border-white/10 bg-black/15 p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-sm font-bold text-white">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-6 text-white/75">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-[32px] border border-white/10 bg-white/5 p-6">
            <p className="text-sm font-semibold text-white">Tipos iniciales</p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-white/65">
              {[
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
              ].map((type) => (
                <div key={type} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                  {type}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
