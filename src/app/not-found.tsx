import { LinkButton } from "@/components/button";

export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-screen max-w-2xl place-items-center px-4 text-center">
      <div className="glass-card rounded-[34px] p-8">
        <p className="text-xs uppercase tracking-[0.24em] text-white/45">Nilo Cam</p>
        <h1 className="mt-4 text-4xl font-bold text-white">Evento no encontrado</h1>
        <p className="mt-3 text-sm leading-7 text-white/65">
          Revisamos el enlace y no encontramos un evento con ese QR o slug.
        </p>
        <div className="mt-6 flex justify-center">
          <LinkButton href="/" tone="primary">
            Volver al inicio
          </LinkButton>
        </div>
      </div>
    </main>
  );
}

