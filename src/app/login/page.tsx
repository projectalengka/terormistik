"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, KeyRound, Mail } from "lucide-react";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Sigil } from "@/components/shell/sigil";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { APP_TAGLINE } from "@/lib/constants";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const configured = isSupabaseConfigured();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError(
          authError.message === "Invalid login credentials"
            ? "Email atau kata sandi tidak sesuai."
            : authError.message
        );
        return;
      }
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal masuk.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    if (!email) {
      setError("Masukkan email terlebih dahulu untuk menerima tautan pemulihan.");
      return;
    }
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (resetError) setError(resetError.message);
      else setNotice("Tautan pemulihan telah dikirim. Periksa kotak masuk email Anda.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim tautan pemulihan.");
    }
  }

  if (!configured) {
    return (
      <div className="w-full max-w-md">
        <div className="mb-8">
          <p className="eyebrow mb-3">Mode Lokal Aktif</p>
          <h1 className="display text-[38px] text-parchment">
            Arsip berjalan
            <br />
            <span className="italic text-[#C7B9A3]">di perangkat ini.</span>
          </h1>
          <p className="mt-4 text-[13.5px] leading-relaxed text-muted">
            Supabase belum dikonfigurasi, jadi TEROR MISTIK berjalan dalam mode lokal: seluruh cerita
            disimpan di penyimpanan peramban perangkat ini. Untuk sinkronisasi cloud, autentikasi
            owner, dan penyimpanan media permanen, isi kredensial Supabase pada{" "}
            <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[12px] text-[#D8CBB6]">
              .env.local
            </code>
            .
          </p>
        </div>
        <div className="space-y-3">
          <Button variant="primary" size="lg" className="w-full" onClick={() => router.replace("/dashboard")}>
            Masuk ke Studio <ArrowRight className="h-4 w-4" />
          </Button>
          <p className="text-center text-[11.5px] leading-relaxed text-faint">
            Data lokal dapat diekspor kapan saja melalui Archive &amp; Backup.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm">
      <div className="mb-9">
        <p className="eyebrow mb-3">Akses Terbatas</p>
        <h1 className="display text-[38px] text-parchment">
          Masuk ke
          <br />
          <span className="italic text-[#C7B9A3]">arsip pribadi.</span>
        </h1>
        <p className="mt-3 text-[13px] leading-relaxed text-muted">
          Hanya pemilik yang dapat membuka koleksi ini.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className="pl-9"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="password">Kata Sandi</Label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
            <Input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-[3px] border border-[#5A2B2B] bg-[#221618] px-3 py-2 text-[12px] text-[#E7BFBF]">
          {error}
        </p>
      )}
      {notice && (
        <p className="mt-4 rounded-[3px] border border-[#2F4E3B] bg-[#182219] px-3 py-2 text-[12px] text-[#C6DCC9]">
          {notice}
        </p>
      )}

      <Button type="submit" variant="primary" size="lg" loading={busy} className="mt-6 w-full">
        Masuk <ArrowRight className="h-4 w-4" />
      </Button>

      <button
        type="button"
        onClick={handleReset}
        className="mt-4 w-full text-center text-[11.5px] text-faint transition-colors hover:text-muted"
      >
        Lupa kata sandi?
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen bg-base">
      {/* Atmospheric panel */}
      <div className="relative hidden w-[46%] overflow-hidden border-r border-line lg:block">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-70"
          style={{
            backgroundImage:
              "radial-gradient(120% 90% at 30% 20%, rgba(168,50,50,0.16), transparent 60%), radial-gradient(90% 70% at 80% 90%, rgba(120,110,90,0.12), transparent 65%), linear-gradient(160deg, #14141A 0%, #0B0B0E 100%)",
          }}
        />
        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <Sigil className="h-6 w-6 text-accent-soft" />
            <span className="font-serif text-[16px] tracking-[0.3em] text-parchment">TEROR MISTIK</span>
          </div>

          <div className="max-w-sm">
            <p className="font-serif text-[30px] leading-[1.25] text-[#DCD0BC]">
              &ldquo;{APP_TAGLINE}&rdquo;
            </p>
            <div className="mt-8 h-px w-16 bg-accent/60" />
            <p className="mt-6 text-[11px] uppercase leading-relaxed tracking-[0.2em] text-faint">
              Personal archive · AI writing studio
              <br />
              Voice to text · Digital library
            </p>
          </div>

          <p className="text-[10px] uppercase tracking-[0.22em] text-[#4E4940]">
            Privat · Tanpa akses publik
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="relative flex flex-1 items-center justify-center px-6 py-16 sm:px-10">
        <div
          className="pointer-events-none absolute inset-0 lg:hidden"
          style={{
            backgroundImage:
              "radial-gradient(100% 60% at 50% 0%, rgba(168,50,50,0.10), transparent 60%)",
          }}
        />
        <div className="relative w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <Sigil className="h-5 w-5 text-accent-soft" />
            <span className="font-serif text-[14px] tracking-[0.3em] text-parchment">
              TEROR MISTIK
            </span>
          </div>
          <Suspense
            fallback={<div className="h-40 w-full animate-pulse rounded-[4px] bg-white/[0.03]" />}
          >
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
