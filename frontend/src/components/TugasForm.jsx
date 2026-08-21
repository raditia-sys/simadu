import { useState, useEffect } from 'react';
import Modal, { FormField, Input, Select } from './ui/Modal';
import { api } from '../lib/api';

const BULAN_OPTIONS = ['','Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

const EMPTY = {
  survei_id: '', wilayah_kecamatan: '', wilayah_id: '',
  petugas_id: '', kegiatan_id: '',
  tahun: new Date().getFullYear(), bulan: '', triwulan_ke: '', minggu_ke: '',
  target_sampel: '', sampel_selesai: '0', deadline: '',
};

/**
 * TugasForm — modal form untuk tambah / edit tugas kegiatan.
 *
 * Props:
 * - mode: 'add' | 'edit' | 'edit-selesai'  (edit-selesai untuk admin: hanya sampel_selesai)
 * - initialData: object | null  (data row untuk mode edit)
 * - onClose: fn
 * - onSaved: fn(savedRow)
 */
export default function TugasForm({ mode = 'add', initialData = null, onClose, onSaved }) {
  const isAdminEdit = mode === 'edit-selesai';

  // ── Dropdown options ──────────────────────────────────────────────────────
  const [surveys,    setSurveys]    = useState([]);
  const [wilayahs,   setWilayahs]   = useState([]);
  const [petugasList,setPetugasList] = useState([]);
  const [kegiatans,  setKegiatans]  = useState([]);

  // ── Form state ────────────────────────────────────────────────────────────
  const [form,      setForm]      = useState(EMPTY);
  const [error,     setError]     = useState('');
  const [saving,    setSaving]    = useState(false);

  // jenis_periode dari survei yang dipilih
  const [jenisPeriode, setJenisPeriode] = useState('');

  // ── Load dropdown data ────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      api.get('/master/survei'),
      api.get('/master/wilayah'),
      api.get('/master/petugas'),
      api.get('/master/kegiatan'),
    ]).then(([sv, wl, pt, kg]) => {
      if (sv.success)  setSurveys(sv.data);
      if (wl.success)  setWilayahs(wl.data);
      if (pt.success)  setPetugasList(pt.data);
      if (kg.success)  setKegiatans(kg.data);
    });
  }, []);

  // ── Isi form jika mode edit ───────────────────────────────────────────────
  useEffect(() => {
    if (initialData) {
      setForm({
        survei_id:          initialData.survei_id != null ? String(initialData.survei_id) : '',
        wilayah_kecamatan:  initialData.kecamatan ?? '',
        wilayah_id:         initialData.wilayah_id != null ? String(initialData.wilayah_id) : '',
        petugas_id:         initialData.petugas_id != null ? String(initialData.petugas_id) : '',
        kegiatan_id:        initialData.kegiatan_id != null ? String(initialData.kegiatan_id) : '',
        pemeriksa_id:       initialData.pemeriksa_id != null ? String(initialData.pemeriksa_id) : '',
        tahun:              initialData.tahun ?? new Date().getFullYear(),
        bulan:              initialData.bulan ?? '',
        triwulan_ke:        initialData.triwulan_ke ?? '',
        minggu_ke:          initialData.minggu_ke ?? '',
        target_sampel:      initialData.target_sampel != null ? String(initialData.target_sampel) : '',
        sampel_selesai:     initialData.sampel_selesai != null ? String(initialData.sampel_selesai) : '0',
        deadline:           initialData.deadline ?? '',
      });
      setJenisPeriode(initialData.jenis_periode ?? '');
    }
  }, [initialData]);

  // ── Ketika survei berubah, update jenis_periode ───────────────────────────
  const handleSurveiChange = (e) => {
    const id  = e.target.value;
    const sv  = surveys.find((s) => String(s.id) === id);
    setForm((f) => ({ ...f, survei_id: id, bulan: '', triwulan_ke: '', minggu_ke: '' }));
    setJenisPeriode(sv?.jenis_periode ?? '');
  };

  // ── Kecamatan filter → desa dropdown ──────────────────────────────────────
  const kecamatanList = [...new Set(wilayahs.map((w) => w.kecamatan))].sort();
  const desaList = wilayahs.filter((w) => w.kecamatan === form.wilayah_kecamatan);

  const f = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSave() {
    setError('');

    if (isAdminEdit) {
      // Admin mode: hanya kirim sampel_selesai
      if (form.sampel_selesai === '') { setError('Sampel Selesai wajib diisi.'); return; }
      setSaving(true);
      const res = await api.put(`/tugas/${initialData.id}`, {
        sampel_selesai: parseInt(form.sampel_selesai, 10),
      });
      setSaving(false);
      if (res.success) { onSaved(res.data); onClose(); }
      else setError(res.message || 'Gagal menyimpan.');
      return;
    }

    // Validasi dasar
    if (!form.survei_id || !form.wilayah_id || !form.petugas_id || !form.kegiatan_id) {
      setError('Survei, Wilayah, Petugas, dan Peran wajib dipilih.'); return;
    }
    if (!form.tahun || !form.deadline) { setError('Tahun dan Deadline wajib diisi.'); return; }
    if (!form.target_sampel || parseInt(form.target_sampel) < 1) {
      setError('Target Sampel minimal 1.'); return;
    }

    const payload = {
      survei_id:      parseInt(form.survei_id),
      wilayah_id:     parseInt(form.wilayah_id),
      petugas_id:     parseInt(form.petugas_id),
      kegiatan_id:    parseInt(form.kegiatan_id),
      tahun:          parseInt(form.tahun),
      target_sampel:  parseInt(form.target_sampel),
      sampel_selesai: parseInt(form.sampel_selesai || '0'),
      deadline:       form.deadline,
    };

    // Tambahkan field periode
    if (jenisPeriode === 'mingguan') {
      if (!form.bulan || !form.minggu_ke) { setError('Bulan dan Minggu Ke wajib diisi untuk survei mingguan.'); return; }
      payload.bulan     = parseInt(form.bulan);
      payload.minggu_ke = parseInt(form.minggu_ke);
    } else if (jenisPeriode === 'bulanan') {
      if (!form.bulan) { setError('Bulan wajib diisi untuk survei bulanan.'); return; }
      payload.bulan = parseInt(form.bulan);
    } else if (jenisPeriode === 'triwulanan') {
      if (!form.triwulan_ke) { setError('Triwulan Ke wajib diisi untuk survei triwulanan.'); return; }
      payload.triwulan_ke = parseInt(form.triwulan_ke);
    }

    setSaving(true);
    const res = mode === 'add'
      ? await api.post('/tugas', payload)
      : await api.put(`/tugas/${initialData.id}`, payload);
    setSaving(false);

    if (res.success) { onSaved(res.data); onClose(); }
    else setError(res.message || 'Gagal menyimpan.');
  }

  const title = isAdminEdit ? 'Update Capaian'
    : mode === 'add' ? 'Tambah Tugas Kegiatan'
    : 'Edit Tugas Kegiatan';

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={title}
      size={isAdminEdit ? 'sm' : 'lg'}
      footer={
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary text-sm px-4 py-2">Batal</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm px-4 py-2 disabled:opacity-60">
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && <p className="text-sm text-accent-orange dark:text-dark-accent-orange">{error}</p>}

        {isAdminEdit ? (
          /* Admin: hanya update sampel_selesai */
          <>
            <div className="p-3 rounded-xl bg-navy/5 dark:bg-dark-navy/10 space-y-0.5">
              <p className="text-xs text-text-secondary dark:text-dark-text-secondary">Survei</p>
              <p className="text-sm font-medium text-text-primary dark:text-dark-text-primary">{initialData?.nama_survei}</p>
              <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-1">
                {initialData?.nama_petugas} · {initialData?.desa_kelurahan}
              </p>
            </div>
            <FormField label="Target Sampel">
              <p className="text-sm font-mono font-semibold text-text-primary dark:text-dark-text-primary">
                {initialData?.target_sampel}
              </p>
            </FormField>
            <FormField label="Sampel Selesai" required hint="Isi jumlah sampel yang sudah selesai dikerjakan.">
              <Input
                id="input-selesai"
                type="number"
                min="0"
                max={initialData?.target_sampel}
                value={form.sampel_selesai}
                onChange={(e) => f('sampel_selesai', e.target.value)}
                autoFocus
              />
            </FormField>
          </>
        ) : (
          /* Superadmin: form lengkap */
          <>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Survei" required>
                <Select id="sel-survei" value={form.survei_id} onChange={handleSurveiChange}>
                  <option value="">-- Pilih Survei --</option>
                  {surveys.map((s) => (
                    <option key={s.id} value={s.id}>{s.nama_survei}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Jenis Periode" hint="Otomatis dari survei.">
                <div className="px-3.5 py-2 rounded-xl text-sm capitalize
                  bg-bg-page dark:bg-dark-bg-page border border-border-soft dark:border-dark-border-soft
                  text-text-secondary dark:text-dark-text-secondary">
                  {jenisPeriode || '—'}
                </div>
              </FormField>
            </div>

            {/* Wilayah bertingkat */}
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Kecamatan" required>
                <Select id="sel-kecamatan" value={form.wilayah_kecamatan}
                  onChange={(e) => { f('wilayah_kecamatan', e.target.value); f('wilayah_id', ''); }}>
                  <option value="">-- Pilih Kecamatan --</option>
                  {kecamatanList.map((k) => <option key={k}>{k}</option>)}
                </Select>
              </FormField>
              <FormField label="Desa / Kelurahan" required>
                <Select id="sel-desa" value={form.wilayah_id}
                  onChange={(e) => f('wilayah_id', e.target.value)}
                  disabled={!form.wilayah_kecamatan}>
                  <option value="">-- Pilih Desa --</option>
                  {desaList.map((w) => (
                    <option key={w.id} value={w.id}>{w.desa_kelurahan}</option>
                  ))}
                </Select>
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Petugas" required>
                <Select id="sel-petugas" value={form.petugas_id} onChange={(e) => f('petugas_id', e.target.value)}>
                  <option value="">-- Pilih Petugas --</option>
                  {petugasList.map((p) => (
                    <option key={p.id} value={p.id}>{p.nama} ({p.tipe})</option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Peran (Kegiatan)" required>
                <Select id="sel-peran" value={form.kegiatan_id} onChange={(e) => f('kegiatan_id', e.target.value)}>
                  <option value="">-- Pilih Peran --</option>
                  {kegiatans.map((k) => (
                    <option key={k.id} value={k.id}>{k.nama}</option>
                  ))}
                </Select>
              </FormField>
            </div>

            {/* Field periode dinamis */}
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Tahun" required>
                <Input id="input-tahun" type="number" min="2000" max="2100" value={form.tahun}
                  onChange={(e) => f('tahun', e.target.value)} />
              </FormField>

              {/* Tampilkan field sesuai jenis_periode */}
              {jenisPeriode === 'bulanan' && (
                <FormField label="Bulan" required>
                  <Select id="sel-bulan" value={form.bulan} onChange={(e) => f('bulan', e.target.value)}>
                    <option value="">-- Bulan --</option>
                    {BULAN_OPTIONS.slice(1).map((b, i) => (
                      <option key={i+1} value={i+1}>{b}</option>
                    ))}
                  </Select>
                </FormField>
              )}
              {jenisPeriode === 'mingguan' && (
                <>
                  <FormField label="Bulan" required>
                    <Select id="sel-bulan" value={form.bulan} onChange={(e) => f('bulan', e.target.value)}>
                      <option value="">-- Bulan --</option>
                      {BULAN_OPTIONS.slice(1).map((b, i) => (
                        <option key={i+1} value={i+1}>{b}</option>
                      ))}
                    </Select>
                  </FormField>
                </>
              )}
              {jenisPeriode === 'triwulanan' && (
                <FormField label="Triwulan Ke" required>
                  <Select id="sel-triwulan" value={form.triwulan_ke} onChange={(e) => f('triwulan_ke', e.target.value)}>
                    <option value="">-- Pilih --</option>
                    {[1,2,3,4].map((t) => <option key={t} value={t}>TW {t}</option>)}
                  </Select>
                </FormField>
              )}
            </div>

            {jenisPeriode === 'mingguan' && (
              <FormField label="Minggu Ke" required hint="Hanya 1 atau 2.">
                <Select id="sel-minggu" value={form.minggu_ke} onChange={(e) => f('minggu_ke', e.target.value)}>
                  <option value="">-- Pilih --</option>
                  <option value="1">Minggu 1</option>
                  <option value="2">Minggu 2</option>
                </Select>
              </FormField>
            )}

            <div className="grid grid-cols-3 gap-4">
              <FormField label="Target Sampel" required>
                <Input id="input-target" type="number" min="1" value={form.target_sampel}
                  onChange={(e) => f('target_sampel', e.target.value)} />
              </FormField>
              <FormField label="Sampel Selesai">
                <Input id="input-selesai" type="number" min="0" value={form.sampel_selesai}
                  onChange={(e) => f('sampel_selesai', e.target.value)} />
              </FormField>
              <FormField label="Deadline" required>
                <Input id="input-deadline" type="date" value={form.deadline}
                  onChange={(e) => f('deadline', e.target.value)} />
              </FormField>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
