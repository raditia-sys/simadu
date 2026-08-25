import { useState, useEffect } from 'react';
import Modal, { FormField, Input, Select } from './ui/Modal';
import { api } from '../lib/api';

const BULAN_OPTIONS = ['','Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

const EMPTY = {
  survei_id: '', wilayah_kecamatan: '', wilayah_id: '',
  petugas_id: '', kegiatan_id: '',
  tahun: new Date().getFullYear(), bulan: '', triwulan_ke: '', minggu_ke: '',
  target_sampel: '', sampel_selesai: '0', deadline: '',
  catatan: '',
};

/**
 * TugasForm — modal form untuk tambah / edit tugas kegiatan.
 *
 * Props:
 * - mode: 'add' | 'edit' | 'edit-selesai'  (edit-selesai untuk admin: hanya sampel_selesai dan catatan)
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
      const isLintas = !initialData.wilayah_id || initialData.kecamatan === 'Lintas Wilayah' || initialData.wilayah_kecamatan === '__none__';
      setForm({
        survei_id:          initialData.survei_id != null ? String(initialData.survei_id) : '',
        wilayah_kecamatan:  isLintas ? '__none__' : (initialData.kecamatan ?? ''),
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
        catatan:            initialData.catatan ?? '',
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
      // Admin mode: update sampel_selesai dan catatan
      if (form.sampel_selesai === '') { setError('Sampel Selesai wajib diisi.'); return; }
      setSaving(true);
      const res = await api.put(`/tugas/${initialData.id}`, {
        sampel_selesai: parseInt(form.sampel_selesai, 10),
        catatan: form.catatan ? form.catatan.trim() : null,
      });
      setSaving(false);
      if (res.success) { onSaved(res.data); onClose(); }
      else setError(res.message || 'Gagal menyimpan.');
      return;
    }

    // Validasi dasar
    const isNonWilayah = form.wilayah_kecamatan === '__none__' || form.wilayah_kecamatan === 'Lintas Wilayah' || form.wilayah_kecamatan === '' || !form.wilayah_id;
    if (!form.survei_id || !form.petugas_id || !form.kegiatan_id) {
      setError('Survei, Petugas, dan Peran wajib dipilih.'); return;
    }
    if (!isNonWilayah && !form.wilayah_id) {
      setError('Silakan pilih Desa / Kelurahan atau pilih opsi Lintas Wilayah.'); return;
    }
    if (!form.tahun || !form.deadline) { setError('Tahun dan Deadline wajib diisi.'); return; }
    if (!form.target_sampel || parseInt(form.target_sampel) < 1) {
      setError('Target Sampel minimal 1.'); return;
    }

    const payload = {
      survei_id:      parseInt(form.survei_id),
      wilayah_id:     form.wilayah_id ? parseInt(form.wilayah_id) : null,
      petugas_id:     parseInt(form.petugas_id),
      kegiatan_id:    parseInt(form.kegiatan_id),
      pemeriksa_id:   form.pemeriksa_id ? parseInt(form.pemeriksa_id) : null,
      tahun:          parseInt(form.tahun),
      target_sampel:  parseInt(form.target_sampel),
      sampel_selesai: parseInt(form.sampel_selesai || '0'),
      catatan:        form.catatan ? form.catatan.trim() : null,
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
            <FormField label="Catatan / Keterangan Sampel" hint="Nama responden, alamat, kontak HP, atau catatan lapangan.">
              <textarea
                value={form.catatan}
                onChange={(e) => f('catatan', e.target.value)}
                placeholder="Contoh: Toko Berkah / Bpk. Ahmad (0812-xxxx-xxxx), RT 04..."
                rows={3}
                className="w-full rounded-xl border border-border-soft dark:border-dark-border-soft bg-bg-page dark:bg-dark-bg-page text-text-primary dark:text-dark-text-primary text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-navy/20 transition-all resize-none"
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
              <FormField label="Kecamatan (Opsional)">
                <Select id="sel-kecamatan" value={form.wilayah_kecamatan}
                  onChange={(e) => { 
                    const val = e.target.value;
                    f('wilayah_kecamatan', val); 
                    f('wilayah_id', ''); 
                  }}>
                  <option value="">-- Pilih Kecamatan / Non-Wilayah --</option>
                  <option value="__none__">🌐 Lintas Wilayah / Seluruh Kabupaten (Non-Wilayah)</option>
                  {kecamatanList.map((k) => <option key={k} value={k}>{k}</option>)}
                </Select>
              </FormField>
              <FormField label="Desa / Kelurahan">
                <Select id="sel-desa" value={form.wilayah_id}
                  onChange={(e) => f('wilayah_id', e.target.value)}
                  disabled={!form.wilayah_kecamatan || form.wilayah_kecamatan === '__none__'}>
                  <option value="">{form.wilayah_kecamatan === '__none__' ? '— Seluruh Wilayah / Non-Wilayah —' : '-- Pilih Desa --'}</option>
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

            <FormField label="Pemeriksa (Pegawai)">
              <Select id="sel-pemeriksa" value={form.pemeriksa_id} onChange={(e) => f('pemeriksa_id', e.target.value)}>
                <option value="">-- Tanpa Pemeriksa Khusus --</option>
                {petugasList.filter(p => p.tipe === 'pegawai').map((p) => (
                  <option key={p.id} value={p.id}>{p.nama}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Catatan / Keterangan Sampel" hint="Opsional. Nama responden, alamat, kontak HP, atau catatan lapangan.">
              <textarea
                value={form.catatan}
                onChange={(e) => f('catatan', e.target.value)}
                placeholder="Contoh: Toko Berkah / Bpk. Ahmad (0812-xxxx-xxxx), RT 04 Desa Terusan..."
                rows={2}
                className="w-full rounded-xl border border-border-soft dark:border-dark-border-soft bg-bg-page dark:bg-dark-bg-page text-text-primary dark:text-dark-text-primary text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-navy/20 transition-all resize-none"
              />
            </FormField>
          </>
        )}
      </div>
    </Modal>
  );
}
