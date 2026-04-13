import { QRCodeSVG } from "qrcode.react";
import { Copy, Link2, ScanLine } from "lucide-react";
import { Button } from "@/components/button";

type Props = {
  url: string;
  label: string;
  onCopy?: (value: string) => void;
};

export function QRCodeCard({ url, label, onCopy }: Props) {
  return (
    <div className="glass-card rounded-[28px] p-5">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-white/10 p-3">
          <ScanLine className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">QR del evento</p>
          <p className="text-xs text-white/60">{label}</p>
        </div>
      </div>

      <div className="mt-5 grid place-items-center rounded-[24px] bg-white p-5">
        <QRCodeSVG value={url} size={176} bgColor="#ffffff" fgColor="#0a0f1d" />
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/50">
              <Link2 className="h-3.5 w-3.5" />
              URL pública
            </p>
            <p className="mt-1 truncate text-sm text-white">{url}</p>
          </div>
          <Button
            tone="soft"
            className="shrink-0 px-3 py-2"
            onClick={() => onCopy?.(url)}
          >
            <Copy className="h-4 w-4" />
            Copiar
          </Button>
        </div>
      </div>
    </div>
  );
}

