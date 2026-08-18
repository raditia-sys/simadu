import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Modal, { FormField, Input, Select } from '../components/ui/Modal';

const KATEGORI_ICONS = {
  PDF:       '📄',
  Word:      '📝',
  Excel:     '📊',
  PPT:       '📋',
  Gambar:    '🖼️',
  Arsip:     '🗜️',
  default:   '📁',
};

function getIconByMime(mime = '') {
  if (mime.includes('pdf'))        return KATEGORI_ICONS.PDF;
  if (mime.includes('word') || mime.includes('document')) return KATEGORI_ICONS.Word;
  if (mime.includes('sheet') || mime.includes('excel'))   return KATEGORI_ICONS.Excel;
  if (mime.includes('presentation') || mime.includes('powerpoint')) return KATEGORI_ICONS.PPT;
  if (mime.startsWith('image/'))   return KATEGORI_ICONS.Gambar;
  if (mime.includes('zip'))        return KATEGORI_ICONS.Arsip;
  return KATEGORI_ICONS.default;
}

function formatBytes(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024)           return `${bytes} B`;
  if (bytes < 1024 * 1024)    return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ─── Edit modal ───────────────────────────────────────────────────────────────
function EditDokumenModal({ doc, kategoriList, surveys, onClose, onSaved }) {
  const [form, setForm] = useState({
    nama_file:  doc.nama_file,
    kategori:   doc.kategori,
    deskripsi:  doc.deskripsi ?? '',
    survei_id:  doc.survei_id ? String(doc.survei_id) : '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  async function save() {
    if (!form.nama_file.trim()) { setError('Nama file wajib diisi.'); return; }
    setSaving(true);
    const res = await api.put(`/dokumen/${doc.id}`, { ...form, survei_id: form.survei_id || null });
    setSaving(false);
    if (res.success) { onSaved(res.data); onClose(); }
    else setError(res.message);
  }

  return (
    <Modal isOpen onClose={onClose} title="Edit Metadata Dokumen" size="md"
      footer={
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary text-sm px-4 py-2">Batal</button>
          <button onClick={save} disabled={saving} className="btn-primary text-sm px-4 py-2 disabled:opacity-60">
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      }>
      <div className="space-y-4">
        {error && <p className="text-sm text-accent-orange dark:text-dark-accent-orange">{error}</p>}
        <FormField label="Nama Dokumen" required>
          <Input value={form.nama_file} onChange={(e) => setForm(f => ({...f, nama_file: e.target.value}))} />
        </FormField>
        <FormField label="Kategori">
          <Select value={form.kategori} onChange={(e) => setForm(f => ({...f, kategori: e.target.value}))}>
            {kategoriList.map(k => <option key={k}>{k}</option>)}
          </Select>
        </FormField>
        <FormField label="Survei Terkait">
          <Select value={form.survei_id} onChange={(e) => setForm(f => ({...f, survei_id: e.target.value}))}>
            <option value="">— Tidak terkait survei —</option>
            {surveys.map(s => <option key={s.id} value={s.id}>{s.nama_survei}</option>)}
          </Select>
        </FormField>
        <FormField label="Deskripsi">
          <textarea value={form.deskripsi} onChange={(e) => setForm(f => ({...f, deskripsi: e.target.value}))}
            rows={3} className="w-full rounded-xl border border-border-soft dark:border-dark-border-soft bg-bg-page dark:bg-dark-bg-page text-text-primary dark:text-dark-text-primary text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-navy/20 dark:focus:ring-dark-navy/20 transition-all resize-none" />
        </FormField>
      </div>
    </Modal>
  );
}

// ─── Drop zone ────────────────────────────────────────────────────────────────
function UploadZone({ onUpload, uploading }) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);

  function handleFiles(files) {
    if (files.length > 0) onUpload(files[0]);
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all
        ${drag
          ? 'border-navy dark:border-dark-navy bg-navy/4 dark:bg-dark-navy/8'
          : 'border-border-soft dark:border-dark-border-soft hover:border-navy/30 dark:hover:border-dark-navy/40 hover:bg-navy/2 dark:hover:bg-dark-navy/4'
        }`}
    >
      <input ref={inputRef} type="file" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      {uploading ? (
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-navy/20 border-t-navy dark:border-dark-navy/20 dark:border-t-dark-navy rounded-full animate-spin" />
          <p className="text-sm text-text-secondary dark:text-dark-text-secondary">Mengunggah...</p>
        </div>
      ) : (
        <>
          <div className="text-3xl mb-2">📤</div>
          <p className="text-sm font-medium text-text-primary dark:text-dark-text-primary">
            Drag & drop atau klik untuk pilih file
          </p>
          <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-1">
            Maksimal 25 MB · PDF, Word, Excel, PPT, Gambar, ZIP
          </p>
        </>
      )}
    </div>
  );
}

// ─── Halaman utama ────────────────────────────────────────────────────────────
export default function ManajemenDokumenPage() {
  const { user } = useAuth();
  const isSuperadmin = user?.role === 'superadmin';

  const [data,         setData]         = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [kategoriList, setKategoriList] = useState([]);
  const [surveys,      setSurveys]      = useState([]);
  const [q,            setQ]            = useState('');
  const [filterKat,    setFilterKat]    = useState('');
  const [uploading,    setUploading]    = useState(false);
  const [toast,        setToast]        = useState('');
  const [editDoc,      setEditDoc]      = useState(null);
  const [confirmId,    setConfirmId]    = useState(null);
  const [deleting,     setDeleting]     = useState(false);
  const [uploadForm,   setUploadForm]   = useState({ kategori: 'Umum', nama_file: '', survei_id: '' });

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

  const load = async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (q)         p.set('q',       q);
    if (filterKat) p.set('kategori', filterKat);
    const res = await api.get('/dokumen' + (p.toString() ? '?' + p : ''));
    if (res.success) setData(res.data);
    setLoading(false);
  };

  useEffect(() => {
    api.get('/dokumen/kategori').then(r => { if (r.success) setKategoriList(r.data); });
    api.get('/master/survei').then(r => { if (r.success) setSurveys(r.data); });
  }, []);

  useEffect(() => { load(); }, [q, filterKat]);

  async function handleUpload(file) {
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('kategori',  uploadForm.kategori);
    fd.append('nama_file', uploadForm.nama_file || file.name.replace(/\.[^.]+$/, ''));
    if (uploadForm.survei_id) fd.append('survei_id', uploadForm.survei_id);

    const res = await fetch('/api/dokumen/upload', { method: 'POST', credentials: 'include', body: fd });
    const json = await res.json();
    setUploading(false);
    showToast(json.message);
    if (json.success) {
      load();
      setUploadForm(f => ({...f, nama_file: ''}));
    }
  }


  async function handleDelete() {
    setDeleting(true);
    const res = await api.delete(`/dokumen/${confirmId}`);
    setDeleting(false);
    setConfirmId(null);
    showToast(res.message);
    if (res.success) load();
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-xl font-bold text-text-primary dark:text-dark-text-primary">Manajemen Dokumen</h1>
          <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-0.5">
            {loading ? '...' : `${data.length} dokumen`}
          </p>
        </div>
      </div>

      {/* Upload area */}
      <div className="card p-5 space-y-4">
        <h2 className="font-heading font-semibold text-sm text-text-primary dark:text-dark-text-primary">Upload Dokumen Baru</h2>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1 block">Nama (opsional)</label>
            <input value={uploadForm.nama_file}
              onChange={e => setUploadForm(f => ({...f, nama_file: e.target.value}))}
              placeholder="Biarkan kosong = nama file"
              className="w-full text-sm px-3.5 py-2 rounded-xl border border-border-soft dark:border-dark-border-soft bg-bg-page dark:bg-dark-bg-page text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-navy/20 transition-all" />
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1 block">Kategori</label>
            <select value={uploadForm.kategori}
              onChange={e => setUploadForm(f => ({...f, kategori: e.target.value}))}
              className="w-full text-sm px-3.5 py-2 rounded-xl border border-border-soft dark:border-dark-border-soft bg-bg-page dark:bg-dark-bg-page text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-navy/20 transition-all">
              {kategoriList.map(k => <option key={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-1 block">Survei Terkait</label>
            <select value={uploadForm.survei_id}
              onChange={e => setUploadForm(f => ({...f, survei_id: e.target.value}))}
              className="w-full text-sm px-3.5 py-2 rounded-xl border border-border-soft dark:border-dark-border-soft bg-bg-page dark:bg-dark-bg-page text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-navy/20 transition-all">
              <option value="">— Tidak terkait —</option>
              {surveys.map(s => <option key={s.id} value={s.id}>{s.nama_survei}</option>)}
            </select>
          </div>
        </div>
        <UploadZone onUpload={handleUpload} uploading={uploading} />
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari nama dokumen..."
          className="px-3.5 py-2 rounded-xl text-sm border border-border-soft dark:border-dark-border-soft bg-surface dark:bg-dark-surface text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-navy/20 transition-all w-56" />
        <select value={filterKat} onChange={e => setFilterKat(e.target.value)}
          className="px-3.5 py-2 rounded-xl text-sm border border-border-soft dark:border-dark-border-soft bg-surface dark:bg-dark-surface text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-navy/20 transition-all">
          <option value="">Semua Kategori</option>
          {kategoriList.map(k => <option key={k}>{k}</option>)}
        </select>
        {(q || filterKat) && (
          <button onClick={() => { setQ(''); setFilterKat(''); }}
            className="text-sm text-text-secondary hover:text-accent-orange dark:text-dark-text-secondary dark:hover:text-dark-accent-orange transition-colors">
            Reset
          </button>
        )}
      </div>

      {/* Daftar dokumen */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-navy/5 dark:bg-dark-navy/10">
              {['Dokumen','Kategori','Survei','Ukuran','Diunggah oleh','Tanggal','Aksi'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-secondary dark:text-dark-text-secondary uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({length: 5}).map((_, i) => (
                <tr key={i} className="border-t border-border-soft dark:border-dark-border-soft">
                  {Array.from({length: 7}).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-3 rounded-full bg-status-neutral/15 animate-pulse" style={{width: `${40+j*9}%`}} /></td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-text-secondary dark:text-dark-text-secondary">Belum ada dokumen.</td></tr>
            ) : (
              data.map(doc => (
                <tr key={doc.id} className="border-t border-border-soft dark:border-dark-border-soft hover:bg-navy/2 dark:hover:bg-dark-navy/4 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getIconByMime(doc.mime_type)}</span>
                      <span className="text-sm font-medium text-text-primary dark:text-dark-text-primary max-w-48 truncate" title={doc.nama_file}>
                        {doc.nama_file}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-navy/8 text-navy dark:bg-dark-navy/15 dark:text-dark-navy">
                      {doc.kategori}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-secondary dark:text-dark-text-secondary truncate max-w-36">
                    {doc.nama_survei || '—'}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-text-secondary dark:text-dark-text-secondary">
                    {formatBytes(doc.ukuran_byte)}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-secondary dark:text-dark-text-secondary">
                    {doc.uploaded_by_nama || '—'}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-text-secondary dark:text-dark-text-secondary whitespace-nowrap">
                    {doc.uploaded_at?.slice(0, 10)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <a href={`/api/dokumen/download/${doc.id}`} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-text-secondary hover:text-navy hover:bg-navy/8 dark:text-dark-text-secondary dark:hover:text-dark-navy dark:hover:bg-dark-navy/15 transition-all" title="Download">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                      </a>
                      {isSuperadmin && (
                        <>
                          <button onClick={() => setEditDoc(doc)}
                            className="p-1.5 rounded-lg text-text-secondary hover:text-navy hover:bg-navy/8 dark:text-dark-text-secondary dark:hover:text-dark-navy dark:hover:bg-dark-navy/15 transition-all" title="Edit">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                            </svg>
                          </button>
                          <button onClick={() => setConfirmId(doc.id)}
                            className="p-1.5 rounded-lg text-text-secondary hover:text-accent-orange hover:bg-accent-orange/8 dark:text-dark-text-secondary dark:hover:text-dark-accent-orange dark:hover:bg-dark-accent-orange/15 transition-all" title="Hapus">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 px-4 py-3 rounded-xl bg-status-active text-white text-sm shadow-soft-lg">{toast}</div>
      )}

      {/* Edit modal */}
      {editDoc && (
        <EditDokumenModal doc={editDoc} kategoriList={kategoriList} surveys={surveys}
          onClose={() => setEditDoc(null)} onSaved={() => { setEditDoc(null); load(); }} />
      )}

      {/* Confirm delete */}
      <ConfirmDialog
        isOpen={!!confirmId}
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
        loading={deleting}
        message="Hapus dokumen ini? File fisik juga akan dihapus permanen."
      />
    </div>
  );
}
