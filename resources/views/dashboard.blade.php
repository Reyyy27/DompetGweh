<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DompetGweh - Laravel Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style> body { font-family: 'Inter', sans-serif; } </style>
</head>
<body class="bg-gray-50 text-gray-800">
@if(session('success'))
    <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative text-center" role="alert">
        <strong class="font-bold">Berhasil!</strong>
        <span class="block sm:inline">{{ session('success') }}</span>
    </div>
@endif
    <div class="flex h-screen overflow-hidden">
        <aside class="hidden w-64 overflow-y-auto border-r bg-white border-gray-200 md:block flex-shrink-0">
            <div class="flex items-center justify-center h-16 border-b border-gray-200 px-6">
                <div class="text-2xl font-bold text-indigo-600 flex items-center gap-2">
                    <i class="fa-solid fa-wallet"></i> DompetGweh
                </div>
            </div>
            
            <div class="p-4 space-y-2">
                <a href="{{ route('dashboard') }}" class="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                    <i class="fa-solid fa-house w-5 text-center"></i> Dashboard
                </a>

                <a href="{{ route('transactions.create') }}" class="flex items-center justify-center gap-2 w-full px-4 py-3 mt-4 mb-4 text-sm font-bold text-white bg-indigo-600 rounded-lg shadow-md hover:bg-indigo-700 hover:shadow-lg transition-all transform hover:-translate-y-0.5">
                    <i class="fa-solid fa-plus"></i> Tambah Baru
                </a>

                <div class="border-b border-gray-100 my-2"></div>

                <a href="#" class="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                    <i class="fa-solid fa-list w-5 text-center"></i> Riwayat Transaksi
                </a>
                <a href="#" class="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                    <i class="fa-solid fa-chart-pie w-5 text-center"></i> Laporan
                </a>
                <a href="#" class="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                    <i class="fa-solid fa-gear w-5 text-center"></i> Pengaturan
                </a>
            </div>
        </aside>

        <div class="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            <header class="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
                <h2 class="text-xl font-semibold text-gray-800">Ringkasan Keuangan </h2>
                <div class="flex items-center gap-2">
                    <div class="text-sm font-medium text-gray-700">Hai!, Reihan</div>
                </div>
            </header>

            <main class="w-full flex-grow p-6">
                
                <div class="grid grid-cols-1 gap-6 mb-8 md:grid-cols-3">
                    <div class="p-6 bg-indigo-600 rounded-2xl shadow-lg text-white">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-sm font-medium opacity-80">Total Saldo</h3>
                            <div class="p-2 bg-indigo-500 rounded-lg bg-opacity-50"><i class="fa-solid fa-wallet"></i></div>
                        </div>
                        <div class="text-3xl font-bold mb-1">Rp {{ number_format($totalBalance, 0, ',', '.') }}</div>
                        <div class="text-xs opacity-70">Total Aset Likuid</div>
                    </div>

                    <div class="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-sm font-medium text-gray-500">Pemasukan Bulan Ini</h3>
                            <div class="p-2 bg-green-50 text-green-600 rounded-lg"><i class="fa-solid fa-arrow-down"></i></div>
                        </div>
                        <div class="text-2xl font-bold text-gray-800">Rp {{ number_format($incomeThisMonth, 0, ',', '.') }}</div>
                    </div>

                    <div class="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-sm font-medium text-gray-500">Pengeluaran Bulan Ini</h3>
                            <div class="p-2 bg-red-50 text-red-600 rounded-lg"><i class="fa-solid fa-arrow-up"></i></div>
                        </div>
                        <div class="text-2xl font-bold text-gray-800">Rp {{ number_format($expenseThisMonth, 0, ',', '.') }}</div>
                    </div>
                </div>

                <div class="grid grid-cols-1 gap-6 mb-8 lg:grid-cols-3">
                    <div class="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm lg:col-span-2">
                        <h3 class="text-lg font-semibold text-gray-800 mb-4">Arus Kas (6 Bulan Terakhir)</h3>
                        <div class="relative h-72 w-full"><canvas id="cashFlowChart"></canvas></div>
                    </div>

                    <div class="space-y-6">
                        <div class="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
                            <h3 class="text-lg font-semibold text-gray-800 mb-4">Pengeluaran per Kategori</h3>
                            <div class="relative h-48 w-full flex justify-center"><canvas id="expenseChart"></canvas></div>
                        </div>
                    </div>
                </div>

                <div class="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                    <div class="flex items-center justify-between p-6 border-b border-gray-100">
                        <h3 class="text-lg font-semibold text-gray-800">Transaksi Terakhir</h3>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left whitespace-nowrap">
                            <thead class="bg-gray-50 text-gray-500 text-xs uppercase font-medium">
                                <tr>
                                    <th class="px-6 py-4">Deskripsi</th>
                                    <th class="px-6 py-4">Kategori</th>
                                    <th class="px-6 py-4">Tanggal</th>
                                    <th class="px-6 py-4">Status</th>
                                    <th class="px-6 py-4 text-right">Jumlah</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100 text-sm text-gray-700">
                                @foreach($recentTransactions as $transaction)
                                <tr class="hover:bg-gray-50 transition-colors">
                                    <td class="px-6 py-4 font-medium text-gray-900">{{ $transaction->description }}</td>
                                    <td class="px-6 py-4">{{ $transaction->category }}</td>
                                    <td class="px-6 py-4 text-gray-500">{{ \Carbon\Carbon::parse($transaction->transaction_date)->format('d M Y') }}</td>
                                    <td class="px-6 py-4">
                                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                                            {{ $transaction->status == 'success' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800' }}">
                                            {{ ucfirst($transaction->status) }}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 text-right font-bold {{ $transaction->type == 'income' ? 'text-green-600' : 'text-red-500' }}">
                                        {{ $transaction->type == 'income' ? '+' : '-' }} Rp {{ number_format($transaction->amount, 0, ',', '.') }}
                                    </td>
                                    <td class="px-6 py-4 text-right">
                                        <div class="flex items-center justify-end gap-2">
                                            <a href="{{ route('transactions.edit', $transaction->id) }}" class="text-blue-500 hover:text-blue-700">
                                                <i class="fa-solid fa-pen-to-square"></i>
                                            </a>

                                            <form action="{{ route('transactions.destroy', $transaction->id) }}" method="POST" onsubmit="return confirm('Yakin ingin menghapus?')">
                                                @csrf
                                                @method('DELETE')
                                                <button type="submit" class="text-red-500 hover:text-red-700">
                                                    <i class="fa-solid fa-trash"></i>
                                                </button>
                                            </form>
                                        </div>
                                    </td>

                                </tr>
                                @endforeach
                            </tbody>
                        </table>
                    </div>
                </div>

            </main>
        </div>
    </div>

    <script>
        // Data dari Controller
        const monthlyStats = @json($monthlyStats);
        const expenseCategory = @json($expenseByCategory);

        // Proses Data untuk Line Chart
        const labelsLine = monthlyStats.map(item => item.month);
        const dataIncome = monthlyStats.map(item => item.income);
        const dataExpense = monthlyStats.map(item => item.expense);

        // Grafik Arus Kas
        new Chart(document.getElementById('cashFlowChart'), {
            type: 'line',
            data: {
                labels: labelsLine,
                datasets: [
                    { label: 'Pemasukan', data: dataIncome, borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', tension: 0.4, fill: true },
                    { label: 'Pengeluaran', data: dataExpense, borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.05)', tension: 0.4, fill: true }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true }, x: { grid: { display: false } } } }
        });

        //  Doughnut Chart
        const labelsDoughnut = expenseCategory.map(item => item.category);
        const dataDoughnut = expenseCategory.map(item => item.total);

        // Grafik Kategori
        new Chart(document.getElementById('expenseChart'), {
            type: 'doughnut',
            data: {
                labels: labelsDoughnut,
                datasets: [{
                    data: dataDoughnut,
                    backgroundColor: ['#6366f1', '#f59e0b', '#10b981', '#ec4899', '#94a3b8'],
                    borderWidth: 0
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 12 } } } }
        });
    </script>
</body>
</html>