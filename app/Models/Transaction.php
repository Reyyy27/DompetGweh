<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    use HasFactory;

    // --- BAGIAN PENTING ---
    // Kita mendaftarkan kolom yang boleh diisi (Mass Assignment)
    protected $fillable = [
        'description',
        'amount',
        'type',
        'category',
        'transaction_date',
        'status'
    ];
}