import { useEffect, useRef, useState } from 'react';
import {
    ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Bell, CalendarDays, Check, ChevronLeft, ChevronRight, CircleDollarSign,
    CreditCard, Database, Download, FileUp, Landmark, LayoutGrid, Menu, MoreHorizontal, Pencil, PiggyBank, Plus, ReceiptText,
    Search, Settings2, Smartphone, Sparkles, Target, Trash2, TrendingUp, WalletCards, X,
} from 'lucide-react';
import { Chart, Filler, LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip } from 'chart.js';

Chart.register(Filler, LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip);

const money = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
const rupiah = (amount) => money.format(amount || 0);
const cls = (...names) => names.filter(Boolean).join(' ');
const accountElement = document.getElementById('app');
const initialAccount = {
    name: accountElement?.dataset.userName || 'Akun',
    email: accountElement?.dataset.userEmail || '',
    palette: accountElement?.dataset.userPalette || 'emerald',
};

const pages = [
    ['dashboard', LayoutGrid, 'Ringkasan'],
    ['wallet', WalletCards, 'Dompet'],
    ['transactions', ReceiptText, 'Transaksi'],
    ['calendar', CalendarDays, 'Kalender'],
    ['paylater', CreditCard, 'Paylater'],
    ['analysis', TrendingUp, 'Analisis'],
    ['settings', Settings2, 'Pengaturan'],
];

function apiRequest(url, options = {}) {
    const token = document.querySelector('meta[name="csrf-token"]')?.content;
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    return fetch(url, {
        ...options,
        headers: {
            Accept: 'application/json',
            ...(options.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
            ...(token ? { 'X-CSRF-TOKEN': token } : {}),
            ...options.headers,
        },
    }).catch((error) => {
        if (error instanceof TypeError) {
            throw new Error('Server Laravel tidak dapat dijangkau. Pastikan server tetap berjalan lalu muat ulang halaman.');
        }
        throw error;
    }).then(async (response) => {
        if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            const message = body.message || Object.values(body.errors || {}).flat().join(' ') || `Permintaan gagal (${response.status}).`;
            throw new Error(message);
        }
        return response.status === 204 ? null : response.json();
    });
}

function formatDate(value) {
    return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
        .format(new Date(`${value}T00:00:00`));
}

function dateToISO(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function normalizeTransaction(transaction) {
    const income = transaction.type === 'income';
    const title = transaction.description;
    return {
        id: transaction.id,
        icon: title.slice(0, 1).toUpperCase(),
        color: income ? 'bg-[var(--accent)] text-[var(--accent-contrast)]' : 'bg-red-500 text-white',
        title,
        category: transaction.category,
        date: formatDate(transaction.transaction_date),
        transactionDate: transaction.transaction_date,
        amount: Number(transaction.amount) * (income ? 1 : -1),
        wallet: transaction.wallet || 'bank',
    };
}

function normalizeSchedule(schedule) {
    return {
        id: schedule.id,
        description: schedule.description,
        amount: Number(schedule.amount),
        day: Number(schedule.day_of_month),
        category: schedule.category,
        wallet: schedule.wallet,
        enabled: Boolean(schedule.enabled),
    };
}

function normalizeBill(bill) {
    const dueDate = typeof bill.due_date === 'string' ? bill.due_date.slice(0, 10) : bill.due_date;
    return {
        id: bill.id,
        brand: bill.brand,
        amount: Number(bill.amount),
        dueDate,
        due: formatDate(dueDate),
        month: new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(new Date(`${dueDate}T00:00:00`)),
        paid: Boolean(bill.paid),
        letter: bill.brand.slice(0, 1).toUpperCase(),
    };
}

function LineChart({ records }) {
    const chartRef = useRef(null);
    useEffect(() => {
        const context = chartRef.current?.getContext('2d');
        if (!context) return undefined;
        const styles = getComputedStyle(document.body);
        const accent = styles.getPropertyValue('--accent').trim();
        const accentRgb = styles.getPropertyValue('--accent-rgb').trim().split(/\s+/).join(', ');
        const panelBackground = styles.getPropertyValue('--panel-bg').trim();
        const panelBorder = styles.getPropertyValue('--panel-border').trim();
        const now = new Date();
        const months = Array.from({ length: 6 }, (_, index) => {
            const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
            return {
                key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
                label: new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(date),
                total: 0,
            };
        });
        const totalsByMonth = new Map(months.map((month) => [month.key, month]));
        records.forEach((record) => {
            const month = totalsByMonth.get(record.transactionDate?.slice(0, 7));
            if (month) month.total += record.amount;
        });
        const fill = context.createLinearGradient(0, 0, 0, 230);
        fill.addColorStop(0, `rgba(${accentRgb}, 0.22)`);
        fill.addColorStop(1, `rgba(${accentRgb}, 0)`);
        const chart = new Chart(context, {
            type: 'line',
            data: { labels: months.map((month) => month.label), datasets: [{ data: months.map((month) => month.total / 1000000), borderColor: accent, backgroundColor: fill, borderWidth: 2.3, fill: true, tension: .42, pointRadius: 3 }] },
            options: { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { display: false }, tooltip: { displayColors: false, backgroundColor: panelBackground, titleColor: '#0F172A', bodyColor: accent } }, scales: { x: { grid: { display: false }, border: { display: false }, ticks: { color: '#71717A', font: { size: 11 } } }, y: { grid: { color: panelBorder }, border: { display: false }, ticks: { color: '#71717A', callback: (value) => `${value}jt` } } } },
        });
        return () => chart.destroy();
    }, [records]);
    return <div className="h-56"><canvas ref={chartRef} /></div>;
}

function Nav({ active, onChange, unpaid }) {
    return <nav className="space-y-1">{pages.map(([id, Icon, label], index) => <div key={id}>{index === 5 && <div className="my-5 border-t border-[var(--panel-border)]" />}<button onClick={() => onChange(id)} className={cls('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition', active === id ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800')}><Icon size={18} /><span className="flex-1 text-left">{label}</span>{id === 'paylater' && unpaid > 0 && <span className="rounded-md bg-[var(--accent)] px-1.5 py-0.5 text-[9px] font-extrabold text-[var(--accent-contrast)]">{unpaid}</span>}</button></div>)}</nav>;
}

function PageTitle({ title, subtitle, action, onAction }) {
    return <div className="mb-7 flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">DompetGweh</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight">{title}</h1><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div>{action && <button onClick={onAction} className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-xs font-extrabold text-[var(--accent-contrast)] hover:bg-[var(--accent-hover)]"><Plus size={16} strokeWidth={3} />{action}</button>}</div>;
}

function TransactionRows({ records, onDelete, onEdit }) {
    if (!records.length) return <div className="p-8 text-center text-xs text-slate-500">Belum ada transaksi yang sesuai.</div>;
    return <div className="divide-y divide-[var(--panel-border)]">{records.map((record) => <div key={record.id} className="flex items-center gap-3 px-5 py-4 sm:px-6"><div className={cls('grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-extrabold', record.color)}>{record.icon}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-slate-800">{record.title}</p><p className="mt-0.5 text-[10px] text-slate-500">{record.category} · {record.date}</p></div><p className={cls('text-right text-xs font-extrabold', record.amount > 0 ? 'text-[var(--accent)]' : 'text-slate-800')}>{record.amount > 0 ? '+' : '−'}{rupiah(Math.abs(record.amount))}</p>{onEdit && <button onClick={() => onEdit(record)} aria-label={`Edit transaksi ${record.title}`} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800"><Pencil size={15} /></button>}{onDelete && <button onClick={() => onDelete(record.id)} aria-label={`Hapus transaksi ${record.title}`} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500"><Trash2 size={15} /></button>}</div>)}</div>;
}

function LegacyTransactionModal({ onClose, onSave, transaction }) {
    const [form, setForm] = useState(() => transaction ? {
        title: transaction.title,
        amount: String(Math.abs(transaction.amount)),
        type: transaction.amount < 0 ? 'expense' : 'income',
        category: transaction.category,
        wallet: transaction.wallet,
        transaction_date: transaction.transactionDate,
    } : { title: '', amount: '', type: 'expense', category: 'Pengeluaran', wallet: 'bank', transaction_date: dateToISO(new Date()) });
    const [error, setError] = useState('');
    const submit = async (event) => {
        event.preventDefault();
        setError('');
        try {
            await onSave({ ...form, amount: Number(form.amount) }, transaction?.id);
            onClose();
        } catch (requestError) {
            setError(requestError.message);
        }
    };
    const deleteBill = async (id) => {
        try {
            await apiRequest(`/api/paylater/${id}`, { method: 'DELETE' });
            setBills((current) => current.filter((bill) => bill.id !== id));
            toast('Tagihan paylater dihapus');
        } catch (error) {
            toast(`Tagihan paylater gagal dihapus: ${error.message}`);
        }
    };
    const inputClass = 'mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--app-bg)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]';
    return <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/30 p-4 backdrop-blur-sm"><form onSubmit={submit} className="my-auto w-full max-w-md rounded-[22px] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-6"><div className="mb-6 flex items-center justify-between"><div><p className="eyebrow">Quick entry</p><h2 className="mt-1 text-xl font-bold">{transaction ? 'Edit transaksi' : 'Catat transaksi'}</h2></div><button type="button" onClick={onClose} className="p-2 text-slate-500"><X size={18} /></button></div><label className="mb-4 block text-xs font-bold text-slate-500">DESKRIPSI<input autoFocus required maxLength="255" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Contoh: Belanja bulanan" className={inputClass} /></label><label className="mb-4 block text-xs font-bold text-slate-500">NOMINAL<input required type="number" min="1" step="1" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="0" className={inputClass} /></label><div className="mb-4 grid grid-cols-2 gap-3"><button type="button" onClick={() => setForm({ ...form, type: 'expense', category: 'Pengeluaran' })} className={cls('rounded-xl border py-3 text-sm font-bold', form.type === 'expense' ? 'border-red-400 bg-red-50 text-red-500' : 'border-[var(--panel-border)] text-slate-500')}>Pengeluaran</button><button type="button" onClick={() => setForm({ ...form, type: 'income', category: 'Pemasukan' })} className={cls('rounded-xl border py-3 text-sm font-bold', form.type === 'income' ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]' : 'border-[var(--panel-border)] text-slate-500')}>Pemasukan</button></div><label className="mb-4 block text-xs font-bold text-slate-500">KATEGORI<input required maxLength="255" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className={inputClass} /></label><label className="mb-4 block text-xs font-bold text-slate-500">TANGGAL<input required type="date" value={form.transaction_date} onChange={(event) => setForm({ ...form, transaction_date: event.target.value })} className={inputClass} /></label><label className="mb-5 block text-xs font-bold text-slate-500">SUMBER DANA<select value={form.wallet} onChange={(event) => setForm({ ...form, wallet: event.target.value })} className={inputClass}><option value="bank">Saldo rekening</option><option value="cash">Uang tunai</option></select></label>{error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-500">{error}</p>}<button className="w-full rounded-xl bg-[var(--accent)] py-3.5 text-sm font-extrabold text-[var(--accent-contrast)]">{transaction ? 'Simpan perubahan' : 'Simpan transaksi'}</button></form></div>;
}

function BillModal({ onClose, onSave }) {
    const [form, setForm] = useState({ brand: '', amount: '', due: '' });
    const [error, setError] = useState('');
    const submit = async (event) => {
        event.preventDefault();
        setError('');
        try {
            await onSave({ ...form, brand: form.brand.trim(), amount: Number(form.amount) });
            onClose();
        } catch (requestError) {
            setError(requestError.message);
        }
    };
    return <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4 backdrop-blur-sm"><form onSubmit={submit} className="w-full max-w-md rounded-[22px] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-6"><div className="mb-6 flex items-center justify-between"><div><p className="eyebrow">Paylater planner</p><h2 className="mt-1 text-xl font-bold">Tambah tagihan</h2></div><button type="button" onClick={onClose} className="p-2 text-slate-500"><X size={18} /></button></div><label className="mb-4 block text-xs font-bold text-slate-500">PENYEDIA<input required maxLength="255" value={form.brand} onChange={(event) => setForm({ ...form, brand: event.target.value })} placeholder="Contoh: Kredivo" className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--app-bg)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]" /></label><label className="mb-4 block text-xs font-bold text-slate-500">NOMINAL<input required type="number" min="1" step="1" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="0" className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--app-bg)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]" /></label><label className="mb-6 block text-xs font-bold text-slate-500">JATUH TEMPO<input required type="date" value={form.due} onChange={(event) => setForm({ ...form, due: event.target.value })} className="mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--app-bg)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]" /></label>{error && <p role="alert" className="mb-4 text-sm text-red-500">{error}</p>}<button className="w-full rounded-xl bg-[var(--accent)] py-3.5 text-sm font-extrabold text-[var(--accent-contrast)]">Simpan tagihan</button></form></div>;
}

function LegacyDashboard({ wallets, records, bills, recurringIncomes, go }) {
    const balance = wallets.bank + wallets.cash;
    const expense = records.filter((record) => record.amount < 0).reduce((sum, record) => sum + Math.abs(record.amount), 0);
    const now = new Date();
    const currentMonthRecords = records.filter((record) => {
        const date = new Date(`${record.transactionDate}T00:00:00`);
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });
    const monthIncome = currentMonthRecords.filter((record) => record.amount > 0).reduce((sum, record) => sum + record.amount, 0);
    const monthExpense = currentMonthRecords.filter((record) => record.amount < 0).reduce((sum, record) => sum + Math.abs(record.amount), 0);
    const remaining = bills.filter((bill) => !bill.paid).reduce((sum, bill) => sum + bill.amount, 0);
    const billMonths = Array.from({ length: 6 }, (_, index) => {
        const date = new Date(now.getFullYear(), now.getMonth() + index, 1);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        return { key, label: new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(date), bills: bills.filter((bill) => !bill.paid && bill.dueDate?.startsWith(key)) };
    });
    const activeSchedules = recurringIncomes.filter((schedule) => schedule.enabled);
    return <><PageTitle title="Ringkasan keuangan" subtitle="Berikut posisi finansialmu hari ini." /><section className="grid gap-4 xl:grid-cols-12"><div className="panel rounded-[20px] p-6 xl:col-span-5"><div className="flex justify-between"><div><p className="eyebrow">Total uang tersedia</p><p className="mt-3 text-3xl font-extrabold">{rupiah(balance)}</p><p className="mt-3 flex items-center gap-2 text-[11px] font-bold text-[var(--accent)]"><TrendingUp size={14} /> Arus kas terpantau</p></div><button aria-label="Buka dompet" onClick={() => go('wallet')} className="rounded-xl border border-[var(--panel-border)] p-2.5 text-slate-500"><MoreHorizontal size={18} /></button></div><div className="mt-8 grid grid-cols-2 gap-3"><button onClick={() => go('wallet')} className="panel-soft rounded-xl p-3.5 text-left hover:border-[var(--accent)]/50"><Landmark size={15} className="mb-3 text-[var(--accent)]" /><p className="text-[10px] font-bold uppercase text-slate-500">Saldo rekening</p><p className="mt-1 text-sm font-extrabold">{rupiah(wallets.bank)}</p></button><button onClick={() => go('wallet')} className="panel-soft rounded-xl p-3.5 text-left hover:border-[var(--accent)]/50"><CircleDollarSign size={15} className="mb-3 text-slate-700" /><p className="text-[10px] font-bold uppercase text-slate-500">Uang tunai</p><p className="mt-1 text-sm font-extrabold">{rupiah(wallets.cash)}</p></button></div></div><div className="panel rounded-[20px] p-6 xl:col-span-3"><div className="flex justify-between"><div><p className="eyebrow">Pemasukan bulan ini</p><p className="mt-3 text-xl font-extrabold">{rupiah(monthIncome)}</p></div><ArrowDownLeft className="text-[var(--accent)]" /></div><button onClick={() => go('settings')} className="mt-7 text-left text-xs text-slate-500">{activeSchedules.length ? `${activeSchedules.length} jadwal aktif: ${activeSchedules.map((schedule) => `tgl ${schedule.day}`).join(', ')}` : 'Atur pemasukan otomatis bulanan'} <span className="font-bold text-[var(--accent)]">→</span></button><p className="mt-2 text-xs text-slate-500">Pengeluaran bulan ini {rupiah(monthExpense)}</p><div className="mt-2 h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${monthIncome ? Math.min(100, (monthExpense / monthIncome) * 100) : 0}%` }} /></div></div><div className="panel rounded-[20px] p-6 xl:col-span-4"><div className="flex justify-between"><div><p className="eyebrow">Total pengeluaran</p><p className="mt-3 text-xl font-extrabold">{rupiah(expense)}</p></div><ArrowUpRight className="text-red-500" /></div><button onClick={() => go('transactions')} className="mt-7 text-xs font-bold text-[var(--accent)]">Buka riwayat transaksi →</button></div></section><section className="mt-4 grid gap-4 xl:grid-cols-12"><div className="panel rounded-[20px] p-6 xl:col-span-7"><div className="flex justify-between"><div><p className="text-sm font-extrabold">Arus kas</p><p className="mt-1 text-[11px] text-slate-500">Selisih pemasukan dan pengeluaran per bulan</p></div><button onClick={() => go('analysis')} className="text-xs font-bold text-[var(--accent)]">Analisis</button></div><LineChart records={records} /></div><div className="panel rounded-[20px] p-6 xl:col-span-5"><div className="flex justify-between"><div><p className="text-sm font-extrabold">Tagihan paylater</p><p className="mt-1 text-[11px] text-slate-500">6 bulan ke depan</p></div><b className="text-xs text-red-500">{rupiah(remaining)}</b></div><div className="mt-6 grid grid-cols-6 gap-2">{billMonths.map((month) => <div key={month.key}><p className="mb-2 text-center text-[9px] text-slate-400">{month.label}</p><div className={cls('h-1.5 rounded-full', month.bills.length ? 'bg-slate-200' : 'bg-[var(--accent)]/30')} /></div>)}</div><button onClick={() => go('paylater')} className="mt-7 w-full rounded-xl border border-[var(--panel-border)] py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100">Kelola tagihan</button></div></section><section className="panel mt-4 overflow-hidden rounded-[20px]"><div className="flex justify-between border-b border-[var(--panel-border)] px-6 py-5"><div><p className="text-sm font-extrabold">Aktivitas terbaru</p><p className="mt-1 text-[11px] text-slate-500">Transaksi yang tercatat</p></div><button onClick={() => go('transactions')} className="text-xs font-bold text-[var(--accent)]">Lihat semua</button></div><TransactionRows records={records.slice(0, 4)} /></section></>;
}

function LegacyWallet({ wallets, save, add }) {
    const [editing, setEditing] = useState(null);
    const [amount, setAmount] = useState('');
    const submit = (event) => { event.preventDefault(); if (Number(amount) >= 0) { save(editing, Number(amount)); setEditing(null); } };
    const card = (key, label, Icon, text) => <div className="panel rounded-[20px] p-6"><div className="flex justify-between"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]"><Icon size={20} /></span><button aria-label={`Atur ${label}`} onClick={() => { setEditing(key); setAmount(String(wallets[key])); }} className="rounded-lg border border-[var(--panel-border)] p-2 text-slate-500"><Pencil size={15} /></button></div><p className="mt-6 text-[11px] font-bold uppercase text-slate-500">{label}</p><p className="mt-2 text-2xl font-extrabold">{rupiah(wallets[key])}</p><p className="mt-2 text-xs text-slate-500">{text}</p></div>;
    return <><PageTitle title="Dompet" subtitle="Kelola uang tunai dan saldo rekening." action="Catat transaksi" onAction={add} /><div className="grid gap-4 md:grid-cols-2">{card('bank', 'Saldo rekening', Landmark, 'Dana pada rekening utama')}{card('cash', 'Uang tunai', CircleDollarSign, 'Uang fisik yang tersedia')}</div><div className="panel mt-4 rounded-[20px] p-6 text-sm leading-6 text-slate-500">Saldo berubah otomatis dari transaksi. Tombol pensil menyesuaikan saldo awal dompet ini.</div>{editing && <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4"><form onSubmit={submit} className="w-full max-w-sm rounded-[20px] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-6"><div className="flex justify-between"><h2 className="text-lg font-bold">Sesuaikan saldo saat ini</h2><button type="button" onClick={() => setEditing(null)} aria-label="Tutup"><X size={18} /></button></div><input aria-label="Saldo" autoFocus required type="number" min="0" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-5 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--app-bg)] px-4 py-3 outline-none focus:border-[var(--accent)]" /><button className="mt-4 w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-bold text-[var(--accent-contrast)]">Simpan saldo</button></form></div>}</>;
}

function DynamicTransactionModal({ onClose, onSave, transaction }) {
    const [wallets, setWallets] = useState([]);
    const [form, setForm] = useState(() => transaction ? {
        title: transaction.title,
        amount: String(Math.abs(transaction.amount)),
        type: transaction.amount < 0 ? 'expense' : 'income',
        category: transaction.category,
        wallet: transaction.wallet,
        transaction_date: transaction.transactionDate,
    } : { title: '', amount: '', type: 'expense', category: 'Pengeluaran', wallet: '', transaction_date: dateToISO(new Date()) });
    const [error, setError] = useState('');

    useEffect(() => {
        apiRequest('/api/wallets').then((items) => {
            setWallets(items);
            setForm((current) => ({ ...current, wallet: current.wallet || items[0]?.slug || '' }));
        }).catch((requestError) => setError(requestError.message));
    }, []);

    const submit = async (event) => {
        event.preventDefault();
        setError('');
        try {
            await onSave({ ...form, title: form.title.trim(), category: form.category.trim(), amount: Number(form.amount) }, transaction?.id);
            onClose();
        } catch (requestError) {
            setError(requestError.message);
        }
    };

    const inputClass = 'mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--app-bg)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]';
    return <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/30 p-4 backdrop-blur-sm"><form onSubmit={submit} className="my-auto w-full max-w-md rounded-[22px] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-6"><div className="mb-6 flex items-center justify-between"><div><p className="eyebrow">Quick entry</p><h2 className="mt-1 text-xl font-bold">{transaction ? 'Edit transaksi' : 'Catat transaksi'}</h2></div><button type="button" onClick={onClose} className="p-2 text-slate-500"><X size={18} /></button></div><label className="mb-4 block text-xs font-bold text-slate-500">DESKRIPSI<input autoFocus required maxLength="255" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Contoh: Belanja bulanan" className={inputClass} /></label><label className="mb-4 block text-xs font-bold text-slate-500">NOMINAL<input required type="number" min="1" step="1" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="0" className={inputClass} /></label><div className="mb-4 grid grid-cols-2 gap-3"><button type="button" onClick={() => setForm({ ...form, type: 'expense', category: 'Pengeluaran' })} className={cls('rounded-xl border py-3 text-sm font-bold', form.type === 'expense' ? 'border-red-400 bg-red-50 text-red-500' : 'border-[var(--panel-border)] text-slate-500')}>Pengeluaran</button><button type="button" onClick={() => setForm({ ...form, type: 'income', category: 'Pemasukan' })} className={cls('rounded-xl border py-3 text-sm font-bold', form.type === 'income' ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]' : 'border-[var(--panel-border)] text-slate-500')}>Pemasukan</button></div><label className="mb-4 block text-xs font-bold text-slate-500">KATEGORI<input required maxLength="255" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className={inputClass} /></label><label className="mb-5 block text-xs font-bold text-slate-500">SUMBER DANA<select required value={form.wallet} onChange={(event) => setForm({ ...form, wallet: event.target.value })} className={inputClass}>{wallets.map((wallet) => <option key={wallet.id} value={wallet.slug}>{wallet.name}</option>)}</select></label><label className="mb-6 block text-xs font-bold text-slate-500">TANGGAL<input required type="date" value={form.transaction_date} onChange={(event) => setForm({ ...form, transaction_date: event.target.value })} className={inputClass} /></label>{error && <p role="alert" className="mb-4 text-sm text-red-500">{error}</p>}<button disabled={!wallets.length} className="w-full rounded-xl bg-[var(--accent)] py-3.5 text-sm font-extrabold text-white disabled:opacity-50">Simpan transaksi</button></form></div>;
}

function Dashboard({ wallets, records, bills, recurringIncomes, go }) {
    const [walletList, setWalletList] = useState([]);
    const [budgets, setBudgets] = useState([]);
    const [category, setCategory] = useState('');
    const [limit, setLimit] = useState('');
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const balance = Object.values(wallets).reduce((sum, amount) => sum + amount, 0);
    const currentMonthRecords = records.filter((record) => record.transactionDate?.startsWith(month));
    const monthIncome = currentMonthRecords.filter((record) => record.amount > 0).reduce((sum, record) => sum + record.amount, 0);
    const monthExpense = currentMonthRecords.filter((record) => record.amount < 0).reduce((sum, record) => sum + Math.abs(record.amount), 0);

    const loadBudgets = async () => setBudgets(await apiRequest(`/api/budgets?month=${month}`));
    useEffect(() => {
        apiRequest('/api/wallets').then(setWalletList).catch(() => {});
        const refreshBudgets = () => loadBudgets().catch(() => {});
        refreshBudgets();
        window.addEventListener('budget-data-changed', refreshBudgets);
        return () => window.removeEventListener('budget-data-changed', refreshBudgets);
    }, [month]);

    const saveBudget = async (event) => {
        event.preventDefault();
        try {
            await apiRequest('/api/budgets', { method: 'POST', body: JSON.stringify({ category: category.trim(), amount: Number(limit), month }) });
            setCategory('');
            setLimit('');
            await loadBudgets();
        } catch (error) {
            window.alert(`Budget gagal disimpan: ${error.message}`);
        }
    };

    const removeBudget = async (id) => {
        try {
            await apiRequest(`/api/budgets/${id}`, { method: 'DELETE' });
            setBudgets((current) => current.filter((budget) => budget.id !== id));
        } catch (error) {
            window.alert(`Budget gagal dihapus: ${error.message}`);
        }
    };

    const inputClass = 'w-full rounded-lg border border-[var(--panel-border)] bg-white px-3 py-2.5 text-xs outline-none focus:border-[var(--primary)]';
    return <><PageTitle title="Ringkasan keuangan" subtitle="Posisi finansial dan anggaranmu bulan ini." /><section className="grid gap-4 xl:grid-cols-12"><div className="panel rounded-[20px] p-6 xl:col-span-6"><p className="eyebrow">Total uang tersedia</p><p className="mt-3 text-3xl font-extrabold">{rupiah(balance)}</p><p className="mt-2 text-xs text-slate-500">Di {walletList.length} rekening dan dompet</p><div className="mt-6 grid grid-cols-2 gap-3">{walletList.slice(0, 4).map((wallet) => <button key={wallet.id} onClick={() => go('wallet')} className="panel-soft min-w-0 rounded-xl p-3 text-left hover:border-[var(--accent)]"><p className="truncate text-[10px] font-bold uppercase text-slate-500">{wallet.name}</p><p className="mt-1 truncate text-sm font-extrabold">{rupiah(wallets[wallet.slug] || 0)}</p></button>)}</div></div><Stat title="Pemasukan bulan ini" value={rupiah(monthIncome)} tone="text-[var(--primary)]" /><Stat title="Pengeluaran bulan ini" value={rupiah(monthExpense)} tone="text-red-500" /></section><section className="panel mt-4 rounded-[20px] p-6"><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-extrabold">Budget bulan ini</p><p className="mt-1 text-xs text-slate-500">{new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(now)}</p></div><form onSubmit={saveBudget} className="grid w-full gap-2 sm:grid-cols-[1fr_160px_auto] sm:w-auto"><input required maxLength="80" value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Kategori, mis. Makanan" className={inputClass} /><input required type="number" min="1" step="1" value={limit} onChange={(event) => setLimit(event.target.value)} placeholder="Batas Rp" className={inputClass} /><button className="rounded-lg bg-[var(--primary)] px-4 py-2.5 text-xs font-bold text-white">Simpan budget</button></form></div>{budgets.length ? <div className="divide-y divide-[var(--panel-border)]">{budgets.map((budget) => <div key={budget.id} className="py-4 first:pt-0 last:pb-0"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold">{budget.category}</p><p className="mt-1 text-[10px] text-slate-500">{rupiah(Number(budget.spent))} dari {rupiah(Number(budget.amount))}</p></div><div className="flex items-center gap-3"><span className={cls('text-xs font-bold', budget.is_over ? 'text-red-600' : 'text-slate-600')}>{budget.percentage}%</span><button aria-label={`Hapus budget ${budget.category}`} onClick={() => removeBudget(budget.id)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 size={15} /></button></div></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className={cls('h-full rounded-full', budget.is_over ? 'bg-red-500' : 'bg-[var(--accent)]')} style={{ width: `${Math.min(100, budget.percentage)}%` }} /></div></div>)}</div> : <p className="text-xs text-slate-500">Belum ada budget bulan ini. Tambahkan limit per kategori di atas.</p>}</section></>;
}

function Wallet({ wallets, save, add }) {
    const [walletList, setWalletList] = useState([]);
    const [transfers, setTransfers] = useState([]);
    const [form, setForm] = useState({ name: '', type: 'bank', initial_balance: '' });
    const [transfer, setTransfer] = useState({ from_wallet: '', to_wallet: '', amount: '', transfer_date: dateToISO(new Date()), notes: '' });
    const [error, setError] = useState('');
    const load = async () => {
        const [items, history] = await Promise.all([apiRequest('/api/wallets'), apiRequest('/api/transfers')]);
        setWalletList(items);
        setTransfers(history);
        setTransfer((current) => ({ ...current, from_wallet: current.from_wallet || items[0]?.slug || '', to_wallet: current.to_wallet || items[1]?.slug || '' }));
    };
    useEffect(() => { load().catch((requestError) => setError(requestError.message)); }, []);

    const createWallet = async (event) => {
        event.preventDefault();
        setError('');
        try {
            await apiRequest('/api/wallets', { method: 'POST', body: JSON.stringify({ ...form, name: form.name.trim(), initial_balance: Number(form.initial_balance || 0) }) });
            setForm({ name: '', type: 'bank', initial_balance: '' });
            await load();
            window.dispatchEvent(new Event('wallet-data-changed'));
        } catch (requestError) { setError(requestError.message); }
    };

    const createTransfer = async (event) => {
        event.preventDefault();
        setError('');
        try {
            await apiRequest('/api/transfers', { method: 'POST', body: JSON.stringify({ ...transfer, amount: Number(transfer.amount) }) });
            setTransfer((current) => ({ ...current, amount: '', notes: '' }));
            await load();
            window.dispatchEvent(new Event('wallet-data-changed'));
        } catch (requestError) { setError(requestError.message); }
    };

    const deleteTransfer = async (id) => {
        try {
            await apiRequest(`/api/transfers/${id}`, { method: 'DELETE' });
            await load();
            window.dispatchEvent(new Event('wallet-data-changed'));
        } catch (requestError) { setError(requestError.message); }
    };

    const inputClass = 'mt-2 w-full rounded-lg border border-[var(--panel-border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--primary)]';
    const walletNames = Object.fromEntries(walletList.map((wallet) => [wallet.slug, wallet.name]));
    return <><PageTitle title="Rekening & dompet" subtitle="Atur rekening bank, tunai, dan e-wallet dalam satu tempat." action="Catat transaksi" onAction={add} />{error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-600">{error}</p>}<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{walletList.map((wallet) => <div key={wallet.id} className="panel rounded-xl p-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-[var(--primary)]"><WalletCards size={19} /></span><div className="min-w-0"><p className="truncate text-sm font-bold">{wallet.name}</p><p className="text-[10px] capitalize text-slate-500">{wallet.type === 'ewallet' ? 'E-wallet' : wallet.type}</p></div></div><p className="mt-5 text-xl font-extrabold">{rupiah(Number(wallet.current_balance))}</p></div>)}</div><div className="mt-4 grid gap-4 xl:grid-cols-2"><form onSubmit={createWallet} className="panel rounded-xl p-5"><h2 className="text-sm font-extrabold">Tambah rekening</h2><label className="mt-4 block text-xs font-bold text-slate-500">NAMA<input required maxLength="80" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Contoh: BCA, Jago, GoPay" className={inputClass} /></label><div className="mt-3 grid grid-cols-2 gap-3"><label className="block text-xs font-bold text-slate-500">JENIS<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} className={inputClass}><option value="bank">Bank</option><option value="ewallet">E-wallet</option><option value="cash">Tunai</option><option value="other">Lainnya</option></select></label><label className="block text-xs font-bold text-slate-500">SALDO AWAL<input type="number" min="0" step="1" value={form.initial_balance} onChange={(event) => setForm({ ...form, initial_balance: event.target.value })} placeholder="0" className={inputClass} /></label></div><button className="mt-4 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-xs font-bold text-white">Tambah rekening</button></form><form onSubmit={createTransfer} className="panel rounded-xl p-5"><h2 className="text-sm font-extrabold">Transfer antar rekening</h2><div className="mt-4 grid grid-cols-2 gap-3"><label className="block text-xs font-bold text-slate-500">DARI<select required value={transfer.from_wallet} onChange={(event) => setTransfer({ ...transfer, from_wallet: event.target.value })} className={inputClass}>{walletList.map((wallet) => <option key={wallet.id} value={wallet.slug}>{wallet.name}</option>)}</select></label><label className="block text-xs font-bold text-slate-500">KE<select required value={transfer.to_wallet} onChange={(event) => setTransfer({ ...transfer, to_wallet: event.target.value })} className={inputClass}>{walletList.filter((wallet) => wallet.slug !== transfer.from_wallet).map((wallet) => <option key={wallet.id} value={wallet.slug}>{wallet.name}</option>)}</select></label></div><div className="mt-3 grid grid-cols-2 gap-3"><label className="block text-xs font-bold text-slate-500">NOMINAL<input required type="number" min="1" step="1" value={transfer.amount} onChange={(event) => setTransfer({ ...transfer, amount: event.target.value })} className={inputClass} /></label><label className="block text-xs font-bold text-slate-500">TANGGAL<input required type="date" value={transfer.transfer_date} onChange={(event) => setTransfer({ ...transfer, transfer_date: event.target.value })} className={inputClass} /></label></div><label className="mt-3 block text-xs font-bold text-slate-500">CATATAN<input maxLength="255" value={transfer.notes} onChange={(event) => setTransfer({ ...transfer, notes: event.target.value })} className={inputClass} /></label><button disabled={walletList.length < 2} className="mt-4 flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"><ArrowLeftRight size={14} />Transfer</button></form></div><section className="panel mt-4 overflow-hidden rounded-xl"><h2 className="border-b border-[var(--panel-border)] px-5 py-4 text-sm font-extrabold">Transfer terakhir</h2>{transfers.length ? <div className="divide-y divide-[var(--panel-border)]">{transfers.map((item) => <div key={item.id} className="flex items-center gap-3 px-5 py-4"><ArrowLeftRight size={16} className="text-[var(--accent)]" /><div className="min-w-0 flex-1"><p className="text-xs font-bold">{walletNames[item.from_wallet] || item.from_wallet} ke {walletNames[item.to_wallet] || item.to_wallet}</p><p className="mt-1 text-[10px] text-slate-500">{formatDate(item.transfer_date)}{item.notes ? ` · ${item.notes}` : ''}</p></div><b className="text-xs">{rupiah(Number(item.amount))}</b><button aria-label="Hapus transfer" onClick={() => deleteTransfer(item.id)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={15} /></button></div>)}</div> : <p className="p-6 text-xs text-slate-500">Belum ada transfer.</p>}</section></>;
}

function Transactions({ records, remove, edit, add }) {
    const [filter, setFilter] = useState('all');
    const [query, setQuery] = useState('');
    const filtered = records.filter((record) => (filter === 'all' || (filter === 'income' ? record.amount > 0 : record.amount < 0)) && record.title.toLowerCase().includes(query.toLowerCase()));
    return <><PageTitle title="Transaksi" subtitle="Riwayat pemasukan dan pengeluaran yang tersimpan." action="Tambah transaksi" onAction={add} /><div className="panel overflow-hidden rounded-[20px]"><div className="flex flex-wrap gap-3 border-b border-[var(--panel-border)] p-4"><div className="relative min-w-[200px] flex-1"><Search size={15} className="absolute left-3 top-3 text-slate-500" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari transaksi" className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--app-bg)] py-2.5 pl-9 text-xs outline-none focus:border-[var(--accent)]" /></div><div className="flex rounded-lg bg-slate-50 p-1">{[['all', 'Semua'], ['income', 'Masuk'], ['expense', 'Keluar']].map(([id, label]) => <button key={id} onClick={() => setFilter(id)} className={cls('rounded-md px-3 py-1.5 text-[11px] font-bold', filter === id ? 'bg-slate-200 text-slate-800' : 'text-slate-500')}>{label}</button>)}</div></div><TransactionRows records={filtered} onDelete={remove} onEdit={edit} /></div></>;
}

function Calendar({ bills, records, go }) {
    const [monthOffset, setMonthOffset] = useState(0);
    const [selectedDate, setSelectedDate] = useState(dateToISO(new Date()));
    const visibleMonth = new Date(new Date().getFullYear(), new Date().getMonth() + monthOffset, 1);
    const monthKey = `${visibleMonth.getFullYear()}-${String(visibleMonth.getMonth() + 1).padStart(2, '0')}`;
    const dayCount = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
    const leadingDays = visibleMonth.getDay();
    const events = [
        ...records.map((record) => ({ id: `transaction-${record.id}`, date: record.transactionDate, title: record.title, amount: record.amount, type: 'transaction' })),
        ...bills.filter((bill) => !bill.paid && bill.dueDate).map((bill) => ({ id: `bill-${bill.id}`, date: bill.dueDate, title: bill.brand, amount: -bill.amount, type: 'bill' })),
    ];
    const selectedEvents = events.filter((event) => event.date === selectedDate);
    const upcoming = events.filter((event) => event.date >= dateToISO(new Date())).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
    const monthLabel = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(visibleMonth);
    const weekdayLabels = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const selectedLabel = formatDate(selectedDate);
    return <><PageTitle title="Kalender keuangan" subtitle="Jadwal transaksi dan kewajiban yang tercatat." action="Kelola paylater" onAction={() => go('paylater')} /><div className="grid gap-4 lg:grid-cols-3"><div className="panel rounded-[20px] p-6 lg:col-span-2"><div className="flex items-center justify-between"><button aria-label="Bulan sebelumnya" onClick={() => setMonthOffset((value) => value - 1)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><ChevronLeft size={18} /></button><p className="text-sm font-extrabold capitalize">{monthLabel}</p><button aria-label="Bulan berikutnya" onClick={() => setMonthOffset((value) => value + 1)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><ChevronRight size={18} /></button></div><div className="mt-5 grid grid-cols-7 gap-2">{weekdayLabels.map((day) => <p key={day} className="pb-1 text-center text-[10px] font-bold text-slate-500">{day}</p>)}{Array.from({ length: leadingDays + dayCount }, (_, index) => { const day = index - leadingDays + 1; if (day < 1) return <div key={`empty-${index}`} />; const date = `${monthKey}-${String(day).padStart(2, '0')}`; const dayEvents = events.filter((event) => event.date === date); return <button key={date} onClick={() => setSelectedDate(date)} className={cls('flex aspect-square flex-col items-center justify-center rounded-lg text-[11px]', selectedDate === date ? 'border border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]' : 'bg-slate-50 text-slate-500 hover:bg-slate-100')}><span>{day}</span><span className="mt-1 flex h-1 gap-0.5">{dayEvents.slice(0, 3).map((event) => <i key={event.id} className={cls('h-1 w-1 rounded-full', event.type === 'bill' || event.amount < 0 ? 'bg-red-500' : 'bg-[var(--accent)]')} />)}</span></button>; })}</div><div className="mt-5 border-t border-[var(--panel-border)] pt-4"><p className="text-xs font-bold">{selectedLabel}</p>{selectedEvents.length ? <div className="mt-3 space-y-3">{selectedEvents.map((event) => <div key={event.id} className="flex items-center justify-between text-xs"><span className="font-semibold">{event.title}</span><span className={event.amount >= 0 ? 'text-[var(--accent)]' : 'text-red-500'}>{event.amount >= 0 ? '+' : '−'}{rupiah(Math.abs(event.amount))}</span></div>)}</div> : <p className="mt-2 text-xs text-slate-500">Tidak ada transaksi atau tagihan pada tanggal ini.</p>}</div></div><div className="panel rounded-[20px] p-6"><p className="text-sm font-extrabold">Jadwal berikutnya</p><div className="mt-5 space-y-4">{upcoming.length ? upcoming.map((event) => <div key={event.id} className="flex gap-3"><i className={cls('mt-1.5 h-2 w-2 rounded-full', event.type === 'bill' || event.amount < 0 ? 'bg-red-500' : 'bg-[var(--accent)]')} /><div className="flex-1"><p className="text-xs font-bold">{event.title}</p><p className="text-[10px] text-slate-500">{formatDate(event.date)}</p></div><b className="text-xs text-slate-700">{rupiah(Math.abs(event.amount))}</b></div>) : <p className="text-xs text-slate-500">Belum ada jadwal mendatang.</p>}</div></div></div></>;
}

function Paylater({ bills, toggle, remove, add }) {
    const total = bills.filter((bill) => !bill.paid).reduce((sum, bill) => sum + bill.amount, 0);
    return <><PageTitle title="Paylater" subtitle="Rencanakan kewajiban sampai enam bulan ke depan." action="Tambah tagihan" onAction={add} /><div className="grid gap-4 md:grid-cols-3"><Stat title="Total belum dibayar" value={rupiah(total)} tone="text-red-500" /><Stat title="Tagihan aktif" value={String(bills.filter((bill) => !bill.paid).length)} tone="text-slate-800" /><Stat title="Sudah selesai" value={String(bills.filter((bill) => bill.paid).length)} tone="text-[var(--accent)]" /></div><div className="panel mt-4 overflow-hidden rounded-[20px]"><div className="border-b border-[var(--panel-border)] px-6 py-5 text-sm font-extrabold">Rencana pembayaran</div><div className="divide-y divide-[var(--panel-border)]">{bills.length ? bills.map((bill) => <div key={bill.id} className="flex flex-wrap items-center gap-4 px-6 py-4"><div className={cls('grid h-9 w-9 place-items-center rounded-xl text-xs font-extrabold', bill.paid ? 'bg-[var(--accent)] text-[var(--accent-contrast)]' : 'bg-red-500 text-white')}>{bill.paid ? <Check size={16} /> : bill.letter}</div><div className="min-w-[150px] flex-1"><p className={cls('text-xs font-bold', bill.paid && 'text-slate-500 line-through')}>{bill.brand}</p><p className="mt-1 text-[10px] text-slate-500">{bill.due}</p></div><b className={cls('text-xs', bill.paid ? 'text-slate-400 line-through' : 'text-slate-800')}>{rupiah(bill.amount)}</b><button onClick={() => toggle(bill.id, !bill.paid)} className={cls('rounded-lg px-3 py-2 text-[10px] font-extrabold', bill.paid ? 'bg-slate-100 text-slate-500' : 'bg-[var(--accent)] text-[var(--accent-contrast)]')}>{bill.paid ? 'Batalkan' : 'Tandai lunas'}</button><button onClick={() => remove(bill.id)} aria-label={`Hapus tagihan ${bill.brand}`} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500"><Trash2 size={15} /></button></div>) : <p className="p-8 text-center text-xs text-slate-500">Belum ada tagihan Paylater.</p>}</div></div></>;
}

function Stat({ title, value, tone }) { return <div className={cls('panel min-w-0 rounded-[20px] p-6', title.endsWith('bulan ini') && 'xl:col-span-3')}><p className="eyebrow">{title}</p><p className={cls('mt-3 text-2xl font-extrabold', tone)}>{value}</p></div>; }

function PaylaterSummary({ bills, go }) {
    const pending = bills.filter((bill) => !bill.paid).sort((left, right) => left.dueDate.localeCompare(right.dueDate));
    const total = pending.reduce((sum, bill) => sum + bill.amount, 0);
    const today = dateToISO(new Date());

    return <section className="panel mt-4 overflow-hidden rounded-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--panel-border)] px-5 py-4 sm:px-6">
            <div>
                <h2 className="text-sm font-extrabold">Paylater</h2>
                <p className="mt-1 text-xs text-slate-500">{pending.length} tagihan belum lunas</p>
            </div>
            <div className="flex items-center gap-4">
                <div className="text-right"><p className="text-[10px] font-bold uppercase text-slate-500">Total tagihan</p><p className="mt-1 text-sm font-extrabold">{rupiah(total)}</p></div>
                <button onClick={() => go('paylater')} className="flex items-center gap-1 rounded-lg border border-[var(--panel-border)] px-3 py-2 text-xs font-bold text-[var(--primary)] hover:bg-slate-50">Lihat semua<ChevronRight size={14} /></button>
            </div>
        </div>
        {pending.length ? <div className="divide-y divide-[var(--panel-border)]">{pending.slice(0, 3).map((bill) => {
            const overdue = bill.dueDate < today;
            return <div key={bill.id} className="flex items-center gap-3 px-5 py-3.5 sm:px-6">
                <span className={cls('grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xs font-extrabold', overdue ? 'bg-red-50 text-red-600' : 'bg-sky-50 text-[var(--accent)]')}>{bill.letter}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{bill.brand}</p><p className={cls('mt-1 text-[10px]', overdue ? 'font-bold text-red-600' : 'text-slate-500')}>{overdue ? `Terlambat · ${bill.due}` : `Jatuh tempo ${bill.due}`}</p></div>
                <p className="shrink-0 text-xs font-extrabold">{rupiah(bill.amount)}</p>
            </div>;
        })}</div> : <p className="px-5 py-5 text-xs text-slate-500 sm:px-6">Tidak ada tagihan Paylater yang belum lunas.</p>}
    </section>;
}

function TransactionSummary({ records, go }) {
    return <section className="panel mt-4 overflow-hidden rounded-xl">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--panel-border)] px-5 py-4 sm:px-6">
            <div><h2 className="text-sm font-extrabold">Transaksi terbaru</h2><p className="mt-1 text-xs text-slate-500">Aktivitas keuangan terakhir</p></div>
            <button onClick={() => go('transactions')} className="flex shrink-0 items-center gap-1 rounded-lg border border-[var(--panel-border)] px-3 py-2 text-xs font-bold text-[var(--primary)] hover:bg-slate-50">Lihat semua<ChevronRight size={14} /></button>
        </div>
        {records.length ? <div className="divide-y divide-[var(--panel-border)]">{records.slice(0, 5).map((record) => <div key={record.id} className="flex items-center gap-3 px-5 py-3.5 sm:px-6">
            <span className={cls('grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xs font-extrabold', record.amount > 0 ? 'bg-sky-50 text-[var(--accent)]' : 'bg-slate-100 text-slate-600')}>{record.icon}</span>
            <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{record.title}</p><p className="mt-1 truncate text-[10px] text-slate-500">{record.category} · {record.date}</p></div>
            <p className={cls('shrink-0 text-xs font-extrabold', record.amount > 0 ? 'text-[var(--primary)]' : 'text-slate-800')}>{record.amount > 0 ? '+' : '−'}{rupiah(Math.abs(record.amount))}</p>
        </div>)}</div> : <p className="px-5 py-5 text-xs text-slate-500 sm:px-6">Belum ada transaksi. Transaksi yang dicatat akan muncul di sini.</p>}
    </section>;
}

function Analysis({ wallets, records, bills }) {
    const income = records.filter((record) => record.amount > 0).reduce((sum, record) => sum + record.amount, 0);
    const expense = records.filter((record) => record.amount < 0).reduce((sum, record) => sum + Math.abs(record.amount), 0);
    const billsTotal = bills.filter((bill) => !bill.paid).reduce((sum, bill) => sum + bill.amount, 0);
    return <><PageTitle title="Analisis" subtitle="Ringkasan keputusan berdasarkan catatan keuanganmu." /><div className="grid gap-4 md:grid-cols-3"><Stat title="Pemasukan tercatat" value={rupiah(income)} tone="text-[var(--accent)]" /><Stat title="Pengeluaran tercatat" value={rupiah(expense)} tone="text-red-500" /><Stat title="Sisa paylater" value={rupiah(billsTotal)} tone="text-slate-800" /></div><div className="panel mt-4 rounded-[20px] p-6"><p className="text-sm font-extrabold">Arus kas enam bulan terakhir</p><LineChart records={records} /></div></>;
}

function MemberEditor({ member, save }) {
    const [form, setForm] = useState({ name: member.name, email: member.email, password: '', password_confirmation: '' });
    useEffect(() => {
        setForm({ name: member.name, email: member.email, password: '', password_confirmation: '' });
    }, [member]);
    const inputClass = 'mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--app-bg)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]';
    const submit = async (event) => {
        event.preventDefault();
        const changes = { name: form.name.trim(), email: form.email.trim() };
        if (form.password) {
            changes.password = form.password;
            changes.password_confirmation = form.password_confirmation;
        }
        if (await save(member.id, changes)) {
            setForm((current) => ({ ...current, password: '', password_confirmation: '' }));
        }
    };
    return <form onSubmit={submit} className="grid gap-3 border-b border-[var(--panel-border)] py-4 last:border-0 sm:grid-cols-2 xl:grid-cols-5">
        <label className="block text-xs font-bold text-slate-500">NAMA<input required maxLength="80" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={inputClass} /></label>
        <label className="block text-xs font-bold text-slate-500">EMAIL<input required type="email" maxLength="255" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className={inputClass} /></label>
        <label className="block text-xs font-bold text-slate-500">PASSWORD BARU<input type="password" minLength="12" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Kosongkan jika tetap" className={inputClass} /></label>
        <label className="block text-xs font-bold text-slate-500">ULANGI PASSWORD<input type="password" minLength="12" autoComplete="new-password" value={form.password_confirmation} onChange={(event) => setForm({ ...form, password_confirmation: event.target.value })} className={inputClass} /></label>
        <button className="self-end rounded-xl bg-[var(--accent)] px-4 py-3 text-xs font-extrabold text-[var(--accent-contrast)]">Simpan perubahan</button>
    </form>;
}

function Settings({ profile, palette, recurringIncomes, save, changePalette, createInvitation, invitationUrl, addRecurringIncome, toggleRecurringIncome, deleteRecurringIncome, reset, isAdmin, members, updateMember, databaseBackups, createDatabaseBackup, restoreDatabaseBackup }) {
    const [name, setName] = useState(profile.name);
    const [wallets, setWallets] = useState([]);
    const [income, setIncome] = useState({ description: '', amount: '', day: '1', category: 'Gaji', wallet: '' });
    const [copyStatus, setCopyStatus] = useState('');
    const [backupFile, setBackupFile] = useState(null);
    const [restoringBackup, setRestoringBackup] = useState(false);
    useEffect(() => {
        setName(profile.name);
        apiRequest('/api/wallets').then((items) => {
            setWallets(items);
            setIncome((current) => ({ ...current, wallet: current.wallet || items[0]?.slug || '' }));
        }).catch(() => {});
    }, [profile.name]);
    const walletNames = Object.fromEntries(wallets.map((wallet) => [wallet.slug, wallet.name]));
    const inputClass = 'mt-2 w-full rounded-xl border border-[var(--panel-border)] bg-[var(--app-bg)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]';
    const submitRecurringIncome = async (event) => {
        event.preventDefault();
        if (await addRecurringIncome({ ...income, amount: Number(income.amount), day: Number(income.day) })) {
            setIncome({ description: '', amount: '', day: '1', category: 'Gaji', wallet: wallets[0]?.slug || '' });
        }
    };
    return <>
        <PageTitle title="Pengaturan" subtitle="Atur profil dan pemasukan rutin." />
        <div className="grid gap-4 lg:grid-cols-2">
            <form onSubmit={(event) => { event.preventDefault(); save({ name: name.trim() || 'Reihan' }); }} className="panel rounded-[20px] p-6">
                <p className="text-sm font-extrabold">Profil dashboard</p>
                <label className="mt-5 block text-xs font-bold text-slate-500">NAMA PANGGILAN<input maxLength="80" value={name} onChange={(event) => setName(event.target.value)} className={inputClass} /></label>
                <p className="mt-5 text-xs font-bold text-slate-500">TEMA WARNA</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                    {[
                        ['emerald', 'Fintech Blue', '#2563EB', '#0EA5E9'],
                        ['ocean', 'Ocean Teal', '#0F766E', '#14B8A6'],
                        ['sand', 'Warm Amber', '#B45309', '#F59E0B'],
                        ['lavender', 'Soft Violet', '#6D28D9', '#8B5CF6'],
                    ].map(([id, label, primary, accent]) => <button key={id} type="button" aria-pressed={palette === id} onClick={() => changePalette(id)} className={cls('flex min-w-0 items-center gap-2 rounded-lg border p-3 text-left text-xs font-bold transition', palette === id ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-[var(--panel-border)] hover:bg-slate-50')}><span className="flex shrink-0 -space-x-1"><i className="h-4 w-4 rounded-full border-2 border-white" style={{ backgroundColor: primary }} /><i className="h-4 w-4 rounded-full border-2 border-white" style={{ backgroundColor: accent }} /></span><span className="min-w-0 flex-1 truncate">{label}</span>{palette === id && <Check size={14} className="shrink-0 text-[var(--primary)]" />}</button>)}
                </div>
                <button className="mt-5 rounded-xl bg-[var(--accent)] px-4 py-3 text-xs font-extrabold text-[var(--accent-contrast)]">Simpan profil</button>
            </form>
            <form onSubmit={submitRecurringIncome} className="panel rounded-[20px] p-6">
                <p className="text-sm font-extrabold">Tambah pemasukan bulanan otomatis</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">Transaksi diproses otomatis oleh server setiap hari pada pukul 00.05. Pastikan Scheduler Laravel dan cron server diaktifkan agar jadwal tetap berjalan saat aplikasi ditutup.</p>
                <label className="mt-5 block text-xs font-bold text-slate-500">DESKRIPSI<input required maxLength="255" value={income.description} onChange={(event) => setIncome({ ...income, description: event.target.value })} placeholder="Contoh: Gaji bulanan" className={inputClass} /></label>
                <div className="mt-4 grid grid-cols-2 gap-3">
                    <label className="block text-xs font-bold text-slate-500">NOMINAL<input required type="number" min="1" step="1" value={income.amount} onChange={(event) => setIncome({ ...income, amount: event.target.value })} placeholder="0" className={inputClass} /></label>
                    <label className="block text-xs font-bold text-slate-500">TANGGAL SETIAP BULAN<input required type="number" min="1" max="31" value={income.day} onChange={(event) => setIncome({ ...income, day: event.target.value })} className={inputClass} /></label>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                    <label className="block text-xs font-bold text-slate-500">KATEGORI<input required maxLength="255" value={income.category} onChange={(event) => setIncome({ ...income, category: event.target.value })} className={inputClass} /></label>
                    <label className="block text-xs font-bold text-slate-500">MASUK KE<select required value={income.wallet} onChange={(event) => setIncome({ ...income, wallet: event.target.value })} className={inputClass}>{wallets.map((wallet) => <option key={wallet.id} value={wallet.slug}>{wallet.name}</option>)}</select></label>
                </div>
                <button className="mt-5 rounded-xl bg-[var(--accent)] px-4 py-3 text-xs font-extrabold text-[var(--accent-contrast)]">Tambah jadwal</button>
                <div className="mt-6 border-t border-[var(--panel-border)] pt-5">
                    <p className="text-xs font-bold">Jadwal tersimpan ({recurringIncomes.length})</p>
                    {recurringIncomes.length ? <div className="mt-3 divide-y divide-[var(--panel-border)]">{recurringIncomes.map((schedule) => <div key={schedule.id} className="flex items-center gap-3 py-3"><input aria-label={`Aktifkan ${schedule.description}`} type="checkbox" checked={schedule.enabled} onChange={() => toggleRecurringIncome(schedule.id)} className="h-4 w-4 accent-[var(--accent)]" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{schedule.description}</p><p className="mt-1 text-[10px] text-slate-500">{rupiah(schedule.amount)} · tanggal {schedule.day} · {walletNames[schedule.wallet] || schedule.wallet}</p></div><button type="button" onClick={() => deleteRecurringIncome(schedule.id)} aria-label={`Hapus ${schedule.description}`} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-500"><Trash2 size={15} /></button></div>)}</div> : <p className="mt-3 text-xs text-slate-500">Belum ada jadwal pemasukan. Tambahkan jadwal untuk tanggal 1, 25, atau tanggal lainnya.</p>}
                </div>
            </form>
            {isAdmin && <div className="panel rounded-[20px] p-6 lg:col-span-2">
                <p className="text-sm font-extrabold">Undang pengguna</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">Buat tautan undangan sekali pakai yang berlaku selama 7 hari. Pengguna yang diundang memiliki data keuangan terpisah dari akunmu.</p>
                <button type="button" onClick={createInvitation} className="mt-4 rounded-xl border border-[var(--panel-border)] px-4 py-3 text-xs font-extrabold hover:bg-slate-100">Buat tautan undangan</button>
                {invitationUrl && <div className="mt-4 rounded-xl bg-[var(--app-bg)] p-3"><p className="break-all text-xs text-slate-700">{invitationUrl}</p><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(invitationUrl); setCopyStatus('Tautan disalin.'); } catch { setCopyStatus('Gagal menyalin otomatis. Silakan salin tautan secara manual.'); } }} className="mt-3 text-xs font-bold text-[var(--accent)]">Salin tautan</button>{copyStatus && <p role="status" className="mt-2 text-xs text-slate-500">{copyStatus}</p>}</div>}
                <div className="mt-6 border-t border-[var(--panel-border)] pt-5">
                    <p className="text-sm font-extrabold">Reset data akun</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">Hapus tagihan, saldo awal, jadwal pemasukan otomatis, dan profil akun ini. Riwayat transaksi tidak akan dihapus.</p>
                    <button onClick={reset} className="mt-4 rounded-xl border border-red-300 px-4 py-3 text-xs font-extrabold text-red-500 hover:bg-red-50">Reset data akun</button>
                </div>
                <div className="mt-6 border-t border-[var(--panel-border)] pt-5">
                    <p className="text-sm font-extrabold">Akun dan password member</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">Perbarui nama, email, atau atur password baru. Password dikosongkan secara default dan tidak pernah ditampilkan.</p>
                    {members.length ? <div className="mt-2 divide-y divide-[var(--panel-border)]">{members.map((member) => <MemberEditor key={member.id} member={member} save={updateMember} />)}</div> : <p className="mt-4 text-xs text-slate-500">Belum ada akun member.</p>}
                </div>
                <div className="mt-6 border-t border-[var(--panel-border)] pt-5">
                    <p className="flex items-center gap-2 text-sm font-extrabold"><Database size={16} />Backup database</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">Unduh salinan SQLite atau pulihkan dari file backup. Sebelum pemulihan, salinan database saat ini akan dibuat otomatis.</p>
                    <button type="button" onClick={createDatabaseBackup} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[var(--panel-border)] px-4 py-3 text-xs font-extrabold hover:bg-slate-100"><Download size={15} />Buat dan unduh backup</button>
                    <form onSubmit={async (event) => {
                        event.preventDefault();
                        if (!backupFile || !window.confirm('Pulihkan database dari file ini? Data saat ini tetap disimpan sebagai backup sebelum pemulihan.')) return;
                        setRestoringBackup(true);
                        if (await restoreDatabaseBackup(backupFile)) setBackupFile(null);
                        setRestoringBackup(false);
                    }} className="mt-4 flex flex-wrap items-end gap-3">
                        <label className="min-w-0 flex-1 text-xs font-bold text-slate-500">FILE BACKUP SQLITE<input required type="file" accept=".sqlite,.db,application/vnd.sqlite3" onChange={(event) => setBackupFile(event.target.files?.[0] || null)} className="mt-2 block w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-bold" /></label>
                        <button disabled={!backupFile || restoringBackup} className="inline-flex items-center gap-2 rounded-xl border border-red-300 px-4 py-3 text-xs font-extrabold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"><FileUp size={15} />{restoringBackup ? 'Memulihkan...' : 'Pulihkan backup'}</button>
                    </form>
                    <p className="mt-3 text-xs text-amber-700">Pemulihan mengganti seluruh data aktif. Pastikan file backup benar sebelum melanjutkan.</p>
                    <div className="mt-5 border-t border-[var(--panel-border)] pt-4">
                        <p className="text-xs font-bold">Backup tersimpan ({databaseBackups.length})</p>
                        {databaseBackups.length ? <div className="mt-2 divide-y divide-[var(--panel-border)]">{databaseBackups.map((backup) => <div key={backup.filename} className="flex items-center gap-3 py-3"><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{backup.filename}</p><p className="mt-1 text-[10px] text-slate-500">{new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(backup.created_at))} · {Math.max(1, Math.ceil(backup.size / 1024))} KB</p></div><a href={`/api/admin/database/backups/${encodeURIComponent(backup.filename)}`} aria-label={`Unduh ${backup.filename}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Download size={16} /></a></div>)}</div> : <p className="mt-3 text-xs text-slate-500">Belum ada backup tersimpan.</p>}
                    </div>
                </div>
            </div>}
        </div>
    </>;
}

export default function DompetApp() {
    const [active, setActive] = useState('dashboard');
    const [menu, setMenu] = useState(false);
    const [transactionOpen, setTransactionOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [billOpen, setBillOpen] = useState(false);
    const [notice, setNotice] = useState('');
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [recurringIncomes, setRecurringIncomes] = useState([]);
    const [openingBalances, setOpeningBalances] = useState({ bank: 0, cash: 0 });
    const [walletList, setWalletList] = useState([]);
    const [bills, setBills] = useState([]);
    const [profile, setProfile] = useState({ name: initialAccount.name, email: initialAccount.email });
    const [palette, setPalette] = useState(initialAccount.palette);
    const [isAdmin, setIsAdmin] = useState(false);
    const [members, setMembers] = useState([]);
    const [databaseBackups, setDatabaseBackups] = useState([]);
    const [invitationUrl, setInvitationUrl] = useState('');
    const loadAccountData = async () => {
        setLoading(true);
        setLoadError('');
        try {
            const [account, transactions, schedules, paylaterBills, accountWallets] = await Promise.all([
                apiRequest('/api/account'),
                apiRequest('/api/transactions'),
                apiRequest('/api/recurring-incomes'),
                apiRequest('/api/paylater'),
                apiRequest('/api/wallets'),
            ]);
            setProfile({ name: account.name, email: account.email });
            setPalette(account.palette);
            setIsAdmin(account.is_admin);
            setMembers([]);
            setDatabaseBackups([]);
            if (account.is_admin) {
                apiRequest('/api/admin/members')
                    .then(setMembers)
                    .catch((error) => toast(`Daftar member gagal dimuat: ${error.message}`));
                apiRequest('/api/admin/database/backups')
                    .then(setDatabaseBackups)
                    .catch((error) => toast(`Daftar backup gagal dimuat: ${error.message}`));
            }
            setOpeningBalances(account.opening_balances);
            setWalletList(accountWallets);
            setRecords(transactions.map(normalizeTransaction));
            setRecurringIncomes(schedules.map(normalizeSchedule));
            setBills(paylaterBills.map(normalizeBill));
        } catch (error) {
            setLoadError(`Data akun gagal dimuat: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        loadAccountData();
        const refreshWallets = () => apiRequest('/api/wallets').then(setWalletList).catch(() => {});
        window.addEventListener('wallet-data-changed', refreshWallets);
        return () => window.removeEventListener('wallet-data-changed', refreshWallets);
    }, []);
    useEffect(() => {
        document.body.dataset.palette = palette;
    }, [palette]);
    const toast = (message) => { setNotice(message); window.setTimeout(() => setNotice(''), 2500); };
    const go = (page) => { setActive(page); setMenu(false); };
    const walletTotals = Object.fromEntries(walletList.map((wallet) => [wallet.slug, Number(wallet.current_balance)]));
    const saveTransaction = async (entry, id) => {
        const transaction = await apiRequest(id ? `/api/transactions/${id}` : '/api/transactions', {
            method: id ? 'PUT' : 'POST',
            body: JSON.stringify({
                description: entry.title.trim(),
                amount: entry.amount,
                type: entry.type,
                category: entry.category.trim(),
                transaction_date: entry.transaction_date,
                wallet: entry.wallet,
            }),
        });
        const normalized = normalizeTransaction(transaction);
        setRecords((current) => (id
            ? current.map((record) => record.id === id ? normalized : record)
            : [normalized, ...current]).sort((a, b) => b.transactionDate.localeCompare(a.transactionDate) || b.id - a.id));
        apiRequest('/api/wallets').then(setWalletList).catch(() => {});
        window.dispatchEvent(new Event('budget-data-changed'));
        toast(id ? 'Transaksi berhasil diperbarui' : 'Transaksi berhasil dicatat');
    };
    const deleteRecord = async (id) => {
        const record = records.find((item) => item.id === id);
        if (!record) return;
        try {
            await apiRequest(`/api/transactions/${id}`, { method: 'DELETE' });
        } catch (error) {
            toast(`Transaksi gagal dihapus: ${error.message}`);
            return;
        }
        setRecords((current) => current.filter((item) => item.id !== id));
        apiRequest('/api/wallets').then(setWalletList).catch(() => {});
        window.dispatchEvent(new Event('budget-data-changed'));
        toast('Transaksi dihapus');
    };
    const saveBill = async (bill) => {
        const savedBill = await apiRequest('/api/paylater', {
            method: 'POST',
            body: JSON.stringify({ brand: bill.brand.trim(), amount: bill.amount, due_date: bill.due }),
        });
        setBills((current) => [...current, normalizeBill(savedBill)].sort((a, b) => a.dueDate.localeCompare(b.dueDate)));
        toast('Tagihan paylater ditambahkan');
    };
    const deleteBill = async (id) => {
        const bill = bills.find((item) => item.id === id);
        if (!bill) return;
        try {
            await apiRequest(`/api/paylater/${id}`, { method: 'DELETE' });
        } catch (error) {
            toast(`Tagihan paylater gagal dihapus: ${error.message}`);
            return;
        }
        setBills((current) => current.filter((item) => item.id !== id));
        toast('Tagihan paylater dihapus');
    };
    const addRecurringIncome = async (income) => {
        try {
            const schedule = await apiRequest('/api/recurring-incomes', {
                method: 'POST',
                body: JSON.stringify(income),
            });
            setRecurringIncomes((current) => [...current, normalizeSchedule(schedule)].sort((a, b) => a.day - b.day));
            toast(`Jadwal "${income.description}" ditambahkan`);
            return true;
        } catch (error) {
            toast(`Jadwal pemasukan gagal disimpan: ${error.message}`);
            return false;
        }
    };
    const toggleRecurringIncome = async (id) => {
        const schedule = recurringIncomes.find((item) => item.id === id);
        if (!schedule) return;
        try {
            const updated = await apiRequest(`/api/recurring-incomes/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ enabled: !schedule.enabled }),
            });
            setRecurringIncomes((current) => current.map((item) => item.id === id ? normalizeSchedule(updated) : item));
        } catch (error) {
            toast(`Status jadwal gagal diperbarui: ${error.message}`);
        }
    };
    const deleteRecurringIncome = async (id) => {
        try {
            await apiRequest(`/api/recurring-incomes/${id}`, { method: 'DELETE' });
            setRecurringIncomes((current) => current.filter((schedule) => schedule.id !== id));
            toast('Jadwal pemasukan dihapus');
        } catch (error) {
            toast(`Jadwal pemasukan gagal dihapus: ${error.message}`);
        }
    };
    const saveProfile = async (value) => {
        try {
            const account = await apiRequest('/api/account', { method: 'PUT', body: JSON.stringify(value) });
            setProfile({ name: account.name, email: account.email });
            toast('Nama profil diperbarui');
        } catch (error) {
            toast(`Profil gagal disimpan: ${error.message}`);
        }
    };
    const changePalette = async (value) => {
        try {
            const account = await apiRequest('/api/account', { method: 'PUT', body: JSON.stringify({ palette: value }) });
            setPalette(account.palette);
            toast('Palet warna diperbarui');
        } catch (error) {
            toast(`Palet warna gagal disimpan: ${error.message}`);
        }
    };
    const createInvitation = async () => {
        try {
            const invitation = await apiRequest('/api/invitations', { method: 'POST' });
            setInvitationUrl(invitation.url);
        } catch (error) {
            toast(`Undangan gagal dibuat: ${error.message}`);
        }
    };
    const createDatabaseBackup = async () => {
        try {
            const backup = await apiRequest('/api/admin/database/backups', { method: 'POST' });
            setDatabaseBackups(await apiRequest('/api/admin/database/backups'));
            window.location.assign(backup.download_url);
        } catch (error) {
            toast(`Backup database gagal dibuat: ${error.message}`);
        }
    };
    const restoreDatabaseBackup = async (file) => {
        const formData = new FormData();
        formData.append('backup', file);
        try {
            const result = await apiRequest('/api/admin/database/restore', { method: 'POST', body: formData });
            setDatabaseBackups(await apiRequest('/api/admin/database/backups'));
            toast(result.message);
            loadAccountData();
            return true;
        } catch (error) {
            toast(`Pemulihan database gagal: ${error.message}`);
            return false;
        }
    };
    const updateMember = async (id, changes) => {
        try {
            const updated = await apiRequest(`/api/admin/members/${id}`, {
                method: 'PUT',
                body: JSON.stringify(changes),
            });
            setMembers((current) => current.map((member) => member.id === id ? updated : member));
            toast('Akun member diperbarui');
            return true;
        } catch (error) {
            toast(`Akun member gagal diperbarui: ${error.message}`);
            return false;
        }
    };
    const reset = async () => {
        if (!window.confirm('Hapus tagihan, saldo awal, dan jadwal pemasukan akun ini? Riwayat transaksi dan profil tidak akan dihapus.')) return;
        try {
            await Promise.all([
                ...bills.map((bill) => apiRequest(`/api/paylater/${bill.id}`, { method: 'DELETE' })),
                ...recurringIncomes.map((schedule) => apiRequest(`/api/recurring-incomes/${schedule.id}`, { method: 'DELETE' })),
                ...walletList.map((wallet) => apiRequest(`/api/wallets/${wallet.id}`, { method: 'PUT', body: JSON.stringify({ initial_balance: 0 }) })),
                apiRequest('/api/account', { method: 'PUT', body: JSON.stringify({ opening_balances: { bank: 0, cash: 0 } }) }),
            ]);
            setOpeningBalances({ bank: 0, cash: 0 });
            setWalletList(await apiRequest('/api/wallets'));
            setBills([]);
            setRecurringIncomes([]);
            toast('Data akun direset');
        } catch (error) {
            toast(`Data akun gagal direset sepenuhnya: ${error.message}`);
            loadAccountData();
        }
    };
    const unpaid = bills.filter((bill) => !bill.paid).length;
    const currentMonthLabel = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date());
    const currentPageLabel = pages.find(([id]) => id === active)?.[2] || 'Ringkasan';
    const openNewTransaction = () => { setEditingTransaction(null); setTransactionOpen(true); };
    const openEditTransaction = (record) => { setEditingTransaction(record); setTransactionOpen(true); };
    const closeTransaction = () => { setTransactionOpen(false); setEditingTransaction(null); };
    const content = active === 'dashboard' ? <Dashboard wallets={walletTotals} records={records} bills={bills} recurringIncomes={recurringIncomes} go={go} /> : active === 'wallet' ? <Wallet wallets={walletTotals} save={async (key, amount) => {
        try {
            const activity = walletTotals[key] - openingBalances[key];
            const openingBalance = amount - activity;
            if (openingBalance < 0) throw new Error('Saldo awal tidak dapat negatif. Sesuaikan transaksi yang sudah dicatat.');
            const account = await apiRequest('/api/account', { method: 'PUT', body: JSON.stringify({ opening_balances: { [key]: openingBalance } }) });
            setOpeningBalances(account.opening_balances);
            toast('Saldo dompet diperbarui');
        } catch (error) {
            toast(`Saldo dompet gagal disimpan: ${error.message}`);
        }
    }} add={openNewTransaction} /> : active === 'transactions' ? <Transactions records={records} remove={deleteRecord} edit={openEditTransaction} add={openNewTransaction} /> : active === 'calendar' ? <Calendar bills={bills} records={records} go={go} /> : active === 'paylater' ? <Paylater bills={bills} toggle={async (id) => {
        const bill = bills.find((item) => item.id === id);
        if (!bill) return;
        try {
            const updated = await apiRequest(`/api/paylater/${id}`, { method: 'PATCH', body: JSON.stringify({ paid: !bill.paid }) });
            setBills((current) => current.map((item) => item.id === id ? normalizeBill(updated) : item));
            toast('Status tagihan diperbarui');
        } catch (error) {
            toast(`Status tagihan gagal diperbarui: ${error.message}`);
        }
    }} remove={deleteBill} add={() => setBillOpen(true)} /> : active === 'analysis' ? <Analysis wallets={walletTotals} records={records} bills={bills} /> : <Settings profile={profile} palette={palette} recurringIncomes={recurringIncomes} save={saveProfile} changePalette={changePalette} createInvitation={createInvitation} invitationUrl={invitationUrl} addRecurringIncome={addRecurringIncome} toggleRecurringIncome={toggleRecurringIncome} deleteRecurringIncome={deleteRecurringIncome} reset={reset} isAdmin={isAdmin} members={members} updateMember={updateMember} databaseBackups={databaseBackups} createDatabaseBackup={createDatabaseBackup} restoreDatabaseBackup={restoreDatabaseBackup} />;
    const totalIncome = records.filter((record) => record.amount > 0).reduce((sum, record) => sum + record.amount, 0);
    const totalExpense = records.filter((record) => record.amount < 0).reduce((sum, record) => sum + Math.abs(record.amount), 0);
    const savingsRate = totalIncome ? Math.max(0, Math.min(100, Math.round(((totalIncome - totalExpense) / totalIncome) * 100))) : 0;
    return (
        <div className="min-h-screen bg-[var(--app-bg)] text-slate-900">
            <aside className="fixed inset-y-0 left-0 z-40 hidden w-[250px] flex-col border-r border-slate-200 bg-white px-4 py-5 lg:flex">
                <div className="mb-10 flex items-center gap-3 px-2">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#2563EB] text-white"><WalletCards size={20} /></div>
                    <div><p className="font-extrabold">dompet<span className="text-[#2563EB]">gweh</span></p><p className="text-[9px] font-bold uppercase tracking-[.16em] text-slate-400">Personal finance</p></div>
                </div>
                <Nav active={active} onChange={go} unpaid={unpaid} />
                <div className="mt-auto rounded-2xl border border-blue-100 bg-[var(--accent)]/[.05] p-4">
                    <Sparkles size={17} className="mb-3 text-[var(--accent)]" />
                    <p className="text-xs font-bold">Tingkat tabungan</p>
                    <p className="mt-1 text-[11px] text-slate-500">{totalIncome ? `${savingsRate}% dari pemasukan tercatat tersisa` : 'Catat pemasukan untuk melihat persentase.'}</p>
                    <div className="mt-3 h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${savingsRate}%` }} /></div>
                </div>
                <div className="mt-4 flex items-center gap-3 px-2">
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-200 text-xs font-bold">{profile.name.slice(0, 1).toUpperCase()}</div>
                    <div className="flex-1"><p className="text-xs font-bold">{profile.name}</p><p className="text-[10px] text-slate-500">Personal account</p></div>
                    <button aria-label="Buka pengaturan" onClick={() => go('settings')} className="text-slate-500 hover:text-slate-800"><MoreHorizontal size={16} /></button>
                </div>
            </aside>
            <div className="lg:pl-[250px]">
                <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-[var(--panel-border)] bg-white/90 px-5 backdrop-blur-xl sm:px-8 lg:px-10">
                    <div className="flex items-center gap-3">
                        <button aria-label="Buka menu" onClick={() => setMenu(true)} className="p-2 text-slate-500 lg:hidden"><Menu size={21} /></button>
                        <div><p className="text-sm font-bold">{currentPageLabel}</p><p className="hidden text-[11px] text-slate-500 sm:block">Transaksi tersimpan di database</p></div>
                    </div>
                    <div className="flex items-center gap-3">
                        <form method="POST" action="/logout">
                            <input type="hidden" name="_token" value={document.querySelector('meta[name="csrf-token"]')?.content || ''} />
                            <button className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-[11px] font-bold text-slate-500 hover:text-slate-800">Keluar</button>
                        </form>
                        <span className="hidden rounded-lg border border-[var(--panel-border)] bg-slate-50 px-3 py-2 text-[11px] capitalize text-slate-500 md:block">{currentMonthLabel}</span>
                        <button aria-label={`Buka kalender, ${unpaid} tagihan belum lunas`} onClick={() => go('calendar')} className="relative p-2 text-slate-500 hover:text-slate-800"><Bell size={18} />{unpaid > 0 && <span className="absolute right-0 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">{unpaid}</span>}</button>
                        <button onClick={openNewTransaction} className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-3 py-2.5 text-xs font-extrabold text-[var(--accent-contrast)]"><Plus size={16} /><span className="hidden sm:inline">Tambah transaksi</span></button>
                    </div>
                </header>
                <main className="mx-auto max-w-[1550px] px-5 py-7 sm:px-8 lg:px-10">
                    {notice && <div role="status" className="mb-5 flex items-center gap-2 rounded-xl border border-blue-200 bg-[var(--accent)]/10 px-4 py-3 text-xs font-bold text-[var(--accent)]"><Check size={15} />{notice}</div>}
                    {loadError && <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-500"><span>{loadError}</span><button onClick={loadAccountData} className="font-bold underline">Coba lagi</button></div>}
                    {loading && <p role="status" className="mb-5 text-xs text-slate-500">Memuat data akun...</p>}
                    {content}
                    {active === 'dashboard' && <TransactionSummary records={records} go={go} />}
                    {active === 'dashboard' && <PaylaterSummary bills={bills} go={go} />}
                </main>
            </div>
            {menu && <div className="fixed inset-0 z-50 lg:hidden"><button aria-label="Tutup menu" onClick={() => setMenu(false)} className="absolute inset-0 bg-black/30" /><aside className="relative h-full w-[270px] bg-[var(--app-bg)] p-4"><div className="mb-8 flex justify-between"><b>dompet<span className="text-[var(--accent)]">gweh</span></b><button aria-label="Tutup menu" onClick={() => setMenu(false)}><X /></button></div><Nav active={active} onChange={go} unpaid={unpaid} /></aside></div>}
            {transactionOpen && <DynamicTransactionModal transaction={editingTransaction} onClose={closeTransaction} onSave={saveTransaction} />}
            {billOpen && <BillModal onClose={() => setBillOpen(false)} onSave={saveBill} />}
        </div>
    );
}
