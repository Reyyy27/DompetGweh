<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\TransactionController; 
use Illuminate\Support\Facades\Route;

Route::get('/', [DashboardController::class, 'index'])->name('dashboard');
Route::resource('transactions', TransactionController::class)->except(['index', 'show']);