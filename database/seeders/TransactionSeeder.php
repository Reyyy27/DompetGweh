<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class TransactionSeeder extends Seeder
{
    public function run(): void
    {
        // Buat data untuk 6 bulan terakhir
        for ($i = 0; $i < 50; $i++) {
            $type = rand(0, 1) ? 'income' : 'expense';
            $category = $type == 'income' 
                ? 'Gaji' 
                : ['Makanan', 'Transport', 'Tagihan', 'Hiburan'][rand(0, 3)];

            DB::table('transactions')->insert([
                'description' => $type == 'income' ? 'Pemasukan Tambahan' : 'Belanja ' . $category,
                'amount' => rand(50000, 2000000),
                'type' => $type,
                'category' => $category,
                'transaction_date' => Carbon::now()->subDays(rand(0, 180)),
                'status' => rand(0, 10) > 1 ? 'success' : 'pending', // 90% sukses
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}