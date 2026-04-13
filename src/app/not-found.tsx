import { BrandMark } from "@/components/brand-mark";
import { LinkButton } from "@/components/button";

export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-screen max-w-2xl place-items-center px-4 text-center">
      <div className="panel rounded-[34px] p-8">
        <div className="flex justify-center">
          <BrandMark />
        </div>
        <h1 className="mt-6 text-4xl font-semibold text-black">Evento no encontrado</h1>
        <p className="mt-3 text-sm leading-7 text-[var(--app-muted)]">
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
