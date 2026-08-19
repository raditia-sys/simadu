import { useState, useEffect, useMemo } from 'react';
import Modal, { FormField, Input, Select } from './ui/Modal';
import { api } from '../lib/api';

const BULAN_NAMES = ['','Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

/**
 * Hitung deadline per periode sesuai jenis_periode survei.
 * Logika sama dengan backend PHP calcDeadline().
 */
function calcDeadline(jenis, periodeObj, tahun, deadlineHari) {
  if (!deadlineHari) return null;
  const hari = String(deadlineHari).padStart(2, '0');
  const pad = (n) => String(n).padStart(2, '0');
  switch (jenis) {
    case 'tahunan': return `${tahun}-12-${hari}`;
    case 'bulanan':
    case 'mingguan': {
      const maxHari = new Date(tahun, periodeObj.bulan, 0).getDate();
      const h = Math.min(deadlineHari, maxHari);
      return `${tahun}-${pad(periodeObj.bulan)}-${String(h).padStart(2,'0')}`;
    }
    case 'triwulanan': {
      const bulanAkhir = periodeObj.triwulan_ke * 3;
      const maxHari = new Date(tahun, bulanAkhir, 0).getDate();
      const h = Math.min(deadlineHari, maxHari);
      return `${tahun}-${pad(bulanAkhir)}-${String(h).padStart(2,'0')}`;
    }
    default: return null;
  }
}

/** Generate daftar periode berdasarkan jenis_periode */
function generatePeriods(jenis) {
  switch (jenis) {
    case 'tahunan': return [{ label: 'Tahunan', bulan: null, triwulan_ke: null, minggu_ke: null }];
    case 'bulanan':
      return Array.from({ length: 12 }, (_, i) => ({
        label: BULAN_NAMES[i + 1], bulan: i + 1, triwulan_ke: null, minggu_ke: null,
      }));
    case 'triwulanan':
      return [1, 2, 3, 4].map(tw => ({
        label: `TW ${tw}`, bulan: null, triwulan_ke: tw, minggu_ke: null,
      }));
    case 'mingguan':
      return Array.from({ length: 12 }, (_, i) =>
        [1, 2].map(mg => ({
          label: `${BULAN_NAMES[i + 1]} Mggu ${mg}`, bulan: i + 1, triwulan_ke: null, minggu_ke: mg,
        }))
      ).flat();
    default: return [];
  }
}

export default function AlokasiTahunanModal({ onClose, onSaved }) {
  const [surveys,     setSurveys]     = useState([]);
  const [wilayahs,    setWilayahs]    = useState([]);
  const [petugasList, setPetugasList] = useState([]);
  const [kegiatans,   setKegiatans]   = useState([]);
  const [pegawaiList, setPegawaiList] = useState([]);

  const [form, setForm] = useState({
    survei_id: '', wilayah_kecamatan: '', wilayah_id: '',
    petugas_id: '', kegiatan_id: '',
    tahun: new Date().getFullYear(),
    target_sampel: '',
    pemeriksa_id: '',
  });

  const [error,   setError]   = useState('');
  const [saving,  setSaving]  = useState(false);
  const [result,  setResult]  = useState(null); // hasil setelah submit

  // Load dropdown data
  useEffect(() => {
    Promise.all([
      api.get('/master/survei'),
      api.get('/master/wilayah'),
      api.get('/master/petugas'),
      api.get('/master/kegiatan'),
    ]).then(([sv, wl, pt, kg]) => {
      if (sv.success) setSurveys(sv.data);
      if (wl.success) setWilayahs(wl.data);
      if (pt.success) {
        setPetugasList(pt.data);
        // Filter hanya pegawai untuk pemeriksa
        setPegawaiList(pt.data.filter(p => p.tipe === 'pegawai'));
      }
      if (kg.success) setKegiatans(kg.data);
    });
  }, []);

  const selectedSurvei = surveys.find(s => String(s.id) === form.survei_id);
  const jenisPeriode   = selectedSurvei?.jenis_periode ?? '';
  const deadlineHari   = selectedSurvei?.deadline_hari ?? null;

  const kecamatanList = useMemo(() => [...new Set(wilayahs.map(w => w.kecamatan))].sort(), [wilayahs]);
  const desaList      = useMemo(() => wilayahs.filter(w => w.kecamatan === form.wilayah_kecamatan), [wilayahs, form.wilayah_kecamatan]);

  // Preview periode
  const periods = useMemo(() => generatePeriods(jenisPeriode), [jenisPeriode]);
  const previewRows = useMemo(() =>
    periods.map(p => ({
      ...p,
      deadline: calcDeadline(jenisPeriode, p, parseInt(form.tahun), deadlineHari),
    })),
    [periods, jenisPeriode, form.tahun, deadlineHari]
  );

  const f = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  async function handleSubmit() {
    setError('');
    if (!form.survei_id || !form.wilayah_id || !form.petugas_id || !form.kegiatan_id) {
      setError('Survei, Wilayah, Petugas, dan Peran wajib dipilih.'); return;
    }
    if (!form.tahun) { setError('Tahun wajib diisi.'); return; }
    if (!form.target_sampel || parseInt(form.target_sampel) < 1) {
      setError('Target Sampel minimal 1.'); return;
    }

    setSaving(true);
    const payload = {
      survei_id:      parseInt(form.survei_id),
      wilayah_id:     parseInt(form.wilayah_id),
      petugas_id:     parseInt(form.petugas_id),
      kegiatan_id:    parseInt(form.kegiatan_id),
      tahun:          parseInt(form.tahun),
      target_sampel:  parseInt(form.target_sampel),
      pemeriksa_id:   form.pemeriksa_id ? parseInt(form.pemeriksa_id) : null,
    };
    const res = await api.post('/tugas/alokasi-tahunan', payload);
    setSaving(false);
    if (res.success) {
      setResult(res.data);
      if (onSaved) onSaved(res.data.rows ?? []);
    } else {
      setError(res.message || 'Gagal menyimpan.');
    }
  }

  // ── Tampilan hasil ─────────────────────────────────────────────────────────
  if (result) {
    return (
      <Modal isOpen onClose={onClose} title="Hasil Alokasi Tahunan" size="sm"
        footer={<div className="flex justify-end"><button onClick={onClose} className="btn-primary text-sm px-4 py-2">Tutup</button></div>}>
        <div className="space-y-4 text-center py-2">
          <div className="w-14 h-14 rounded-2xl bg-status-active/10 flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-status-active" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-text-primary dark:text-dark-text-primary text-lg">{result.inserted} Tugas Di-generate</p>
            {result.skipped > 0 && (
              <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-1">
                {result.skipped} periode sudah ada sebelumnya (dilewati)
              </p>
            )}
          </div>
        </div>
      </Modal>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <Modal isOpen onClose={onClose} title="Alokasi Tugas Tahunan" size="xl"
      footer={
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-text-secondary dark:text-dark-text-secondary">
            {previewRows.length > 0 && jenisPeriode
              ? `${previewRows.length} periode akan di-generate`
              : 'Pilih survei untuk melihat preview periode'}
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary text-sm px-4 py-2">Batal</button>
            <button onClick={handleSubmit} disabled={saving} className="btn-primary text-sm px-4 py-2 disabled:opacity-60">
              {saving ? 'Memproses...' : `Generate ${previewRows.length} Tugas`}
            </button>
          </div>
        </div>
      }>
      <div className="grid grid-cols-2 gap-6">
        {/* ── Kolom Kiri: Form Input ── */}
        <div className="space-y-3">
          {error && <p className="text-sm text-accent-orange dark:text-dark-accent-orange">{error}</p>}

          <FormField label="Survei" required>
            <Select id="sel-survei-tahunan" value={form.survei_id}
              onChange={(e) => { f('survei_id', e.target.value); }}>
              <option value="">-- Pilih Survei --</option>
              {surveys.map(s => <option key={s.id} value={s.id}>{s.nama_survei}</option>)}
            </Select>
          </FormField>

          {jenisPeriode && (
            <div className="flex gap-3 text-xs">
              <span className="px-2 py-1 rounded-lg bg-navy/5 dark:bg-dark-navy/10 text-text-secondary dark:text-dark-text-secondary capitalize">
                📅 {jenisPeriode}
              </span>
              {deadlineHari && (
                <span className="px-2 py-1 rounded-lg bg-accent-orange/10 text-accent-orange dark:text-dark-accent-orange">
                  ⏰ Deadline: Tgl {deadlineHari}
                </span>
              )}
            </div>
          )}

          <FormField label="Kecamatan" required>
            <Select value={form.wilayah_kecamatan}
              onChange={(e) => { f('wilayah_kecamatan', e.target.value); f('wilayah_id', ''); }}>
              <option value="">-- Pilih Kecamatan --</option>
              {kecamatanList.map(k => <option key={k}>{k}</option>)}
            </Select>
          </FormField>

          <FormField label="Desa / Kelurahan" required>
            <Select value={form.wilayah_id} onChange={(e) => f('wilayah_id', e.target.value)}
              disabled={!form.wilayah_kecamatan}>
              <option value="">-- Pilih Desa --</option>
              {desaList.map(w => <option key={w.id} value={w.id}>{w.desa_kelurahan}</option>)}
            </Select>
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Petugas" required>
              <Select value={form.petugas_id} onChange={(e) => f('petugas_id', e.target.value)}>
                <option value="">-- Pilih --</option>
                {petugasList.map(p => <option key={p.id} value={p.id}>{p.nama} ({p.tipe})</option>)}
              </Select>
            </FormField>
            <FormField label="Peran" required>
              <Select value={form.kegiatan_id} onChange={(e) => f('kegiatan_id', e.target.value)}>
                <option value="">-- Pilih --</option>
                {kegiatans.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Tahun" required>
              <Input type="number" min="2000" max="2100" value={form.tahun}
                onChange={(e) => f('tahun', e.target.value)} />
            </FormField>
            <FormField label="Target Sampel" required>
              <Input type="number" min="1" value={form.target_sampel}
                onChange={(e) => f('target_sampel', e.target.value)} placeholder="Jumlah sampel" />
            </FormField>
          </div>

          <FormField label="Pemeriksa" hint="Opsional. Pegawai yang memeriksa hasil survei.">
            <Select value={form.pemeriksa_id} onChange={(e) => f('pemeriksa_id', e.target.value)}>
              <option value="">-- Tanpa Pemeriksa --</option>
              {pegawaiList.map(p => <option key={p.id} value={p.id}>{p.nama}</option>)}
            </Select>
          </FormField>
        </div>

        {/* ── Kolom Kanan: Preview Periode ── */}
        <div className="flex flex-col">
          <p className="text-xs font-semibold text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider mb-2">
            Preview Periode yang Akan Di-generate
          </p>
          {previewRows.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-sm text-text-secondary dark:text-dark-text-secondary border border-dashed border-border-soft dark:border-dark-border-soft rounded-xl p-6 text-center">
              Pilih survei untuk melihat daftar periode
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto max-h-80 border border-border-soft dark:border-dark-border-soft rounded-xl">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-surface dark:bg-dark-surface border-b border-border-soft dark:border-dark-border-soft">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-text-secondary dark:text-dark-text-secondary">#</th>
                    <th className="px-3 py-2 text-left font-semibold text-text-secondary dark:text-dark-text-secondary">Periode</th>
                    <th className="px-3 py-2 text-left font-semibold text-text-secondary dark:text-dark-text-secondary">Deadline</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((p, i) => (
                    <tr key={i} className="border-b border-border-soft/50 dark:border-dark-border-soft/50 last:border-0 hover:bg-navy/2 dark:hover:bg-dark-navy/5">
                      <td className="px-3 py-1.5 text-text-secondary dark:text-dark-text-secondary">{i + 1}</td>
                      <td className="px-3 py-1.5 font-medium text-text-primary dark:text-dark-text-primary">{p.label}</td>
                      <td className="px-3 py-1.5 font-mono text-accent-orange dark:text-dark-accent-orange">
                        {p.deadline ?? <span className="text-text-secondary dark:text-dark-text-secondary not-italic">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}