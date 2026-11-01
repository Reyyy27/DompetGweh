<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\TransactionController; 
use Illuminate\Support\Facades\Route;

Route::get('/', [DashboardController::class, 'index'])->name('dashboard');
Route::resource('transactions', TransactionController::class)->except(['index', 'show']);

Route::get('/api/transactions', [TransactionController::class, 'index'])->name('api.transactions.index');
Route::post('/api/transactions', [TransactionController::class, 'store'])->name('api.transactions.store');
Route::put('/api/transactions/{transaction}', [TransactionController::class, 'update'])->name('api.transactions.update');
Route::delete('/api/transactions/{transaction}', [TransactionController::class, 'destroy'])->name('api.transactions.destroy');