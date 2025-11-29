<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->string('description'); // Contoh: Gaji, Beli Makan
            $table->decimal('amount', 15, 2); // Jumlah uang
            $table->enum('type', ['income', 'expense']); // Pemasukan atau Pengeluaran
            $table->string('category'); // Contoh: Makanan, Transport, Gaji
            $table->date('transaction_date');
            $table->enum('status', ['success', 'pending'])->default('success');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};