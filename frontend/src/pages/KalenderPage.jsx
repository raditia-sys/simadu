import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import Modal, { FormField, Input, Select } from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const BULAN = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const HARI  = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
const HARI_LONG = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const BULAN_LONG = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

function formatTanggalIndo(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const dayName = HARI_LONG[dt.getDay()];
  const monthName = BULAN_LONG[m - 1];
  return `${dayName}, ${d} ${monthName} ${y}`;
}

// Warna event per tipe/warna
const WARNA_CLASS = {
  danger:     'bg-red-100 text-red-700 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800/60 font-semibold',
  orange:     'bg-accent-orange/15 text-accent-orange border-accent-orange/30 dark:bg-dark-accent-orange/15 dark:text-dark-accent-orange dark:border-dark-accent-orange/30',
  warning:    'bg-yellow-50 text-yellow-700 border-yellow-300 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-700/50',
  navy:       'bg-navy/10 text-navy border-navy/20 dark:bg-dark-navy/15 dark:text-dark-navy dark:border-dark-navy/30',
  peringatan: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800/60 font-medium',
};

const TIPE_CLASS = {
  deadline:   WARNA_CLASS.orange,
  reminder:   WARNA_CLASS.warning,
  libur:      WARNA_CLASS.danger,
  peringatan: WARNA_CLASS.peringatan,
  umum:       WARNA_CLASS.navy,
  rapat:      'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50',
  pelatihan:  'bg-navy/8 text-navy/70 border-navy/15 dark:bg-dark-navy/10 dark:text-dark-navy/80 dark:border-dark-navy/20',
};

function getTipeClass(evt) {
  if (evt.tipe === 'libur') return TIPE_CLASS.libur;
  if (evt.tipe === 'peringatan') return TIPE_CLASS.peringatan;
  if (evt.warna && WARNA_CLASS[evt.warna]) return WARNA_CLASS[evt.warna];
  return TIPE_CLASS[evt.tipe] || TIPE_CLASS.umum;
}

// ─── Modal Detail Event pada Tanggal Terpilih ─────────────────────────────────
function DayDetailModal({ dateStr, items = [], onClose, onAddEvent, onDeleteItem }) {
  return (
    <Modal
      isOpen
      onClose={onClose}
      title={formatTanggalIndo(dateStr)}
      size="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <button onClick={onClose} className="btn-secondary text-sm px-4 py-2">
            Tutup
          </button>
          <button
            onClick={() => {
              onClose();
              onAddEvent(dateStr);
            }}
            className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Tambah Event
          </button>
        </div>
      }
    >
      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
        {items.length === 0 ? (
          <div className="py-8 text-center text-sm text-text-secondary dark:text-dark-text-secondary">
            <span className="text-3xl block mb-2">📅</span>
            Belum ada agenda atau deadline pada tanggal ini.
          </div>
        ) : (
          items.map((item, idx) => {
            const isCustomEvent = item._source === 'event';
            return (
              <div
                key={item.id || idx}
                className="p-3.5 rounded-2xl border border-border-soft dark:border-dark-border-soft bg-surface dark:bg-dark-surface flex items-start justify-between gap-3 shadow-soft-xs"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs border font-medium ${getTipeClass(item)}`}>
                      {item.tipe === 'deadline' ? '⏰ Deadline Survei' :
                       item.tipe === 'reminder' ? '🔔 Reminder' :
                       item.tipe === 'libur' ? '🔴 Hari Libur' :
                       item.tipe === 'peringatan' ? '🟣 Peringatan' :
                       item.tipe === 'rapat' ? '👥 Rapat' :
                       item.tipe === 'pelatihan' ? '🎓 Pelatihan' : '● Umum'}
                    </span>
                    {item.tanggal_selesai && item.tanggal_selesai !== item.tanggal && (
                      <span className="text-[11px] font-mono text-text-secondary dark:text-dark-text-secondary">
                        sampai {item.tanggal_selesai?.slice(0, 10)}
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-semibold text-text-primary dark:text-dark-text-primary leading-snug">
                    {item.judul}
                  </h4>
                  {item.keterangan && (
                    <p className="text-xs text-text-secondary dark:text-dark-text-secondary leading-relaxed whitespace-pre-line">
                      {item.keterangan}
                    </p>
                  )}
                </div>
                {isCustomEvent && (
                  <button
                    onClick={() => onDeleteItem(item.id)}
                    title="Hapus event"
                    className="p-1.5 rounded-lg text-text-secondary hover:text-accent-orange hover:bg-accent-orange/8 dark:hover:text-dark-accent-orange dark:hover:bg-dark-accent-orange/15 transition-all flex-shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </Modal>
  );
}

// ─── Form tambah event ────────────────────────────────────────────────────────
function EventForm({ initialDate, onClose, onSaved }) {
  const [form, setForm] = useState({
    judul: '', tanggal: initialDate || '', tanggal_selesai: '',
    tipe: 'umum', keterangan: '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  async function save() {
    if (!form.judul.trim() || !form.tanggal) { setError('Judul dan tanggal wajib diisi.'); return; }
    setSaving(true);
    const res = await api.post('/kalender', form);
    setSaving(false);
    if (res.success) { onSaved(); onClose(); }
    else setError(res.message);
  }

  return (
    <Modal isOpen onClose={onClose} title="Tambah Event" size="md"
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
        <FormField label="Judul Event" required>
          <Input value={form.judul} onChange={e => setForm(f => ({...f, judul: e.target.value}))} autoFocus />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Tanggal Mulai" required>
            <Input type="date" value={form.tanggal} onChange={e => setForm(f => ({...f, tanggal: e.target.value}))} />
          </FormField>
          <FormField label="Tanggal Selesai">
            <Input type="date" value={form.tanggal_selesai} onChange={e => setForm(f => ({...f, tanggal_selesai: e.target.value}))} />
          </FormField>
        </div>
        <FormField label="Tipe">
          <Select value={form.tipe} onChange={e => setForm(f => ({...f, tipe: e.target.value}))}>
            <option value="umum">Umum</option>
            <option value="libur">Hari Libur / Tanggal Merah</option>
            <option value="peringatan">Peringatan Hari Besar</option>
            <option value="rapat">Rapat</option>
            <option value="pelatihan">Pelatihan</option>
          </Select>
        </FormField>
        <FormField label="Keterangan">
          <textarea value={form.keterangan} onChange={e => setForm(f => ({...f, keterangan: e.target.value}))}
            rows={2} className="w-full rounded-xl border border-border-soft dark:border-dark-border-soft bg-bg-page dark:bg-dark-bg-page text-text-primary dark:text-dark-text-primary text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-navy/20 transition-all resize-none" />
        </FormField>
      </div>
    </Modal>
  );
}

// ─── Halaman utama ────────────────────────────────────────────────────────────
export default function KalenderPage() {
  const today = new Date();
  const [cur, setCur] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [data, setData]       = useState({ deadlines: [], events: [] });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [clickedDate, setClickedDate] = useState('');
  const [dayModal, setDayModal]     = useState({ open: false, dateStr: '', items: [] });
  const [confirmId, setConfirmId]   = useState(null);
  const [deleting,  setDeleting]    = useState(false);
  const [view, setView] = useState('bulan'); // 'bulan' | 'daftar'

  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  const load = async () => {
    setLoading(true);
    const res = await api.get(`/kalender?tahun=${cur.year}&bulan=${cur.month + 1}`);
    if (res.success) setData(res.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [cur]);

  // Buat map tanggal → events (mendukung rentang multi-hari)
  const allItems = [
    ...data.deadlines.map(d => ({ ...d, _source: 'deadline' })),
    ...data.events.map(e   => ({ ...e, _source: 'event' })),
  ].sort((a, b) => (a.tanggal || '').localeCompare(b.tanggal || ''));

  const byDate = {};
  allItems.forEach(item => {
    const startStr = item.tanggal?.slice(0, 10);
    const endStr   = item.tanggal_selesai?.slice(0, 10);

    if (startStr) {
      if (endStr && endStr > startStr) {
        // Expand tanggal multi-hari
        const start = new Date(startStr);
        const end   = new Date(endStr);
        for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
          const dKey = dt.toISOString().slice(0, 10);
          byDate[dKey] = byDate[dKey] || [];
          byDate[dKey].push(item);
        }
      } else {
        byDate[startStr] = byDate[startStr] || [];
        byDate[startStr].push(item);
      }
    }
  });

  // Grid kalender
  const firstDay   = new Date(cur.year, cur.month, 1).getDay();
  const daysInMonth = new Date(cur.year, cur.month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const nav = (delta) => {
    const d = new Date(cur.year, cur.month + delta, 1);
    setCur({ year: d.getFullYear(), month: d.getMonth() });
  };

  async function handleDeleteEvent(rawId) {
    const numId = String(rawId).replace('event-', '');
    setDeleting(true);
    await api.delete(`/kalender/${numId}`);
    setDeleting(false);
    setConfirmId(null);
    load();
    setDayModal(dm => ({
      ...dm,
      items: dm.items.filter(it => String(it.id) !== String(rawId))
    }));
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-xl font-bold text-text-primary dark:text-dark-text-primary">Kalender & Agenda</h1>
          <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-0.5">
            {BULAN[cur.month]} {cur.year}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center gap-0.5 bg-bg-page dark:bg-dark-bg-page rounded-xl p-0.5 border border-border-soft dark:border-dark-border-soft">
            {['bulan','daftar'].map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all
                  ${view === v ? 'bg-surface dark:bg-dark-surface text-text-primary dark:text-dark-text-primary shadow-sm' : 'text-text-secondary dark:text-dark-text-secondary'}`}>
                {v === 'bulan' ? 'Bulanan' : 'Daftar'}
              </button>
            ))}
          </div>

          {/* Navigasi */}
          <button onClick={() => nav(-1)} className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-navy/8 dark:hover:bg-dark-navy/15 transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
          </button>
          <button onClick={() => setCur({ year: today.getFullYear(), month: today.getMonth() })}
            className="px-3 py-1.5 rounded-xl text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-navy/8 dark:hover:bg-dark-navy/15 transition-all">
            Hari ini
          </button>
          <button onClick={() => nav(1)} className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-navy/8 dark:hover:bg-dark-navy/15 transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
          </button>

          <button onClick={() => { setClickedDate(todayStr); setShowForm(true); }}
            className="btn-primary flex items-center gap-1.5 text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            Tambah Event
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        {[
          { label: 'Hari Libur / Tanggal Merah', cls: 'bg-red-100 border-red-300' },
          { label: 'Peringatan Hari Besar',     cls: 'bg-purple-100 border-purple-300' },
          { label: 'Deadline Survei',           cls: 'bg-accent-orange/20 border-accent-orange/40' },
          { label: 'Umum',                      cls: 'bg-navy/10 border-navy/25' },
          { label: 'Rapat',                     cls: 'bg-emerald-100 border-emerald-300' },
        ].map(({ label, cls }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={`w-3 h-2 rounded-sm border ${cls}`} />
            <span className="text-xs text-text-secondary dark:text-dark-text-secondary">{label}</span>
          </div>
        ))}
      </div>

      {/* ── BULAN view ──────────────────────────────────────────────────────── */}
      {view === 'bulan' && (
        <div className="card overflow-hidden">
          {/* Hari header */}
          <div className="grid grid-cols-7 border-b border-border-soft dark:border-dark-border-soft">
            {HARI.map((h, i) => (
              <div key={h} className={`py-3 text-center text-xs font-semibold uppercase tracking-wide ${i === 0 ? 'text-red-500 dark:text-red-400' : 'text-text-secondary dark:text-dark-text-secondary'}`}>
                {h}
              </div>
            ))}
          </div>

          {/* Sel tanggal */}
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              if (!day) return <div key={`e-${i}`} className="border-r border-b border-border-soft dark:border-dark-border-soft min-h-24" />;

              const dateStr = `${cur.year}-${String(cur.month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
              const isToday = dateStr === todayStr;
              const dayItems = byDate[dateStr] || [];
              const isSunday = (i % 7 === 0);
              const isHoliday = dayItems.some(it => it.tipe === 'libur');

              return (
                <div key={dateStr}
                  onClick={() => setDayModal({ open: true, dateStr, items: dayItems })}
                  className={`border-r border-b border-border-soft dark:border-dark-border-soft min-h-24 p-1.5 cursor-pointer hover:bg-navy/2 dark:hover:bg-dark-navy/4 transition-colors ${i % 7 === 0 ? 'border-l-0' : ''} ${isHoliday ? 'bg-red-50/30 dark:bg-red-950/10' : ''}`}>
                  <div className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1
                    ${isToday
                      ? 'bg-navy text-white dark:bg-dark-navy'
                      : isHoliday || isSunday
                        ? 'text-red-600 dark:text-red-400 font-bold'
                        : 'text-text-primary dark:text-dark-text-primary'}`}>
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {dayItems.slice(0, 3).map((item, j) => (
                      <div key={j} className={`text-xs px-1.5 py-0.5 rounded border truncate ${getTipeClass(item)}`} title={item.judul}>
                        {item.tipe === 'libur' ? '🔴 ' : item.tipe === 'peringatan' ? '🟣 ' : ''}{item.judul}
                      </div>
                    ))}
                    {dayItems.length > 3 && (
                      <div className="text-xs text-text-secondary dark:text-dark-text-secondary px-1">+{dayItems.length - 3}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── DAFTAR view ─────────────────────────────────────────────────────── */}
      {view === 'daftar' && (
        <div className="card divide-y divide-border-soft dark:divide-dark-border-soft">
          {loading ? (
            Array.from({length: 5}).map((_, i) => (
              <div key={i} className="px-5 py-4 space-y-1.5">
                <div className="h-3 w-1/3 rounded-full bg-status-neutral/15 animate-pulse" />
                <div className="h-2.5 w-2/3 rounded-full bg-status-neutral/10 animate-pulse" />
              </div>
            ))
          ) : allItems.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-text-secondary dark:text-dark-text-secondary">
              Tidak ada event bulan ini.
            </div>
          ) : (
            allItems.map((item, i) => (
              <div key={i} className="px-5 py-3 flex items-start justify-between gap-3 hover:bg-navy/2 dark:hover:bg-dark-navy/4 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 px-2 py-0.5 rounded-full text-xs border ${getTipeClass(item)} flex-shrink-0`}>
                    {item.tipe === 'deadline' ? '⏰' : item.tipe === 'reminder' ? '🔔' : item.tipe === 'libur' ? '🔴' : item.tipe === 'peringatan' ? '🟣' : item.tipe === 'rapat' ? '👥' : '●'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary dark:text-dark-text-primary">{item.judul}</p>
                    {item.keterangan && (
                      <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-0.5">{item.keterangan}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-mono text-text-secondary dark:text-dark-text-secondary">
                    {item.tanggal?.slice(0, 10)}
                  </span>
                  {item._source === 'event' && (
                    <button onClick={() => setConfirmId(item.id)}
                      className="p-1 rounded-lg text-text-secondary hover:text-accent-orange hover:bg-accent-orange/8 dark:hover:text-dark-accent-orange dark:hover:bg-dark-accent-orange/15 transition-all">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal Detail Event Tanggal Terpilih */}
      {dayModal.open && (
        <DayDetailModal
          dateStr={dayModal.dateStr}
          items={dayModal.items}
          onClose={() => setDayModal({ open: false, dateStr: '', items: [] })}
          onAddEvent={(dt) => {
            setClickedDate(dt);
            setShowForm(true);
          }}
          onDeleteItem={(id) => setConfirmId(id)}
        />
      )}

      {/* Modal form tambah event */}
      {showForm && (
        <EventForm initialDate={clickedDate} onClose={() => setShowForm(false)} onSaved={load} />
      )}

      <ConfirmDialog
        isOpen={!!confirmId}
        onConfirm={() => handleDeleteEvent(confirmId)}
        onCancel={() => setConfirmId(null)}
        loading={deleting}
        message="Hapus event ini?"
      />
    </div>
  );
}
