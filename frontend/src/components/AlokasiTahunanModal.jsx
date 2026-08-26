import { useState, useEffect, useMemo } from 'react';
import Modal, { FormField, Input, Select } from './ui/Modal';
import { api } from '../lib/api';

const BULAN_NAMES = ['','Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

/**
 * Hitung deadline per periode sesuai jenis_periode survei.
 * Logika sama dengan backend PHP calcDeadline().
 */
function calcDeadline(jenis, periodeObj, tahun, deadlineHari, deadlineHariMg2, bulanSelesai, surveiObj = null) {
  const pad = (n) => String(n).padStart(2, '0');
  const isSAPB = surveiObj && (
    surveiObj.id === 1 ||
    String(surveiObj.id) === '1' ||
    surveiObj.kode_survei === 'SAPB' ||
    (surveiObj.nama_survei && surveiObj.nama_survei.toUpperCase().includes('SAPB')) ||
    (surveiObj.nama_survei && surveiObj.nama_survei.toLowerCase().includes('angkutan penumpang'))
  );

  switch (jenis) {
    case 'tahunan': {
      const bln = bulanSelesai || 12;
      const maxHari = new Date(tahun, bln, 0).getDate();
      const d = deadlineHari ? Math.min(deadlineHari, maxHari) : maxHari;
      return `${tahun}-${pad(bln)}-${pad(d)}`;
    }
    case 'bulanan': {
      const maxHari = new Date(tahun, periodeObj.bulan, 0).getDate();
      const d = deadlineHari ? Math.min(deadlineHari, maxHari) : maxHari;
      return `${tahun}-${pad(periodeObj.bulan)}-${pad(d)}`;
    }
    case 'mingguan': {
      const maxHari = new Date(tahun, periodeObj.bulan, 0).getDate();
      const isMg2 = periodeObj.minggu_ke === 2;
      const dl = (isMg2 && deadlineHariMg2) ? deadlineHariMg2 : deadlineHari;
      const d = dl ? Math.min(dl, maxHari) : maxHari;
      return `${tahun}-${pad(periodeObj.bulan)}-${pad(d)}`;
    }
    case 'triwulanan': {
      const tw = periodeObj.triwulan_ke || 1;
      if (isSAPB) {
        // Khusus SAPB: TW1 (15 April), TW2 (15 Juli), TW3 (15 Oktober), TW4 (15 Jan tahun berikutnya)
        const d = deadlineHari ? Number(deadlineHari) : 15;
        switch (tw) {
          case 1: return `${tahun}-04-${pad(d)}`;
          case 2: return `${tahun}-07-${pad(d)}`;
          case 3: return `${tahun}-10-${pad(d)}`;
          case 4: return `${tahun + 1}-01-${pad(d)}`;
          default: return `${tahun}-04-${pad(d)}`;
        }
      }
      const bulanAkhir = tw * 3;
      const maxHari = new Date(tahun, bulanAkhir, 0).getDate();
      const d = deadlineHari ? Math.min(deadlineHari, maxHari) : maxHari;
      return `${tahun}-${pad(bulanAkhir)}-${pad(d)}`;
    }
    default: return `${tahun}-12-31`;
  }
}

/** Generate daftar periode berdasarkan jenis_periode */
function generatePeriods(jenis, bulanMulai, bulanSelesai) {
  switch (jenis) {
    case 'tahunan': {
      let label = 'Tahunan';
      if (bulanMulai && bulanSelesai) {
        label = `Tahunan (${BULAN_NAMES[bulanMulai]}–${BULAN_NAMES[bulanSelesai]})`;
      }
      return [{ label, bulan: null, triwulan_ke: null, minggu_ke: null }];
    }
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
  const [confirmDialog, setConfirmDialog] = useState(null); // popup konfirmasi penugasan ganda/tambahan
  const [queue, setQueue] = useState([]); // antrean alokasi batch
  const [activeTab, setActiveTab] = useState('preview'); // 'preview' | 'queue'

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

  const selectedSurvei    = surveys.find(s => String(s.id) === form.survei_id);
  const jenisPeriode      = selectedSurvei?.jenis_periode ?? '';
  const bulanMulai        = selectedSurvei?.bulan_mulai ? parseInt(selectedSurvei.bulan_mulai) : null;
  const bulanSelesai      = selectedSurvei?.bulan_selesai ? parseInt(selectedSurvei.bulan_selesai) : null;
  const deadlineHari      = selectedSurvei?.deadline_hari ?? null;
  const deadlineHariMg2   = selectedSurvei?.deadline_hari_mg2 ?? null;

  const kecamatanList = useMemo(() => [...new Set(wilayahs.map(w => w.kecamatan))].sort(), [wilayahs]);
  const desaList      = useMemo(() => wilayahs.filter(w => w.kecamatan === form.wilayah_kecamatan), [wilayahs, form.wilayah_kecamatan]);

  // Preview periode
  const periods = useMemo(() => generatePeriods(jenisPeriode, bulanMulai, bulanSelesai), [jenisPeriode, bulanMulai, bulanSelesai]);
  const previewRows = useMemo(() =>
    periods.map(p => ({
      ...p,
      deadline: calcDeadline(jenisPeriode, p, parseInt(form.tahun), deadlineHari, deadlineHariMg2, bulanSelesai, selectedSurvei),
    })),
    [periods, jenisPeriode, form.tahun, deadlineHari, deadlineHariMg2, bulanSelesai, selectedSurvei]
  );

  const f = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const totalQueuedTasks = useMemo(
    () => queue.reduce((acc, item) => acc + (item.periods_count || 0), 0),
    [queue]
  );

  function handleAddToQueue() {
    setError('');
    const isNonWilayah = form.wilayah_kecamatan === '__none__' || form.wilayah_kecamatan === '';
    if (!form.survei_id || !form.petugas_id || !form.kegiatan_id) {
      setError('Survei, Petugas, dan Peran wajib dipilih untuk menambahkan ke antrean.'); return;
    }
    if (!isNonWilayah && !form.wilayah_id) {
      setError('Silakan pilih Desa / Kelurahan atau pilih opsi Lintas Wilayah.'); return;
    }
    if (!form.tahun) { setError('Tahun wajib diisi.'); return; }
    if (!form.target_sampel || parseInt(form.target_sampel) < 1) {
      setError('Target Sampel minimal 1.'); return;
    }

    const curPetugas = petugasList.find(p => String(p.id) === String(form.petugas_id));
    const curWilayah = wilayahs.find(w => String(w.id) === String(form.wilayah_id));
    const curKegiatan = kegiatans.find(k => String(k.id) === String(form.kegiatan_id));
    const curPemeriksa = pegawaiList.find(p => String(p.id) === String(form.pemeriksa_id));

    const newItem = {
      queueId: Date.now() + Math.random(),
      survei_id: parseInt(form.survei_id),
      nama_survei: selectedSurvei?.nama_survei,
      wilayah_id: form.wilayah_id ? parseInt(form.wilayah_id) : null,
      desa_kelurahan: curWilayah ? curWilayah.desa_kelurahan : '🌐 Lintas Wilayah (Seluruh Kab.)',
      kecamatan: curWilayah ? curWilayah.kecamatan : '',
      petugas_id: parseInt(form.petugas_id),
      nama_petugas: curPetugas?.nama || 'Petugas',
      tipe_petugas: curPetugas?.tipe || 'mitra',
      kegiatan_id: parseInt(form.kegiatan_id),
      nama_kegiatan: curKegiatan?.nama || 'Pendataan',
      tahun: parseInt(form.tahun),
      target_sampel: parseInt(form.target_sampel),
      pemeriksa_id: form.pemeriksa_id ? parseInt(form.pemeriksa_id) : null,
      nama_pemeriksa: curPemeriksa?.nama || '—',
      periods_count: previewRows.length,
    };

    setQueue(prev => [...prev, newItem]);
    setActiveTab('queue');

    // Reset input petugas, desa, target (survei, kecamatan & tahun tetap tersimpan)
    setForm(prev => ({
      ...prev,
      wilayah_id: '',
      petugas_id: '',
      target_sampel: '',
    }));
  }

  function handleRemoveFromQueue(idx) {
    setQueue(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(force = false) {
    setError('');

    // Jika antrean kosong, validasi form single entry
    if (queue.length === 0) {
      const isNonWilayah = form.wilayah_kecamatan === '__none__' || form.wilayah_kecamatan === '';
      if (!form.survei_id || !form.petugas_id || !form.kegiatan_id) {
        setError('Survei, Petugas, dan Peran wajib dipilih.'); return;
      }
      if (!isNonWilayah && !form.wilayah_id) {
        setError('Silakan pilih Desa / Kelurahan atau pilih opsi Lintas Wilayah.'); return;
      }
      if (!form.tahun) { setError('Tahun wajib diisi.'); return; }
      if (!form.target_sampel || parseInt(form.target_sampel) < 1) {
        setError('Target Sampel minimal 1.'); return;
      }
    }

    setSaving(true);
    let payload;
    if (queue.length > 0) {
      payload = {
        items: queue.map(q => ({
          survei_id:      q.survei_id,
          wilayah_id:     q.wilayah_id,
          petugas_id:     q.petugas_id,
          kegiatan_id:    q.kegiatan_id,
          tahun:          q.tahun,
          target_sampel:  q.target_sampel,
          pemeriksa_id:   q.pemeriksa_id,
        })),
        ...(force ? { force: true } : {}),
      };
    } else {
      payload = {
        survei_id:      parseInt(form.survei_id),
        wilayah_id:     form.wilayah_id ? parseInt(form.wilayah_id) : null,
        petugas_id:     parseInt(form.petugas_id),
        kegiatan_id:    parseInt(form.kegiatan_id),
        tahun:          parseInt(form.tahun),
        target_sampel:  parseInt(form.target_sampel),
        pemeriksa_id:   form.pemeriksa_id ? parseInt(form.pemeriksa_id) : null,
        ...(force ? { force: true } : {}),
      };
    }

    const res = await api.post('/tugas/alokasi-tahunan', payload);
    setSaving(false);
    if (res.success) {
      if (res.data?.require_confirm) {
        setConfirmDialog(res.data);
        return;
      }
      setConfirmDialog(null);
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
            <h4 className="font-semibold text-text-primary dark:text-dark-text-primary text-base">Alokasi Berhasil!</h4>
            <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-1">
              <strong className="text-status-active">{result.inserted} tugas</strong> berhasil dibuat
              {result.skipped > 0 && <>, <strong className="text-accent-orange">{result.skipped} dilewati</strong> (sudah ada)</>}.
            </p>
          </div>
          <div className="rounded-xl bg-navy/5 dark:bg-dark-navy/10 p-3 text-xs text-left space-y-1 text-text-secondary dark:text-dark-text-secondary">
            <div>Survei: <span className="font-medium text-text-primary dark:text-dark-text-primary">{selectedSurvei?.nama_survei}</span></div>
            <div>Wilayah: <span className="font-medium text-text-primary dark:text-dark-text-primary">{form.wilayah_id ? desaList.find(d => String(d.id) === form.wilayah_id)?.desa_kelurahan : '🌐 Lintas Wilayah (Seluruh Kabupaten)'}</span></div>
            <div>Tahun: <span className="font-medium text-text-primary dark:text-dark-text-primary">{form.tahun}</span></div>
            <div>Target / Periode: <span className="font-medium text-text-primary dark:text-dark-text-primary">{form.target_sampel} sampel</span></div>
          </div>
        </div>
      </Modal>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Alokasi Tugas Tahunan"
      size="2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <p className="text-xs text-text-secondary dark:text-dark-text-secondary">
            {queue.length > 0
              ? `${queue.length} alokasi di antrean (Total ${totalQueuedTasks} tugas)`
              : `${previewRows.length} periode akan di-generate`}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-ghost text-sm px-4 py-2">
              Batal
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={
                saving ||
                (queue.length === 0 && (!form.survei_id || !form.petugas_id || !form.kegiatan_id || previewRows.length === 0))
              }
              className="btn-primary text-sm px-5 py-2">
              {saving
                ? 'Memproses...'
                : queue.length > 0
                ? `🚀 Generate Semua (${totalQueuedTasks} Tugas)`
                : `Generate ${previewRows.length} Tugas`}
            </button>
          </div>
        </div>
      }>
      <div className="grid grid-cols-2 gap-6">
        {/* ── Kolom Kiri: Form Input ── */}
        <div className="space-y-3">
          {error && <p className="text-sm text-accent-orange dark:text-dark-accent-orange bg-accent-orange/10 p-2.5 rounded-xl">{error}</p>}

          <FormField label="Survei" required>
            <Select id="sel-survei-tahunan" value={form.survei_id}
              onChange={(e) => { f('survei_id', e.target.value); }}>
              <option value="">-- Pilih Survei --</option>
              {surveys.map(s => <option key={s.id} value={s.id}>{s.nama_survei}</option>)}
            </Select>
          </FormField>

          {jenisPeriode && (
            <div className="flex gap-2 text-xs flex-wrap items-center">
              <span className="px-2 py-1 rounded-lg bg-navy/5 dark:bg-dark-navy/10 text-text-secondary dark:text-dark-text-secondary capitalize font-medium">
                {jenisPeriode === 'tahunan' && bulanMulai && bulanSelesai
                  ? `📅 Tahunan (${BULAN_NAMES[bulanMulai]}–${BULAN_NAMES[bulanSelesai]})`
                  : `📅 ${jenisPeriode}`}
              </span>
              {jenisPeriode === 'mingguan' ? (
                <>
                  {deadlineHari && (
                    <span className="px-2 py-1 rounded-lg bg-accent-orange/10 text-accent-orange dark:text-dark-accent-orange">
                      ⏰ Mg1: Tgl {deadlineHari}
                    </span>
                  )}
                  {deadlineHariMg2 && (
                    <span className="px-2 py-1 rounded-lg bg-accent-orange/10 text-accent-orange dark:text-dark-accent-orange">
                      ⏰ Mg2: Tgl {deadlineHariMg2}
                    </span>
                  )}
                </>
              ) : deadlineHari ? (
                <span className="px-2 py-1 rounded-lg bg-accent-orange/10 text-accent-orange dark:text-dark-accent-orange">
                  ⏰ Deadline: Tgl {deadlineHari} {jenisPeriode === 'tahunan' && bulanSelesai ? BULAN_NAMES[bulanSelesai] : ''}
                </span>
              ) : null}
            </div>
          )}

          <FormField label="Kecamatan (Opsional)">
            <Select value={form.wilayah_kecamatan}
              onChange={(e) => { 
                const val = e.target.value;
                f('wilayah_kecamatan', val); 
                f('wilayah_id', ''); 
              }}>
              <option value="">-- Pilih Kecamatan / Non-Wilayah --</option>
              <option value="__none__">🌐 Lintas Wilayah / Seluruh Kabupaten (Non-Wilayah)</option>
              {kecamatanList.map(k => <option key={k} value={k}>{k}</option>)}
            </Select>
          </FormField>

          <FormField label="Desa / Kelurahan">
            <Select value={form.wilayah_id} onChange={(e) => f('wilayah_id', e.target.value)}
              disabled={!form.wilayah_kecamatan || form.wilayah_kecamatan === '__none__'}>
              <option value="">{form.wilayah_kecamatan === '__none__' ? '— Seluruh Wilayah / Non-Wilayah —' : '-- Pilih Desa --'}</option>
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

          {/* Tombol Tambah ke Antrean */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleAddToQueue}
              className="w-full py-2.5 px-3 rounded-xl border-2 border-dashed border-navy/30 dark:border-dark-navy/40 text-navy dark:text-dark-navy hover:bg-navy/5 dark:hover:bg-dark-navy/10 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              title="Tambahkan petugas ini ke daftar antrean alokasi"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              + Tambah ke Antrean Alokasi
            </button>
          </div>
        </div>

        {/* ── Kolom Kanan: Preview Periode & Antrean ── */}
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between border-b border-border-soft dark:border-dark-border-soft pb-2 mb-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                  activeTab === 'preview'
                    ? 'bg-navy/10 dark:bg-dark-navy/20 text-navy dark:text-dark-navy font-bold'
                    : 'text-text-secondary dark:text-dark-text-secondary hover:text-text-primary'
                }`}
              >
                📅 Preview Jadwal ({previewRows.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('queue')}
                className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1.5 ${
                  activeTab === 'queue'
                    ? 'bg-navy/10 dark:bg-dark-navy/20 text-navy dark:text-dark-navy font-bold'
                    : 'text-text-secondary dark:text-dark-text-secondary hover:text-text-primary'
                }`}
              >
                📋 Antrean Alokasi
                {queue.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-accent-orange text-white font-bold">
                    {queue.length}
                  </span>
                )}
              </button>
            </div>
            {queue.length > 0 && activeTab === 'queue' && (
              <button
                type="button"
                onClick={() => setQueue([])}
                className="text-[11px] text-text-secondary hover:text-accent-orange transition-colors"
                title="Kosongkan seluruh antrean"
              >
                Kosongkan
              </button>
            )}
          </div>

          {activeTab === 'preview' ? (
            previewRows.length === 0 ? (
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
            )
          ) : (
            /* Tab Queue */
            queue.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-xs text-text-secondary dark:text-dark-text-secondary border border-dashed border-border-soft dark:border-dark-border-soft rounded-xl p-6 text-center space-y-2">
                <span className="text-2xl">📋</span>
                <p className="font-medium text-text-primary dark:text-dark-text-primary">Antrean Masih Kosong</p>
                <p>Isi data form di sebelah kiri lalu klik tombol <strong>"+ Tambah ke Antrean Alokasi"</strong> untuk menampung beberapa petugas sekaligus.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto max-h-80 space-y-2 pr-1">
                {queue.map((item, idx) => (
                  <div key={item.queueId || idx} className="p-3 rounded-xl border border-border-soft dark:border-dark-border-soft bg-surface dark:bg-dark-surface space-y-1.5 relative group hover:border-navy/30 dark:hover:border-dark-navy/40 transition-all">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-bold text-text-primary dark:text-dark-text-primary flex items-center gap-1.5">
                          <span>#{idx + 1} {item.nama_petugas}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-navy/10 text-navy dark:bg-dark-navy/20 dark:text-dark-navy capitalize font-normal">
                            {item.tipe_petugas}
                          </span>
                        </p>
                        <p className="text-[11px] text-text-secondary dark:text-dark-text-secondary mt-0.5">
                          📍 {item.desa_kelurahan} {item.kecamatan ? `(${item.kecamatan})` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromQueue(idx)}
                        className="text-text-secondary hover:text-accent-orange p-1 rounded-lg hover:bg-accent-orange/10 transition-colors"
                        title="Hapus dari antrean"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border-soft/50 dark:border-dark-border-soft/50 text-text-secondary dark:text-dark-text-secondary">
                      <span>🎯 <strong>{item.target_sampel} sampel</strong> / periode</span>
                      <span>⚙️ {item.periods_count} periode</span>
                      <span>👤 Pemeriksa: {item.nama_pemeriksa}</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* ── Dialog Konfirmasi Alokasi Tambahan ── */}
      {confirmDialog && (
        <Modal
          isOpen
          onClose={() => setConfirmDialog(null)}
          title="Konfirmasi Penugasan Tambahan"
          size="sm"
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="btn-ghost text-sm px-4 py-2"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmDialog(null);
                  handleSubmit(true);
                }}
                disabled={saving}
                className="btn-primary text-sm px-4 py-2"
              >
                {saving ? 'Memproses...' : 'Ya, Tetap Tambahkan'}
              </button>
            </div>
          }
        >
          <div className="space-y-3 py-1">
            <div className="p-3.5 rounded-xl bg-accent-orange/10 border border-accent-orange/20 dark:border-dark-accent-orange/20 text-accent-orange dark:text-dark-accent-orange flex items-start gap-3">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
              <div className="text-xs text-text-primary dark:text-dark-text-primary space-y-1">
                <p className="font-semibold text-accent-orange dark:text-dark-accent-orange text-sm">
                  Terdeteksi Tugas Sebelumnya
                </p>
                <p>
                  Petugas ini sudah memiliki <strong>{confirmDialog.existing_count} tugas</strong> terdaftar pada survei, wilayah, dan tahun ini.
                </p>
                <p className="text-text-secondary dark:text-dark-text-secondary">
                  Pemeriksa sebelumnya: <strong>{confirmDialog.existing_pemeriksa}</strong>
                </p>
              </div>
            </div>

            <p className="text-xs text-text-secondary dark:text-dark-text-secondary">
              Apakah Anda ingin tetap mengalokasikan tugas ini sebagai <strong>penugasan / sampel tambahan</strong>?
            </p>
          </div>
        </Modal>
      )}
    </Modal>
  );
}