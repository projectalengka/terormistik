"use client";

import * as React from "react";
import { Database, LogOut, Shield, Trash2, TriangleAlert, User } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/feedback";
import { ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useData } from "@/components/providers/data-provider";
import { idbClearAll, idbStorageEstimate } from "@/lib/data/db";
import { formatBytes, formatDate } from "@/lib/utils";

export default function AccountSettingsPage() {
  const { profile, mode, email, repo, refreshProfile, signOut } = useData();
  const toast = useToast();

  const [displayName, setDisplayName] = React.useState("");
  const [penName, setPenName] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [confirmWipe, setConfirmWipe] = React.useState(false);
  const [storage, setStorage] = React.useState<{ usage: number; quota: number } | null>(null);

  React.useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name ?? "");
    setPenName(profile.pen_name ?? "");
    setBio(profile.bio ?? "");
  }, [profile]);

  React.useEffect(() => {
    if (mode !== "local") return;
    void idbStorageEstimate().then(setStorage);
  }, [mode]);

  async function save() {
    setSaving(true);
    try {
      await repo.updateProfile({
        display_name: displayName.trim(),
        pen_name: penName.trim(),
        bio: bio.trim(),
      });
      await refreshProfile();
      toast.success("Profil tersimpan.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan profil.");
    } finally {
      setSaving(false);
    }
  }

  async function wipeLocal() {
    await idbClearAll();
    toast.success("Seluruh data lokal dihapus.");
    window.location.reload();
  }

  return (
    <>
      <PageHeader
        eyebrow="Account Settings"
        title={
          <>
            Identitas <span className="italic text-[#C7B9A3]">pemilik arsip.</span>
          </>
        }
        description="Nama yang muncul di cover, penanda tangan naskah, dan pengaturan penyimpanan."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <section className="rounded-[5px] border border-line bg-[#15151B] p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <User className="h-4 w-4 text-[#7A7266]" />
              <h2 className="font-serif text-[19px] text-parchment">Profil Penulis</h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Nama tampilan">
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Nama Anda"
                  />
                </Field>
                <Field label="Nama pena" hint="untuk cover">
                  <Input
                    value={penName}
                    onChange={(e) => setPenName(e.target.value)}
                    placeholder="Nama yang tercetak di cover"
                  />
                </Field>
              </div>

              <Field label="Bio singkat" hint="opsional">
                <Textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Satu kalimat tentang Anda dan cerita-cerita yang Anda kumpulkan."
                />
              </Field>

              <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
                <p className="text-[11px] text-faint">
                  {mode === "supabase" && email ? `Masuk sebagai ${email}` : "Mode lokal — tanpa akun"}
                </p>
                <Button variant="primary" onClick={() => void save()} loading={saving}>
                  Simpan Perubahan
                </Button>
              </div>
            </div>
          </section>

          <section className="rounded-[5px] border border-line bg-[#15151B] p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2.5">
              <Database className="h-4 w-4 text-[#7A7266]" />
              <h2 className="font-serif text-[19px] text-parchment">Penyimpanan</h2>
              <Badge tone={mode === "supabase" ? "success" : "warn"} className="ml-auto">
                {mode === "supabase" ? "Supabase" : "Lokal"}
              </Badge>
            </div>

            {mode === "supabase" ? (
              <div className="space-y-2 text-[11.5px] leading-relaxed text-muted">
                <p>
                  Data tersimpan di PostgreSQL Supabase dengan Row Level Security. Hanya pemilik yang
                  dapat membaca koleksi ini, termasuk melalui API.
                </p>
                <p className="text-faint">
                  Media (audio, video, cover) disimpan di Supabase Storage dan diakses melalui signed
                  URL berumur pendek.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[11.5px] leading-relaxed text-muted">
                  Data tersimpan di IndexedDB peramban ini. Tidak ada yang dikirim ke server kecuali
                  permintaan AI yang Anda jalankan sendiri.
                </p>
                {storage && (
                  <div>
                    <div className="mb-1 flex justify-between text-[10.5px] text-faint">
                      <span>Terpakai {formatBytes(storage.usage)}</span>
                      <span>Kuota {formatBytes(storage.quota)}</span>
                    </div>
                    <div className="h-[3px] overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full bg-accent"
                        style={{
                          width: `${storage.quota ? Math.min(100, (storage.usage / storage.quota) * 100) : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
                <p className="rounded-[3px] border border-[#4E3F2A] bg-[#1C1A14] px-3 py-2 text-[10.5px] leading-relaxed text-[#C9B08A]">
                  Data lokal hanya ada di perangkat ini. Ekspor backup secara berkala dari halaman
                  Archive &amp; Backup.
                </p>
              </div>
            )}
          </section>

          {mode === "supabase" ? (
            <section className="rounded-[5px] border border-line bg-[#15151B] p-4 sm:p-5">
              <h2 className="mb-3 font-serif text-[19px] text-parchment">Sesi</h2>
              <p className="mb-4 text-[11.5px] leading-relaxed text-muted">
                Keluar akan mengakhiri sesi di perangkat ini. Data tetap tersimpan di server.
              </p>
              <Button variant="secondary" onClick={() => void signOut()}>
                <LogOut className="h-4 w-4" /> Keluar dari Akun
              </Button>
            </section>
          ) : (
            <section className="rounded-[5px] border border-[#5A2B2B]/60 bg-[#171214] p-4 sm:p-5">
              <div className="mb-2 flex items-center gap-2">
                <TriangleAlert className="h-4 w-4 text-[#D98A8A]" />
                <h2 className="font-serif text-[19px] text-[#E7BFBF]">Zona berbahaya</h2>
              </div>
              <p className="mb-4 text-[11.5px] leading-relaxed text-[#B98F8F]">
                Menghapus data lokal akan menghilangkan seluruh cerita, bab, catatan, dan media dari
                peramban ini. Ekspor backup terlebih dahulu — tindakan ini tidak dapat dibatalkan.
              </p>
              <Button variant="danger" onClick={() => setConfirmWipe(true)}>
                <Trash2 className="h-4 w-4" /> Hapus Semua Data Lokal
              </Button>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="rounded-[5px] border border-line bg-[#15151B] p-4">
            <div className="mb-3 flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 text-[#6FA37F]" />
              <p className="eyebrow">Privasi</p>
            </div>
            <ul className="space-y-2.5 text-[11px] leading-relaxed text-[#9A9082]">
              <li>· Tidak ada halaman publik. Seluruh rute memerlukan sesi pemilik.</li>
              <li>· Row Level Security membatasi setiap baris pada satu pemilik.</li>
              <li>· API key AI tidak pernah meninggalkan server.</li>
              <li>· Naskah tidak dikirim ke penyedia AI kecuali Anda menekan aksi AI.</li>
              <li>· Pencarian mesin tidak diizinkan (noindex).</li>
            </ul>
          </div>

          <div className="rounded-[5px] border border-line bg-[#15151B] p-4">
            <p className="eyebrow mb-2">Detail</p>
            <dl className="space-y-2 text-[11px]">
              <div className="flex justify-between gap-3">
                <dt className="text-faint">Mode data</dt>
                <dd className="text-[#C9BFAF]">{mode === "supabase" ? "Supabase" : "Lokal"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-faint">Dibuat</dt>
                <dd className="text-[#C9BFAF]">{formatDate(profile?.created_at)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-faint">Versi</dt>
                <dd className="text-[#C9BFAF]">1.0.0</dd>
              </div>
            </dl>
          </div>

          {mode === "local" && (
            <div className="rounded-[5px] border border-line bg-[#111116] p-4">
              <p className="eyebrow mb-2">Menghubungkan Supabase</p>
              <ol className="space-y-2 text-[10.5px] leading-relaxed text-[#8A8073]">
                <li>1. Buat proyek di supabase.com.</li>
                <li>2. Jalankan supabase/schema.sql di SQL Editor.</li>
                <li>3. Salin URL dan anon key ke .env.local.</li>
                <li>4. Buat user owner lewat Authentication.</li>
                <li>5. Mulai ulang server.</li>
              </ol>
              <p className="mt-3 text-[10px] leading-relaxed text-faint">
                Panduan lengkap tersedia di README.md dan docs/INSTALLATION.md.
              </p>
            </div>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={confirmWipe}
        onClose={() => setConfirmWipe(false)}
        title="Hapus seluruh data lokal?"
        message="Semua cerita, bab, catatan, versi, dan media di peramban ini akan dihapus permanen. Pastikan Anda sudah mengekspor backup."
        confirmLabel="Ya, hapus semua"
        onConfirm={wipeLocal}
      />
    </>
  );
}
