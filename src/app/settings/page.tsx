'use client';
import { useEffect, useRef, useState } from 'react';
import { useData } from '@/lib/store';
import { api, loadConfig, saveConfig } from '@/lib/api';
import { createBackup, validateBackup } from '@/lib/backup';
import type { BackupFile } from '@/lib/backup';
import { dataToBackupParts } from '@/lib/ops';
import { download } from '@/lib/download';
import { dateID, todayISO } from '@/lib/format';
import { Btn, Card, Field, Input, Notice, PageHeader } from '@/components/ui';

type Msg = { tone: 'info' | 'warn' | 'error'; text: string } | null;

export default function Settings() {
  const { data, demo, enterDemo, exitDemo, reload, markBackup, importBackup } = useData();
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [conn, setConn] = useState<Msg>(null);
  const [pending, setPending] = useState<{ backup: BackupFile; counts: Record<string, number> } | null>(null);
  const [imp, setImp] = useState<Msg>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const c = loadConfig();
    if (c) { setUrl(c.url); setKey(c.key); }
  }, []);

  async function connect() {
    setConn(null);
    const cfg = { url: url.trim(), key: key.trim() };
    if (!/^https:\/\/script\.google\.com\/.+\/exec$/.test(cfg.url) && !/^https:\/\/script\.googleusercontent\.com\//.test(cfg.url)) {
      setConn({ tone: 'error', text: 'URL harus berupa URL Web app Apps Script yang berakhir dengan /exec.' });
      return;
    }
    if (cfg.key.length < 16) { setConn({ tone: 'error', text: 'Kunci API minimal 16 karakter.' }); return; }
    try {
      await api.ping(cfg);
      saveConfig(cfg);
      setConn({ tone: 'info', text: 'Terhubung. Data dimuat dari Google Sheet.' });
      await reload();
    } catch (e) {
      setConn({ tone: 'error', text: e instanceof Error ? e.message : 'Gagal terhubung.' });
    }
  }

  async function exportJson() {
    const { data: d, settings } = dataToBackupParts(data);
    download(`debt-tracker-backup-${todayISO()}.json`, JSON.stringify(createBackup(d, settings), null, 2), 'application/json');
    await markBackup();
  }

  async function pick(file: File | undefined) {
    setImp(null);
    setPending(null);
    if (!file) return;
    let parsed: unknown;
    try { parsed = JSON.parse(await file.text()); } catch { setImp({ tone: 'error', text: 'File bukan JSON yang valid.' }); return; }
    const v = validateBackup(parsed);
    if (!v.ok) { setImp({ tone: 'error', text: `Backup ditolak: ${v.errors.slice(0, 5).join(' ')}${v.errors.length > 5 ? ` (+${v.errors.length - 5} masalah lain)` : ''}` }); return; }
    setPending({ backup: v.backup, counts: v.counts });
  }

  async function runImport(mode: 'merge' | 'replace') {
    if (!pending) return;
    const r = await importBackup(pending.backup, mode);
    setImp(r.ok ? { tone: 'info', text: mode === 'replace' ? 'Backup diimpor. Data lama diganti.' : 'Backup digabung. Data dengan id sama ditimpa.' } : { tone: 'error', text: r.error });
    if (r.ok) { setPending(null); if (fileRef.current) fileRef.current.value = ''; }
  }

  const last = data.settings.lastBackupAt;
  return (
    <>
      <PageHeader title="Pengaturan dan Backup" />
      <Card>
        <h2 className="mb-1 font-semibold">Sambungan Google Sheet</h2>
        <p className="mb-3 text-sm text-teal-900/70">Dikonfigurasi sekali per perangkat. URL dan kunci hanya disimpan di browser ini.</p>
        <div className="space-y-3">
          <Field label="URL Web app Apps Script"><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://script.google.com/macros/s/…/exec" autoCapitalize="none" autoCorrect="off" /></Field>
          <Field label="Kunci API"><Input type="password" value={key} onChange={(e) => setKey(e.target.value)} autoCapitalize="none" autoCorrect="off" /></Field>
          {conn && <Notice tone={conn.tone}>{conn.text}</Notice>}
          <Btn onClick={() => void connect()}>Tes dan simpan sambungan</Btn>
        </div>
      </Card>

      <Card>
        <h2 className="mb-1 font-semibold">Backup</h2>
        <p className="mb-3 text-sm text-teal-900/70">{demo ? 'Mode demo aktif; backup dinonaktifkan.' : last ? `Backup terakhir: ${dateID(last.slice(0, 10))}.` : 'Belum pernah dibackup.'}</p>
        <div className="space-y-3">
          <Btn variant="ghost" onClick={() => void exportJson()} disabled={demo}>Unduh backup JSON</Btn>
          <Field label="Impor backup JSON"><input ref={fileRef} type="file" accept="application/json,.json" disabled={demo} onChange={(e) => void pick(e.target.files?.[0])} className="block w-full text-sm" /></Field>
          {pending && (
            <Notice tone="warn">
              <p className="font-medium">Backup valid: {pending.counts.debts} utang, {pending.counts.installments} cicilan, {pending.counts.payments} pembayaran.</p>
              <p className="mt-1">Pilih cara impor. Tindakan ini mengubah data di Google Sheet.</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Btn variant="ghost" onClick={() => void runImport('merge')}>Gabung (id sama ditimpa)</Btn>
                <Btn variant="danger" onClick={() => { if (window.confirm('Semua data saat ini akan diganti isi backup. Lanjutkan?')) void runImport('replace'); }}>Timpa semua data</Btn>
              </div>
            </Notice>
          )}
          {imp && <Notice tone={imp.tone}>{imp.text}</Notice>}
        </div>
      </Card>

      <Card>
        <h2 className="mb-1 font-semibold">Mode demo</h2>
        <p className="mb-3 text-sm text-teal-900/70">Data contoh hanya di layar ini dan tidak pernah ditulis ke Sheet Anda.</p>
        {demo ? <Btn variant="ghost" onClick={exitDemo}>Keluar dari mode demo</Btn> : <Btn variant="ghost" onClick={enterDemo}>Mulai mode demo</Btn>}
      </Card>
    </>
  );
}
