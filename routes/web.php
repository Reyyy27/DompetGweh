<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\AccountController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BudgetController;
use App\Http\Controllers\DatabaseBackupController;
use App\Http\Controllers\MemberController;
use App\Http\Controllers\PaylaterController;
use App\Http\Controllers\RecurringIncomeController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\TransferController;
use App\Http\Controllers\WalletController;
use Illuminate\Support\Facades\Route;

Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'loginForm'])->name('login');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:6,1')->name('login.store');
    Route::get('/register', [AuthController::class, 'registerForm'])->name('register');
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:6,1')->name('register.store');
});

Route::middleware('auth')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
    Route::get('/', [DashboardController::class, 'index'])->name('dashboard');
    Route::resource('transactions', TransactionController::class)->except(['index', 'show']);

    Route::prefix('api')->group(function () {
        Route::get('/account', [AccountController::class, 'show'])->name('api.account.show');
        Route::put('/account', [AccountController::class, 'update'])->name('api.account.update');
        Route::middleware('admin')->group(function () {
            Route::post('/invitations', [AuthController::class, 'createInvitation'])->middleware('throttle:5,1')->name('api.invitations.store');
            Route::get('/admin/members', [MemberController::class, 'index'])->name('api.admin.members.index');
            Route::put('/admin/members/{member}', [MemberController::class, 'update'])->middleware('throttle:10,1')->name('api.admin.members.update');
            Route::get('/admin/database/backups', [DatabaseBackupController::class, 'index'])->name('api.admin.database.backups.index');
            Route::post('/admin/database/backups', [DatabaseBackupController::class, 'create'])->middleware('throttle:5,1')->name('api.admin.database.backups.create');
            Route::get('/admin/database/backups/{filename}', [DatabaseBackupController::class, 'download'])->where('filename', '[a-zA-Z0-9._-]+')->name('api.admin.database.backups.download');
            Route::post('/admin/database/restore', [DatabaseBackupController::class, 'restore'])->middleware('throttle:2,1')->name('api.admin.database.restore');
        });

        Route::get('/transactions', [TransactionController::class, 'index'])->name('api.transactions.index');
        Route::post('/transactions', [TransactionController::class, 'store'])->name('api.transactions.store');
        Route::put('/transactions/{transaction}', [TransactionController::class, 'update'])->name('api.transactions.update');
        Route::delete('/transactions/{transaction}', [TransactionController::class, 'destroy'])->name('api.transactions.destroy');

        Route::get('/recurring-incomes', [RecurringIncomeController::class, 'index'])->name('api.recurring-incomes.index');
        Route::post('/recurring-incomes', [RecurringIncomeController::class, 'store'])->name('api.recurring-incomes.store');
        Route::patch('/recurring-incomes/{schedule}', [RecurringIncomeController::class, 'update'])->name('api.recurring-incomes.update');
        Route::delete('/recurring-incomes/{schedule}', [RecurringIncomeController::class, 'destroy'])->name('api.recurring-incomes.destroy');

        Route::get('/paylater', [PaylaterController::class, 'index'])->name('api.paylater.index');
        Route::post('/paylater', [PaylaterController::class, 'store'])->name('api.paylater.store');
        Route::patch('/paylater/{bill}', [PaylaterController::class, 'update'])->name('api.paylater.update');
        Route::delete('/paylater/{bill}', [PaylaterController::class, 'destroy'])->name('api.paylater.destroy');

        Route::get('/wallets', [WalletController::class, 'index'])->name('api.wallets.index');
        Route::post('/wallets', [WalletController::class, 'store'])->name('api.wallets.store');
        Route::put('/wallets/{wallet}', [WalletController::class, 'update'])->name('api.wallets.update');
        Route::delete('/wallets/{wallet}', [WalletController::class, 'destroy'])->name('api.wallets.destroy');

        Route::get('/transfers', [TransferController::class, 'index'])->name('api.transfers.index');
        Route::post('/transfers', [TransferController::class, 'store'])->name('api.transfers.store');
        Route::delete('/transfers/{transfer}', [TransferController::class, 'destroy'])->name('api.transfers.destroy');

        Route::get('/budgets', [BudgetController::class, 'index'])->name('api.budgets.index');
        Route::post('/budgets', [BudgetController::class, 'store'])->name('api.budgets.store');
        Route::delete('/budgets/{budget}', [BudgetController::class, 'destroy'])->name('api.budgets.destroy');
    });
});