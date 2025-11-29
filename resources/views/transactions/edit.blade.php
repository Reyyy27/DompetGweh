<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Edit Transaksi - DompetKu</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 font-sans">
    <div class="max-w-xl mx-auto mt-10 p-6 bg-white rounded-xl shadow-md">
        <h2 class="text-2xl font-bold text-gray-800 mb-6">Edit Transaksi</h2>

        <form action="{{ route('transactions.update', $transaction->id) }}" method="POST">
            @csrf
            @method('PUT')
            
            <div class="mb-4">
                <label class="block text-gray-700 text-sm font-bold mb-2">Deskripsi</label>
                <input type="text" name="description" value="{{ $transaction->description }}" class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required>
            </div>

            <div class="mb-4">
                <label class="block text-gray-700 text-sm font-bold mb-2">Nominal (Rp)</label>
                <input type="number" name="amount" value="{{ $transaction->amount }}" class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required>
            </div>

            <div class="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <label class="block text-gray-700 text-sm font-bold mb-2">Tipe</label>
                    <select name="type" class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="expense" {{ $transaction->type == 'expense' ? 'selected' : '' }}>Pengeluaran</option>
                        <option value="income" {{ $transaction->type == 'income' ? 'selected' : '' }}>Pemasukan</option>
                    </select>
                </div>
                <div>
                    <label class="block text-gray-700 text-sm font-bold mb-2">Kategori</label>
                    <select name="category" class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="Makanan" {{ $transaction->category == 'Makanan' ? 'selected' : '' }}>Makanan</option>
                        <option value="Transport" {{ $transaction->category == 'Transport' ? 'selected' : '' }}>Transport</option>
                        <option value="Gaji" {{ $transaction->category == 'Gaji' ? 'selected' : '' }}>Gaji</option>
                        <option value="Tagihan" {{ $transaction->category == 'Tagihan' ? 'selected' : '' }}>Tagihan</option>
                        <option value="Hiburan" {{ $transaction->category == 'Hiburan' ? 'selected' : '' }}>Hiburan</option>
                        <option value="Lainnya" {{ $transaction->category == 'Lainnya' ? 'selected' : '' }}>Lainnya</option>
                    </select>
                </div>
            </div>

            <div class="mb-6">
                <label class="block text-gray-700 text-sm font-bold mb-2">Tanggal</label>
                <input type="date" name="transaction_date" value="{{ $transaction->transaction_date }}" class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required>
            </div>

            <div class="flex justify-end gap-2">
                <a href="{{ route('dashboard') }}" class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition">Batal</a>
                <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">Simpan Perubahan</button>
            </div>
        </form>
    </div>
</body>
</html>