"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getQueuedUploads, removeQueuedUpload } from "@/lib/upload-queue";
import { publicStorageUrl } from "@/lib/utils";
import type { EventRecord, PhotoRecord } from "@/types";

const EVENT_BUCKET = "event-photos";

export function OfflineUploadProcessor({
  event,
  onUploaded,
}: {
  event: EventRecord;
  onUploaded?: (photo: PhotoRecord) => void;
}) {
  const supabase = createSupabaseBrowserClient();
  const [status, setStatus] = useState<"idle" | "uploading" | "done">("idle");
  const [total, setTotal] = useState(0);
  const [done, setDone] = useState(0);
  const [succeeded, setSucceeded] = useState(0);
  const processingRef = useRef(false);

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;

    const items = await getQueuedUploads(event.id).catch(() => []);
    if (items.length === 0) return;

    processingRef.current = true;
    setStatus("uploading");
    setTotal(items.length);
    setDone(0);

    let ok = 0;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        const { error: uploadErr } = await supabase.storage
          .from(EVENT_BUCKET)
          .upload(item.path, item.blob, {
            contentType: "image/jpeg",
            upsert: false,
            cacheControl: "3600",
          });
        // "already exists" means a previous retry uploaded it — treat as success
        if (uploadErr && !uploadErr.message.toLowerCase().includes("already exists")) {
          throw uploadErr;
        }

        const storageUrl = publicStorageUrl(item.path);

        if (item.moderationMode === "auto") {
          const { data, error: insertErr } = await supabase
            .from("photos")
            .insert(item.payload)
            .select("*")
            .single();
          if (insertErr) throw insertErr;
          onUploaded?.({ ...data, public_url: storageUrl } as PhotoRecord);
        } else {
          const { error: insertErr } = await supabase.from("photos").insert(item.payload);
          if (insertErr) throw insertErr;
        }

        await removeQueuedUpload(item.id);
        ok++;
      } catch {
        // Leave in queue — will retry on next online event
      }
      setDone(i + 1);
    }

    setSucceeded(ok);
    setStatus(ok > 0 ? "done" : "idle");
    processingRef.current = false;

    if (ok > 0) setTimeout(() => setStatus("idle"), 4000);
  }, [event.id, supabase, onUploaded]);

  useEffect(() => {
    processQueue();
    window.addEventListener("online", processQueue);
    const onVisible = () => {
      if (document.visibilityState === "visible") processQueue();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", processQueue);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [processQueue]);

  if (status === "idle") return null;

  return (
    <div style={s.banner}>
      {status === "uploading" ? (
        <>
          <span style={s.spinner} />
          <span>
            Subiendo foto{total > 1 ? "s" : ""} guardada{total > 1 ? "s" : ""}…{" "}
            <strong>{done}/{total}</strong>
          </span>
        </>
      ) : (
        <>
          <span style={s.check}>✓</span>
          <span>
            {succeeded} foto{succeeded > 1 ? "s" : ""} subida{succeeded > 1 ? "s" : ""} correctamente
          </span>
        </>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  banner: {
    position: "fixed",
    bottom: 20,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 9990,
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "11px 20px",
    borderRadius: 999,
    background: "rgba(15,23,42,0.95)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#fff",
    fontSize: 14,
    fontWeight: 500,
    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
    whiteSpace: "nowrap",
  },
  spinner: {
    display: "inline-block",
    width: 14,
    height: 14,
    borderRadius: "50%",
    border: "2px solid rgba(255,255,255,0.25)",
    borderTopColor: "#fff",
    animation: "spin 0.7s linear infinite",
    flexShrink: 0,
  },
  check: {
    color: "#4ade80",
    fontWeight: 700,
    fontSize: 15,
  },
};
