import { useEffect, useRef, useState } from 'react';
import {
    ArrowDownLeft, ArrowUpRight, Bell, CalendarDays, Check, ChevronLeft, ChevronRight, CircleDollarSign,
    CreditCard, Landmark, LayoutGrid, Menu, MoreHorizontal, Pencil, Plus, ReceiptText,
    Search, Settings2, Sparkles, Trash2, TrendingUp, WalletCards, X,
} from 'lucide-react';
import { Chart, Filler, LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip } from 'chart.js';

Chart.register(Filler, LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip);

const money = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
const rupiah = (amount) => money.format(amount || 0);
const cls = (...names) => names.filter(Boolean).join(' ');

const pages = [
    ['dashboard', LayoutGrid, 'Ringkasan'],
    ['wallet', WalletCards, 'Dompet'],
    ['transactions', ReceiptText, 'Transaksi'],
    ['calendar', CalendarDays, 'Kalender'],
    ['paylater', CreditCard, 'Paylater'],
    ['analysis', TrendingUp, 'Analisis'],
    ['settings', Settings2, 'Pengaturan'],
];

function stored(key, fallback, valid) {
    try {
        const value = JSON.parse(localStorage.getItem(key));
        return valid(value) ? value : fallback;
    } catch {
        return fallback;
    }
}

function loadRecurringIncomes() {
    const savedSchedules = stored('dompetgweh-recurring-incomes-v2', [], Array.isArray);
    if (savedSchedules.length) return savedSchedules;

    const legacy = stored('dompetgweh-recurring-income-v1', null, (value) => typeof value?.enabled === 'boolean');
    if (!legacy?.enabled || !Number.isFinite(legacy.amount) || legacy.amount <= 0) return [];

    return [{
        id: 'legacy-income',
        enabled: true,
        description: legacy.description || 'Pemasukan bulanan',
        amount: legacy.amount,
        day: Math.min(31, Math.max(1, Number(legacy.day) || 1)),
        category: legacy.category || 'Pemasukan',
        wallet: ['bank', 'cash'].includes(legacy.wallet) ? legacy.wallet : 'bank',
        lastProcessedMonth: legacy.lastProcessedMonth || null,
    }];
}

function apiRequest(url, options = {}) {
    const token = document.querySelector('meta[name="csrf-token"]')?.content;
    return fetch(url, {
        ...options,
        headers: {
            Accept: 'application/json',
            ...(options.body ? { 'Content-Type': 'application/json' } : {}),
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
        color: income ? 'bg-[#22C55E] text-[#052E16]' : 'bg-[#F43F5E] text-[#F4F4F5]',
        title,
        category: transaction.category,
        date: formatDate(transaction.transaction_date),
        transactionDate: transaction.transaction_date,
        amount: Number(transaction.amount) * (income ? 1 : -1),
        wallet: transaction.wallet || 'bank',
    };
}

function LineChart({ records }) {
    const chartRef = useRef(null);
    useEffect(() => {
        const context = chartRef.current?.getContext('2d');
        if (!context) return undefined;
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
        fill.addColorStop(0, 'rgba(34,197,94,.22)');
        fill.addColorStop(1, 'rgba(34,197,94,0)');
        const chart = new Chart(context, {
            type: 'line',
            data: { labels: months.map((month) => month.label), datasets: [{ data: months.map((month) => month.total / 1000000), borderColor: '#22C55E', backgroundColor: fill, borderWidth: 2.3, fill: true, tension: .42, pointRadius: 3 }] },
            options: { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { display: false }, tooltip: { displayColors: false, backgroundColor: '#18181B', titleColor: '#F4F4F5', bodyColor: '#22C55E' } }, scales: { x: { grid: { display: false }, border: { display: false }, ticks: { color: '#71717A', font: { size: 11 } } }, y: { grid: { color: '#27272A' }, border: { display: false }, ticks: { color: '#71717A', callback: (value) => `${value}jt` } } } },
        });
        return () => chart.destroy();
    }, [records]);
    return <div className="h-56"><canvas ref={chartRef} /></div>;
}

function Nav({ active, onChange, unpaid }) {
    return <nav className="space-y-1">{pages.map(([id, Icon, label], index) => <div key={id}>{index === 5 && <div className="my-5 border-t border-[#27272A]" />}<button onClick={() => onChange(id)} className={cls('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition', active === id ? 'bg-zinc-800 text-[#F4F4F5]' : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200')}><Icon size={18} /><span className="flex-1 text-left">{label}</span>{id === 'paylater' && unpaid > 0 && <span className="rounded-md bg-[#22C55E] px-1.5 py-0.5 text-[9px] font-extrabold text-[#052E16]">{unpaid}</span>}</button></div>)}</nav>;
}

function PageTitle({ title, subtitle, action, onAction }) {
    return <div className="mb-7 flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">DompetGweh</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight">{title}</h1><p className="mt-1 text-sm text-zinc-500">{subtitle}</p></div>{action && <button onClick={onAction} className="flex items-center gap-2 rounded-xl bg-[#22C55E] px-4 py-3 text-xs font-extrabold text-[#052E16] hover:bg-[#4ADE80]"><Plus size={16} strokeWidth={3} />{action}</button>}</div>;
}

function TransactionRows({ records, onDelete, onEdit }) {
    if (!records.length) return <div className="p-8 text-center text-xs text-zinc-500">Belum ada transaksi yang sesuai.</div>;
    return <div className="divide-y divide-[#27272A]">{records.map((record) => <div key={record.id} className="flex items-center gap-3 px-5 py-4 sm:px-6"><div className={cls('grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-extrabold', record.color)}>{record.icon}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-zinc-200">{record.title}</p><p className="mt-0.5 text-[10px] text-zinc-500">{record.category} · {record.date}</p></div><p className={cls('text-right text-xs font-extrabold', record.amount > 0 ? 'text-[#22C55E]' : 'text-zinc-200')}>{record.amount > 0 ? '+' : '−'}{rupiah(Math.abs(record.amount))}</p>{onEdit && <button onClick={() => onEdit(record)} aria-label={`Edit transaksi ${record.title}`} className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-800 hover:text-zinc-200"><Pencil size={15} /></button>}{onDelete && <button onClick={() => onDelete(record.id)} aria-label={`Hapus transaksi ${record.title}`} className="rounded-lg p-2 text-zinc-600 hover:bg-[#F43F5E]/10 hover:text-[#FDA4AF]"><Trash2 size={15} /></button>}</div>)}</div>;
}

function TransactionModal({ onClose, onSave, transaction }) {
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
    const inputClass = 'mt-2 w-full rounded-xl border border-[#27272A] bg-[#09090B] px-4 py-3 text-sm outline-none focus:border-[#22C55E]';
    return <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm"><form onSubmit={submit} className="my-auto w-full max-w-md rounded-[22px] border border-[#27272A] bg-[#18181B] p-6"><div className="mb-6 flex items-center justify-between"><div><p className="eyebrow">Quick entry</p><h2 className="mt-1 text-xl font-bold">{transaction ? 'Edit transaksi' : 'Catat transaksi'}</h2></div><button type="button" onClick={onClose} className="p-2 text-zinc-400"><X size={18} /></button></div><label className="mb-4 block text-xs font-bold text-zinc-400">DESKRIPSI<input autoFocus required maxLength="255" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Contoh: Belanja bulanan" className={inputClass} /></label><label className="mb-4 block text-xs font-bold text-zinc-400">NOMINAL<input required type="number" min="1" step="1" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="0" className={inputClass} /></label><div className="mb-4 grid grid-cols-2 gap-3"><button type="button" onClick={() => setForm({ ...form, type: 'expense', category: 'Pengeluaran' })} className={cls('rounded-xl border py-3 text-sm font-bold', form.type === 'expense' ? 'border-[#F43F5E] bg-[#F43F5E]/10 text-[#FDA4AF]' : 'border-[#27272A] text-zinc-500')}>Pengeluaran</button><button type="button" onClick={() => setForm({ ...form, type: 'income', category: 'Pemasukan' })} className={cls('rounded-xl border py-3 text-sm font-bold', form.type === 'income' ? 'border-[#22C55E] bg-[#22C55E]/10 text-[#22C55E]' : 'border-[#27272A] text-zinc-500')}>Pemasukan</button></div><label className="mb-4 block text-xs font-bold text-zinc-400">KATEGORI<input required maxLength="255" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className={inputClass} /></label><label className="mb-4 block text-xs font-bold text-zinc-400">TANGGAL<input required type="date" value={form.transaction_date} onChange={(event) => setForm({ ...form, transaction_date: event.target.value })} className={inputClass} /></label><label className="mb-5 block text-xs font-bold text-zinc-400">SUMBER DANA<select value={form.wallet} onChange={(event) => setForm({ ...form, wallet: event.target.value })} className={inputClass}><option value="bank">Saldo rekening</option><option value="cash">Uang tunai</option></select></label>{error && <p role="alert" className="mb-4 rounded-lg bg-[#F43F5E]/10 p-3 text-xs text-[#FDA4AF]">{error}</p>}<button className="w-full rounded-xl bg-[#22C55E] py-3.5 text-sm font-extrabold text-[#052E16]">{transaction ? 'Simpan perubahan' : 'Simpan transaksi'}</button></form></div>;
}

function BillModal({ onClose, onSave }) {
    const [form, setForm] = useState({ brand: '', amount: '', due: '' });
    const submit = (event) => { event.preventDefault(); if (form.brand.trim() && form.due && Number(form.amount)) { onSave({ ...form, amount: Number(form.amount) }); onClose(); } };
    return <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm"><form onSubmit={submit} className="w-full max-w-md rounded-[22px] border border-[#27272A] bg-[#18181B] p-6"><div className="mb-6 flex items-center justify-between"><div><p className="eyebrow">Paylater planner</p><h2 className="mt-1 text-xl font-bold">Tambah tagihan</h2></div><button type="button" onClick={onClose} className="p-2 text-zinc-400"><X size={18} /></button></div><label className="mb-4 block text-xs font-bold text-zinc-400">PENYEDIA<input required value={form.brand} onChange={(event) => setForm({ ...form, brand: event.target.value })} placeholder="Contoh: Kredivo" className="mt-2 w-full rounded-xl border border-[#27272A] bg-[#09090B] px-4 py-3 text-sm outline-none focus:border-[#22C55E]" /></label><label className="mb-4 block text-xs font-bold text-zinc-400">NOMINAL<input required type="number" min="1" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="0" className="mt-2 w-full rounded-xl border border-[#27272A] bg-[#09090B] px-4 py-3 text-sm outline-none focus:border-[#22C55E]" /></label><label className="mb-6 block text-xs font-bold text-zinc-400">JATUH TEMPO<input required type="date" value={form.due} onChange={(event) => setForm({ ...form, due: event.target.value })} className="mt-2 w-full rounded-xl border border-[#27272A] bg-[#09090B] px-4 py-3 text-sm outline-none focus:border-[#22C55E]" /></label><button className="w-full rounded-xl bg-[#22C55E] py-3.5 text-sm font-extrabold text-[#052E16]">Simpan tagihan</button></form></div>;
}

function Dashboard({ wallets, records, bills, recurringIncomes, go }) {
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
    return <><PageTitle title="Ringkasan keuangan" subtitle="Berikut posisi finansialmu hari ini." /><section className="grid gap-4 xl:grid-cols-12"><div className="panel rounded-[20px] p-6 xl:col-span-5"><div className="flex justify-between"><div><p className="eyebrow">Total uang tersedia</p><p className="mt-3 text-3xl font-extrabold">{rupiah(balance)}</p><p className="mt-3 flex items-center gap-2 text-[11px] font-bold text-[#22C55E]"><TrendingUp size={14} /> Arus kas terpantau</p></div><button aria-label="Buka dompet" onClick={() => go('wallet')} className="rounded-xl border border-[#27272A] p-2.5 text-zinc-400"><MoreHorizontal size={18} /></button></div><div className="mt-8 grid grid-cols-2 gap-3"><button onClick={() => go('wallet')} className="panel-soft rounded-xl p-3.5 text-left hover:border-[#22C55E]/50"><Landmark size={15} className="mb-3 text-[#22C55E]" /><p className="text-[10px] font-bold uppercase text-zinc-500">Saldo rekening</p><p className="mt-1 text-sm font-extrabold">{rupiah(wallets.bank)}</p></button><button onClick={() => go('wallet')} className="panel-soft rounded-xl p-3.5 text-left hover:border-[#22C55E]/50"><CircleDollarSign size={15} className="mb-3 text-zinc-300" /><p className="text-[10px] font-bold uppercase text-zinc-500">Uang tunai</p><p className="mt-1 text-sm font-extrabold">{rupiah(wallets.cash)}</p></button></div></div><div className="panel rounded-[20px] p-6 xl:col-span-3"><div className="flex justify-between"><div><p className="eyebrow">Pemasukan bulan ini</p><p className="mt-3 text-xl font-extrabold">{rupiah(monthIncome)}</p></div><ArrowDownLeft className="text-[#22C55E]" /></div><button onClick={() => go('settings')} className="mt-7 text-left text-xs text-zinc-500">{activeSchedules.length ? `${activeSchedules.length} jadwal aktif: ${activeSchedules.map((schedule) => `tgl ${schedule.day}`).join(', ')}` : 'Atur pemasukan otomatis bulanan'} <span className="font-bold text-[#22C55E]">→</span></button><p className="mt-2 text-xs text-zinc-500">Pengeluaran bulan ini {rupiah(monthExpense)}</p><div className="mt-2 h-1.5 rounded-full bg-zinc-800"><div className="h-full rounded-full bg-[#22C55E]" style={{ width: `${monthIncome ? Math.min(100, (monthExpense / monthIncome) * 100) : 0}%` }} /></div></div><div className="panel rounded-[20px] p-6 xl:col-span-4"><div className="flex justify-between"><div><p className="eyebrow">Total pengeluaran</p><p className="mt-3 text-xl font-extrabold">{rupiah(expense)}</p></div><ArrowUpRight className="text-[#FDA4AF]" /></div><button onClick={() => go('transactions')} className="mt-7 text-xs font-bold text-[#22C55E]">Buka riwayat transaksi →</button></div></section><section className="mt-4 grid gap-4 xl:grid-cols-12"><div className="panel rounded-[20px] p-6 xl:col-span-7"><div className="flex justify-between"><div><p className="text-sm font-extrabold">Arus kas</p><p className="mt-1 text-[11px] text-zinc-500">Selisih pemasukan dan pengeluaran per bulan</p></div><button onClick={() => go('analysis')} className="text-xs font-bold text-[#22C55E]">Analisis</button></div><LineChart records={records} /></div><div className="panel rounded-[20px] p-6 xl:col-span-5"><div className="flex justify-between"><div><p className="text-sm font-extrabold">Tagihan paylater</p><p className="mt-1 text-[11px] text-zinc-500">6 bulan ke depan</p></div><b className="text-xs text-[#FDA4AF]">{rupiah(remaining)}</b></div><div className="mt-6 grid grid-cols-6 gap-2">{billMonths.map((month) => <div key={month.key}><p className="mb-2 text-center text-[9px] text-zinc-600">{month.label}</p><div className={cls('h-1.5 rounded-full', month.bills.length ? 'bg-zinc-700' : 'bg-[#22C55E]/30')} /></div>)}</div><button onClick={() => go('paylater')} className="mt-7 w-full rounded-xl border border-[#27272A] py-2.5 text-xs font-bold text-zinc-400 hover:bg-zinc-800">Kelola tagihan</button></div></section><section className="panel mt-4 overflow-hidden rounded-[20px]"><div className="flex justify-between border-b border-[#27272A] px-6 py-5"><div><p className="text-sm font-extrabold">Aktivitas terbaru</p><p className="mt-1 text-[11px] text-zinc-500">Transaksi yang tercatat</p></div><button onClick={() => go('transactions')} className="text-xs font-bold text-[#22C55E]">Lihat semua</button></div><TransactionRows records={records.slice(0, 4)} /></section></>;
}

function Wallet({ wallets, save, add }) {
    const [editing, setEditing] = useState(null);
    const [amount, setAmount] = useState('');
    const submit = (event) => { event.preventDefault(); if (Number(amount) >= 0) { save(editing, Number(amount)); setEditing(null); } };
    const card = (key, label, Icon, text) => <div className="panel rounded-[20px] p-6"><div className="flex justify-between"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#22C55E]/10 text-[#22C55E]"><Icon size={20} /></span><button aria-label={`Atur ${label}`} onClick={() => { setEditing(key); setAmount(String(wallets[key])); }} className="rounded-lg border border-[#27272A] p-2 text-zinc-400"><Pencil size={15} /></button></div><p className="mt-6 text-[11px] font-bold uppercase text-zinc-500">{label}</p><p className="mt-2 text-2xl font-extrabold">{rupiah(wallets[key])}</p><p className="mt-2 text-xs text-zinc-500">{text}</p></div>;
    return <><PageTitle title="Dompet" subtitle="Kelola uang tunai dan saldo rekening." action="Catat transaksi" onAction={add} /><div className="grid gap-4 md:grid-cols-2">{card('bank', 'Saldo rekening', Landmark, 'Dana pada rekening utama')}{card('cash', 'Uang tunai', CircleDollarSign, 'Uang fisik yang tersedia')}</div><div className="panel mt-4 rounded-[20px] p-6 text-sm leading-6 text-zinc-500">Saldo berubah otomatis dari transaksi. Tombol pensil menyesuaikan saldo awal dompet ini.</div>{editing && <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4"><form onSubmit={submit} className="w-full max-w-sm rounded-[20px] border border-[#27272A] bg-[#18181B] p-6"><div className="flex justify-between"><h2 className="text-lg font-bold">Sesuaikan saldo saat ini</h2><button type="button" onClick={() => setEditing(null)} aria-label="Tutup"><X size={18} /></button></div><input aria-label="Saldo" autoFocus required type="number" min="0" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-5 w-full rounded-xl border border-[#27272A] bg-[#09090B] px-4 py-3 outline-none focus:border-[#22C55E]" /><button className="mt-4 w-full rounded-xl bg-[#22C55E] py-3 text-sm font-bold text-[#052E16]">Simpan saldo</button></form></div>}</>;
}

function Transactions({ records, remove, edit, add }) {
    const [filter, setFilter] = useState('all');
    const [query, setQuery] = useState('');
    const filtered = records.filter((record) => (filter === 'all' || (filter === 'income' ? record.amount > 0 : record.amount < 0)) && record.title.toLowerCase().includes(query.toLowerCase()));
    return <><PageTitle title="Transaksi" subtitle="Riwayat pemasukan dan pengeluaran yang tersimpan." action="Tambah transaksi" onAction={add} /><div className="panel overflow-hidden rounded-[20px]"><div className="flex flex-wrap gap-3 border-b border-[#27272A] p-4"><div className="relative min-w-[200px] flex-1"><Search size={15} className="absolute left-3 top-3 text-zinc-500" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari transaksi" className="w-full rounded-lg border border-[#27272A] bg-[#09090B] py-2.5 pl-9 text-xs outline-none focus:border-[#22C55E]" /></div><div className="flex rounded-lg bg-zinc-900 p-1">{[['all', 'Semua'], ['income', 'Masuk'], ['expense', 'Keluar']].map(([id, label]) => <button key={id} onClick={() => setFilter(id)} className={cls('rounded-md px-3 py-1.5 text-[11px] font-bold', filter === id ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500')}>{label}</button>)}</div></div><TransactionRows records={filtered} onDelete={remove} onEdit={edit} /></div></>;
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
    return <><PageTitle title="Kalender keuangan" subtitle="Jadwal transaksi dan kewajiban yang tercatat." action="Kelola paylater" onAction={() => go('paylater')} /><div className="grid gap-4 lg:grid-cols-3"><div className="panel rounded-[20px] p-6 lg:col-span-2"><div className="flex items-center justify-between"><button aria-label="Bulan sebelumnya" onClick={() => setMonthOffset((value) => value - 1)} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800"><ChevronLeft size={18} /></button><p className="text-sm font-extrabold capitalize">{monthLabel}</p><button aria-label="Bulan berikutnya" onClick={() => setMonthOffset((value) => value + 1)} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800"><ChevronRight size={18} /></button></div><div className="mt-5 grid grid-cols-7 gap-2">{weekdayLabels.map((day) => <p key={day} className="pb-1 text-center text-[10px] font-bold text-zinc-500">{day}</p>)}{Array.from({ length: leadingDays + dayCount }, (_, index) => { const day = index - leadingDays + 1; if (day < 1) return <div key={`empty-${index}`} />; const date = `${monthKey}-${String(day).padStart(2, '0')}`; const dayEvents = events.filter((event) => event.date === date); return <button key={date} onClick={() => setSelectedDate(date)} className={cls('flex aspect-square flex-col items-center justify-center rounded-lg text-[11px]', selectedDate === date ? 'border border-[#22C55E] bg-[#22C55E]/10 text-[#22C55E]' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800')}><span>{day}</span><span className="mt-1 flex h-1 gap-0.5">{dayEvents.slice(0, 3).map((event) => <i key={event.id} className={cls('h-1 w-1 rounded-full', event.type === 'bill' || event.amount < 0 ? 'bg-[#F43F5E]' : 'bg-[#22C55E]')} />)}</span></button>; })}</div><div className="mt-5 border-t border-[#27272A] pt-4"><p className="text-xs font-bold">{selectedLabel}</p>{selectedEvents.length ? <div className="mt-3 space-y-3">{selectedEvents.map((event) => <div key={event.id} className="flex items-center justify-between text-xs"><span className="font-semibold">{event.title}</span><span className={event.amount >= 0 ? 'text-[#22C55E]' : 'text-[#FDA4AF]'}>{event.amount >= 0 ? '+' : '−'}{rupiah(Math.abs(event.amount))}</span></div>)}</div> : <p className="mt-2 text-xs text-zinc-500">Tidak ada transaksi atau tagihan pada tanggal ini.</p>}</div></div><div className="panel rounded-[20px] p-6"><p className="text-sm font-extrabold">Jadwal berikutnya</p><div className="mt-5 space-y-4">{upcoming.length ? upcoming.map((event) => <div key={event.id} className="flex gap-3"><i className={cls('mt-1.5 h-2 w-2 rounded-full', event.type === 'bill' || event.amount < 0 ? 'bg-[#F43F5E]' : 'bg-[#22C55E]')} /><div className="flex-1"><p className="text-xs font-bold">{event.title}</p><p className="text-[10px] text-zinc-500">{formatDate(event.date)}</p></div><b className="text-xs text-zinc-300">{rupiah(Math.abs(event.amount))}</b></div>) : <p className="text-xs text-zinc-500">Belum ada jadwal mendatang.</p>}</div></div></div></>;
}

function Paylater({ bills, toggle, add }) {
    const total = bills.filter((bill) => !bill.paid).reduce((sum, bill) => sum + bill.amount, 0);
    return <><PageTitle title="Paylater" subtitle="Rencanakan kewajiban sampai enam bulan ke depan." action="Tambah tagihan" onAction={add} /><div className="grid gap-4 md:grid-cols-3"><Stat title="Total belum dibayar" value={rupiah(total)} tone="text-[#FDA4AF]" /><Stat title="Tagihan aktif" value={String(bills.filter((bill) => !bill.paid).length)} tone="text-zinc-100" /><Stat title="Sudah selesai" value={String(bills.filter((bill) => bill.paid).length)} tone="text-[#22C55E]" /></div><div className="panel mt-4 overflow-hidden rounded-[20px]"><div className="border-b border-[#27272A] px-6 py-5 text-sm font-extrabold">Rencana pembayaran</div><div className="divide-y divide-[#27272A]">{bills.map((bill) => <div key={bill.id} className="flex flex-wrap items-center gap-4 px-6 py-4"><div className={cls('grid h-9 w-9 place-items-center rounded-xl text-xs font-extrabold', bill.paid ? 'bg-[#22C55E] text-[#052E16]' : 'bg-[#F43F5E] text-[#F4F4F5]')}>{bill.paid ? <Check size={16} /> : bill.letter}</div><div className="min-w-[150px] flex-1"><p className={cls('text-xs font-bold', bill.paid && 'text-zinc-500 line-through')}>{bill.brand}</p><p className="mt-1 text-[10px] text-zinc-500">{bill.due}</p></div><b className={cls('text-xs', bill.paid ? 'text-zinc-600 line-through' : 'text-zinc-200')}>{rupiah(bill.amount)}</b><button onClick={() => toggle(bill.id)} className={cls('rounded-lg px-3 py-2 text-[10px] font-extrabold', bill.paid ? 'bg-zinc-800 text-zinc-400' : 'bg-[#22C55E] text-[#052E16]')}>{bill.paid ? 'Batalkan' : 'Tandai lunas'}</button></div>)}</div></div></>;
}

function Stat({ title, value, tone }) { return <div className="panel rounded-[20px] p-6"><p className="eyebrow">{title}</p><p className={cls('mt-3 text-2xl font-extrabold', tone)}>{value}</p></div>; }

function Analysis({ wallets, records, bills }) {
    const income = records.filter((record) => record.amount > 0).reduce((sum, record) => sum + record.amount, 0);
    const expense = records.filter((record) => record.amount < 0).reduce((sum, record) => sum + Math.abs(record.amount), 0);
    const billsTotal = bills.filter((bill) => !bill.paid).reduce((sum, bill) => sum + bill.amount, 0);
    return <><PageTitle title="Analisis" subtitle="Ringkasan keputusan berdasarkan catatan keuanganmu." /><div className="grid gap-4 md:grid-cols-3"><Stat title="Pemasukan tercatat" value={rupiah(income)} tone="text-[#22C55E]" /><Stat title="Pengeluaran tercatat" value={rupiah(expense)} tone="text-[#FDA4AF]" /><Stat title="Sisa paylater" value={rupiah(billsTotal)} tone="text-zinc-100" /></div><div className="panel mt-4 rounded-[20px] p-6"><p className="text-sm font-extrabold">Arus kas enam bulan terakhir</p><LineChart records={records} /></div></>;
}

function Settings({ profile, recurringIncomes, save, addRecurringIncome, toggleRecurringIncome, deleteRecurringIncome, reset }) {
    const [name, setName] = useState(profile.name);
    const [income, setIncome] = useState({ description: '', amount: '', day: '1', category: 'Gaji', wallet: 'bank' });
    useEffect(() => setName(profile.name), [profile.name]);
    const inputClass = 'mt-2 w-full rounded-xl border border-[#27272A] bg-[#09090B] px-4 py-3 text-sm outline-none focus:border-[#22C55E]';
    const submitRecurringIncome = (event) => {
        event.preventDefault();
        addRecurringIncome({ ...income, amount: Number(income.amount), day: Number(income.day) });
        setIncome({ description: '', amount: '', day: '1', category: 'Gaji', wallet: 'bank' });
    };
    return <>
        <PageTitle title="Pengaturan" subtitle="Atur profil dan pemasukan rutin." />
        <div className="grid gap-4 lg:grid-cols-2">
            <form onSubmit={(event) => { event.preventDefault(); save({ name: name.trim() || 'Reihan' }); }} className="panel rounded-[20px] p-6">
                <p className="text-sm font-extrabold">Profil dashboard</p>
                <label className="mt-5 block text-xs font-bold text-zinc-400">NAMA PANGGILAN<input maxLength="80" value={name} onChange={(event) => setName(event.target.value)} className={inputClass} /></label>
                <button className="mt-5 rounded-xl bg-[#22C55E] px-4 py-3 text-xs font-extrabold text-[#052E16]">Simpan profil</button>
            </form>
            <form onSubmit={submitRecurringIncome} className="panel rounded-[20px] p-6">
                <p className="text-sm font-extrabold">Tambah pemasukan bulanan otomatis</p>
                <p className="mt-2 text-xs leading-5 text-zinc-500">Transaksi pemasukan akan dibuat otomatis pada tanggal yang dipilih. Jika aplikasi tidak dibuka pada hari itu, transaksi dibuat saat aplikasi dibuka berikutnya di bulan yang sama.</p>
                <label className="mt-5 block text-xs font-bold text-zinc-400">DESKRIPSI<input required maxLength="255" value={income.description} onChange={(event) => setIncome({ ...income, description: event.target.value })} placeholder="Contoh: Gaji bulanan" className={inputClass} /></label>
                <div className="mt-4 grid grid-cols-2 gap-3">
                    <label className="block text-xs font-bold text-zinc-400">NOMINAL<input required type="number" min="1" step="1" value={income.amount} onChange={(event) => setIncome({ ...income, amount: event.target.value })} placeholder="0" className={inputClass} /></label>
                    <label className="block text-xs font-bold text-zinc-400">TANGGAL SETIAP BULAN<input required type="number" min="1" max="31" value={income.day} onChange={(event) => setIncome({ ...income, day: event.target.value })} className={inputClass} /></label>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                    <label className="block text-xs font-bold text-zinc-400">KATEGORI<input required maxLength="255" value={income.category} onChange={(event) => setIncome({ ...income, category: event.target.value })} className={inputClass} /></label>
                    <label className="block text-xs font-bold text-zinc-400">MASUK KE<select value={income.wallet} onChange={(event) => setIncome({ ...income, wallet: event.target.value })} className={inputClass}><option value="bank">Saldo rekening</option><option value="cash">Uang tunai</option></select></label>
                </div>
                <button className="mt-5 rounded-xl bg-[#22C55E] px-4 py-3 text-xs font-extrabold text-[#052E16]">Tambah jadwal</button>
                <div className="mt-6 border-t border-[#27272A] pt-5">
                    <p className="text-xs font-bold">Jadwal tersimpan ({recurringIncomes.length})</p>
                    {recurringIncomes.length ? <div className="mt-3 divide-y divide-[#27272A]">{recurringIncomes.map((schedule) => <div key={schedule.id} className="flex items-center gap-3 py-3"><input aria-label={`Aktifkan ${schedule.description}`} type="checkbox" checked={schedule.enabled} onChange={() => toggleRecurringIncome(schedule.id)} className="h-4 w-4 accent-[#22C55E]" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{schedule.description}</p><p className="mt-1 text-[10px] text-zinc-500">{rupiah(schedule.amount)} · tanggal {schedule.day} · {schedule.wallet === 'bank' ? 'Rekening' : 'Tunai'}</p></div><button type="button" onClick={() => deleteRecurringIncome(schedule.id)} aria-label={`Hapus ${schedule.description}`} className="rounded-lg p-2 text-zinc-500 hover:bg-[#F43F5E]/10 hover:text-[#FDA4AF]"><Trash2 size={15} /></button></div>)}</div> : <p className="mt-3 text-xs text-zinc-500">Belum ada jadwal pemasukan. Tambahkan jadwal untuk tanggal 1, 25, atau tanggal lainnya.</p>}
                </div>
            </form>
            <div className="panel rounded-[20px] p-6 lg:col-span-2">
                <p className="text-sm font-extrabold">Data lokal</p>
                <p className="mt-2 text-sm leading-6 text-zinc-500">Hapus tagihan paylater, saldo awal, semua jadwal pemasukan otomatis, dan nama profil yang disimpan di browser ini. Riwayat transaksi database tidak akan terhapus.</p>
                <button onClick={reset} className="mt-5 rounded-xl border border-[#F43F5E]/50 px-4 py-3 text-xs font-extrabold text-[#FDA4AF] hover:bg-[#F43F5E]/10">Reset data lokal</button>
            </div>
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
    const [recurringIncomes, setRecurringIncomes] = useState(loadRecurringIncomes);
    const processingIncomeMonths = useRef(new Set());
    const [openingBalances, setOpeningBalances] = useState(() => stored('dompetgweh-opening-balances-v2', { bank: 0, cash: 0 }, (value) => Number.isFinite(value?.bank) && Number.isFinite(value?.cash)));
    const [bills, setBills] = useState(() => stored('dompetgweh-bills-v2', [], Array.isArray));
    const [profile, setProfile] = useState(() => stored('dompetgweh-profile', { name: 'Reihan' }, (value) => typeof value?.name === 'string'));
    const loadTransactions = async () => {
        setLoading(true);
        setLoadError('');
        try {
            const transactions = await apiRequest('/api/transactions');
            setRecords(transactions.map(normalizeTransaction));
        } catch (error) {
            setLoadError(`Transaksi gagal dimuat: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        loadTransactions();
    }, []);
    useEffect(() => { localStorage.setItem('dompetgweh-opening-balances-v2', JSON.stringify(openingBalances)); }, [openingBalances]);
    useEffect(() => { localStorage.setItem('dompetgweh-bills-v2', JSON.stringify(bills)); }, [bills]);
    useEffect(() => { localStorage.setItem('dompetgweh-profile', JSON.stringify(profile)); }, [profile]);
    useEffect(() => { localStorage.setItem('dompetgweh-recurring-incomes-v2', JSON.stringify(recurringIncomes)); }, [recurringIncomes]);
    useEffect(() => {
        if (loading) return undefined;
        const processMonthlyIncome = async () => {
            const today = new Date();
            const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
            for (const schedule of recurringIncomes) {
                if (!schedule.enabled || schedule.amount <= 0 || schedule.lastProcessedMonth === month) continue;
                const dueDay = Math.min(schedule.day, lastDay);
                const processingKey = `${schedule.id}:${month}`;
                if (today.getDate() < dueDay || processingIncomeMonths.current.has(processingKey)) continue;

                processingIncomeMonths.current.add(processingKey);
                const transactionDate = `${month}-${String(dueDay).padStart(2, '0')}`;
                try {
                    const transaction = await apiRequest('/api/transactions', {
                        method: 'POST',
                        body: JSON.stringify({
                            description: schedule.description,
                            amount: schedule.amount,
                            type: 'income',
                            category: schedule.category,
                            transaction_date: transactionDate,
                            wallet: schedule.wallet,
                            recurring_month: month,
                            recurring_key: schedule.id,
                        }),
                    });
                    setRecords((current) => {
                        if (current.some((record) => record.id === transaction.id)) return current;
                        return [normalizeTransaction(transaction), ...current]
                            .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate) || b.id - a.id);
                    });
                    setRecurringIncomes((current) => current.map((item) => item.id === schedule.id
                        ? { ...item, lastProcessedMonth: month }
                        : item));
                    setNotice(`${schedule.description} bulan ini berhasil dicatat otomatis.`);
                } catch (error) {
                    setNotice(`Pemasukan otomatis "${schedule.description}" gagal dicatat: ${error.message}`);
                } finally {
                    processingIncomeMonths.current.delete(processingKey);
                }
            }
        };
        processMonthlyIncome();
        const interval = window.setInterval(processMonthlyIncome, 60000);
        return () => window.clearInterval(interval);
    }, [loading, recurringIncomes]);
    const toast = (message) => { setNotice(message); window.setTimeout(() => setNotice(''), 2500); };
    const go = (page) => { setActive(page); setMenu(false); };
    const walletTotals = records.reduce((totals, record) => {
        totals[record.wallet] += record.amount;
        return totals;
    }, { bank: openingBalances.bank, cash: openingBalances.cash });
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
        toast('Transaksi dihapus');
    };
    const saveBill = (bill) => {
        const date = new Date(`${bill.due}T00:00:00`);
        const due = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
        const month = new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(date);
        setBills((current) => [...current, { id: Date.now(), month, due, dueDate: bill.due, brand: bill.brand.trim(), amount: bill.amount, paid: false, letter: bill.brand.trim()[0].toUpperCase() }]);
        toast('Tagihan paylater ditambahkan');
    };
    const addRecurringIncome = (income) => {
        const id = `income-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`}`;
        setRecurringIncomes((current) => [...current, {
            ...income,
            id,
            enabled: true,
            lastProcessedMonth: null,
        }]);
        toast(`Jadwal "${income.description}" ditambahkan`);
    };
    const toggleRecurringIncome = (id) => {
        setRecurringIncomes((current) => current.map((schedule) => schedule.id === id
            ? { ...schedule, enabled: !schedule.enabled }
            : schedule));
    };
    const deleteRecurringIncome = (id) => {
        setRecurringIncomes((current) => current.filter((schedule) => schedule.id !== id));
        toast('Jadwal pemasukan dihapus');
    };
    const reset = () => {
        if (!window.confirm('Hapus tagihan, saldo awal, jadwal pemasukan, dan profil lokal? Transaksi database tidak akan dihapus.')) return;
        setOpeningBalances({ bank: 0, cash: 0 });
        setBills([]);
        setProfile({ name: 'Reihan' });
        setRecurringIncomes([]);
        toast('Data lokal direset');
    };
    const unpaid = bills.filter((bill) => !bill.paid).length;
    const currentMonthLabel = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date());
    const currentPageLabel = pages.find(([id]) => id === active)?.[2] || 'Ringkasan';
    const openNewTransaction = () => { setEditingTransaction(null); setTransactionOpen(true); };
    const openEditTransaction = (record) => { setEditingTransaction(record); setTransactionOpen(true); };
    const closeTransaction = () => { setTransactionOpen(false); setEditingTransaction(null); };
    const content = active === 'dashboard' ? <Dashboard wallets={walletTotals} records={records} bills={bills} recurringIncomes={recurringIncomes} go={go} /> : active === 'wallet' ? <Wallet wallets={walletTotals} save={(key, amount) => { const activity = walletTotals[key] - openingBalances[key]; setOpeningBalances((current) => ({ ...current, [key]: amount - activity })); toast('Saldo dompet diperbarui'); }} add={openNewTransaction} /> : active === 'transactions' ? <Transactions records={records} remove={deleteRecord} edit={openEditTransaction} add={openNewTransaction} /> : active === 'calendar' ? <Calendar bills={bills} records={records} go={go} /> : active === 'paylater' ? <Paylater bills={bills} toggle={(id) => { setBills((current) => current.map((bill) => bill.id === id ? { ...bill, paid: !bill.paid } : bill)); toast('Status tagihan diperbarui'); }} add={() => setBillOpen(true)} /> : active === 'analysis' ? <Analysis wallets={walletTotals} records={records} bills={bills} /> : <Settings profile={profile} recurringIncomes={recurringIncomes} save={(value) => { setProfile(value); toast('Profil diperbarui'); }} addRecurringIncome={addRecurringIncome} toggleRecurringIncome={toggleRecurringIncome} deleteRecurringIncome={deleteRecurringIncome} reset={reset} />;
    const totalIncome = records.filter((record) => record.amount > 0).reduce((sum, record) => sum + record.amount, 0);
    const totalExpense = records.filter((record) => record.amount < 0).reduce((sum, record) => sum + Math.abs(record.amount), 0);
    const savingsRate = totalIncome ? Math.max(0, Math.min(100, Math.round(((totalIncome - totalExpense) / totalIncome) * 100))) : 0;
    return (
        <div className="min-h-screen bg-[#09090B] text-[#F4F4F5]">
            <aside className="fixed inset-y-0 left-0 z-40 hidden w-[250px] flex-col border-r border-[#27272A] bg-[#09090B] px-4 py-5 lg:flex">
                <div className="mb-10 flex items-center gap-3 px-2">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#22C55E] text-[#052E16]"><WalletCards size={20} /></div>
                    <div><p className="font-extrabold">dompet<span className="text-[#22C55E]">gweh</span></p><p className="text-[9px] font-bold uppercase tracking-[.16em] text-zinc-600">Personal finance</p></div>
                </div>
                <Nav active={active} onChange={go} unpaid={unpaid} />
                <div className="mt-auto rounded-2xl border border-[#22C55E]/20 bg-[#22C55E]/[.05] p-4">
                    <Sparkles size={17} className="mb-3 text-[#22C55E]" />
                    <p className="text-xs font-bold">Tingkat tabungan</p>
                    <p className="mt-1 text-[11px] text-zinc-500">{totalIncome ? `${savingsRate}% dari pemasukan tercatat tersisa` : 'Catat pemasukan untuk melihat persentase.'}</p>
                    <div className="mt-3 h-1.5 rounded-full bg-zinc-800"><div className="h-full rounded-full bg-[#22C55E]" style={{ width: `${savingsRate}%` }} /></div>
                </div>
                <div className="mt-4 flex items-center gap-3 px-2">
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-zinc-700 text-xs font-bold">{profile.name.slice(0, 1).toUpperCase()}</div>
                    <div className="flex-1"><p className="text-xs font-bold">{profile.name}</p><p className="text-[10px] text-zinc-500">Personal account</p></div>
                    <button aria-label="Buka pengaturan" onClick={() => go('settings')} className="text-zinc-500 hover:text-zinc-200"><MoreHorizontal size={16} /></button>
                </div>
            </aside>
            <div className="lg:pl-[250px]">
                <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-[#27272A] bg-[#09090B]/90 px-5 backdrop-blur-xl sm:px-8 lg:px-10">
                    <div className="flex items-center gap-3">
                        <button aria-label="Buka menu" onClick={() => setMenu(true)} className="p-2 text-zinc-400 lg:hidden"><Menu size={21} /></button>
                        <div><p className="text-sm font-bold">{currentPageLabel}</p><p className="hidden text-[11px] text-zinc-500 sm:block">Transaksi tersimpan di database</p></div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="hidden rounded-lg border border-[#27272A] bg-zinc-900 px-3 py-2 text-[11px] capitalize text-zinc-400 md:block">{currentMonthLabel}</span>
                        <button aria-label={`Buka kalender, ${unpaid} tagihan belum lunas`} onClick={() => go('calendar')} className="relative p-2 text-zinc-400 hover:text-zinc-200"><Bell size={18} />{unpaid > 0 && <span className="absolute right-0 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-[#F43F5E] px-1 text-[9px] font-bold text-white">{unpaid}</span>}</button>
                        <button onClick={openNewTransaction} className="flex items-center gap-2 rounded-lg bg-[#22C55E] px-3 py-2.5 text-xs font-extrabold text-[#052E16]"><Plus size={16} /><span className="hidden sm:inline">Tambah transaksi</span></button>
                    </div>
                </header>
                <main className="mx-auto max-w-[1550px] px-5 py-7 sm:px-8 lg:px-10">
                    {notice && <div role="status" className="mb-5 flex items-center gap-2 rounded-xl border border-[#22C55E]/25 bg-[#22C55E]/10 px-4 py-3 text-xs font-bold text-[#22C55E]"><Check size={15} />{notice}</div>}
                    {loadError && <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#F43F5E]/25 bg-[#F43F5E]/10 px-4 py-3 text-xs text-[#FDA4AF]"><span>{loadError}</span><button onClick={loadTransactions} className="font-bold underline">Coba lagi</button></div>}
                    {loading && <p role="status" className="mb-5 text-xs text-zinc-500">Memuat transaksi...</p>}
                    {content}
                </main>
            </div>
            {menu && <div className="fixed inset-0 z-50 lg:hidden"><button aria-label="Tutup menu" onClick={() => setMenu(false)} className="absolute inset-0 bg-black/70" /><aside className="relative h-full w-[270px] bg-[#09090B] p-4"><div className="mb-8 flex justify-between"><b>dompet<span className="text-[#22C55E]">gweh</span></b><button aria-label="Tutup menu" onClick={() => setMenu(false)}><X /></button></div><Nav active={active} onChange={go} unpaid={unpaid} /></aside></div>}
            {transactionOpen && <TransactionModal transaction={editingTransaction} onClose={closeTransaction} onSave={saveTransaction} />}
            {billOpen && <BillModal onClose={() => setBillOpen(false)} onSave={saveBill} />}
        </div>
    );
}
