"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { cn } from "@/lib/utils";

const safeName = (n: string) => n.replace(/[^\w.\-؀-ۿ]+/g, "_").slice(-80) || "file";

/** Uploads one file and hands back its URL. Falls back to a pasted link when storage is not configured. */
export function useUpload(folder: string) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function send(file: File): Promise<string | null> {
    setError(null);
    if (file.size > 100 * 1024 * 1024) {
      setError("الملف أكبر من 100 ميجا. ارفعه على Google Drive وحط الرابط.");
      return null;
    }
    setBusy(true);
    try {
      const blob = await upload(`${folder}/${safeName(file.name)}`, file, { access: "public", handleUploadUrl: "/api/upload", multipart: file.size > 8 * 1024 * 1024 });
      return blob.url;
    } catch {
      setError("ما قدرنا نرفع الملف. جرّب مرة ثانية أو حط رابط بداله.");
      return null;
    } finally {
      setBusy(false);
    }
  }
  return { send, busy, error };
}

/**
 * A URL field for deliveries: upload a file, or paste a link (Drive, Figma, a live site).
 * The form always submits a URL under `name`.
 */
export function UploadField({ name, uploads, folder, placeholder, required, defaultValue }: { name: string; uploads: boolean; folder: string; placeholder?: string; required?: boolean; defaultValue?: string }) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [fileName, setFileName] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const { send, busy, error } = useUpload(folder);
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          name={name}
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setFileName(null);
          }}
          required={required}
          dir="ltr"
          inputMode="url"
          placeholder={placeholder ?? "https://"}
          className="h-11 w-full rounded-xl bg-white px-3.5 text-[15px] ring-1 ring-sand-300 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        {uploads && (
          <>
            <input
              ref={input}
              type="file"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const u = await send(f);
                if (u) {
                  setUrl(u);
                  setFileName(f.name);
                }
                e.target.value = "";
              }}
            />
            <button type="button" disabled={busy} onClick={() => input.current?.click()} className={cn("h-11 shrink-0 rounded-xl bg-white px-4 text-sm font-semibold text-brand-800 ring-1 ring-sand-300 hover:bg-sand-100", busy && "opacity-60")}>
              {busy ? "يرفع…" : "ارفع ملف"}
            </button>
          </>
        )}
      </div>
      {fileName && <p className="text-xs text-emerald-700">✓ انرفع: {fileName}</p>}
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
