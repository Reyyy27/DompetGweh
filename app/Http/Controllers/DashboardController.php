<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index()
    {
        // Hitung Ringkasan Kartu Atas
        $currentMonth = Carbon::now()->month;
        $currentYear = Carbon::now()->year;

        $totalBalance = Transaction::where('type', 'income')->sum('amount') - 
                        Transaction::where('type', 'expense')->sum('amount');
        
        $incomeThisMonth = Transaction::where('type', 'income')
                            ->whereMonth('transaction_date', $currentMonth)
                            ->whereYear('transaction_date', $currentYear)
                            ->sum('amount');

        $expenseThisMonth = Transaction::where('type', 'expense')
                            ->whereMonth('transaction_date', $currentMonth)
                            ->whereYear('transaction_date', $currentYear)
                            ->sum('amount');

        // Data Tabel Transaksi (5 Terakhir)
        $recentTransactions = Transaction::latest('transaction_date')->take(5)->get();

        // Data Grafik Doughnut (Pengeluaran per Kategori)
        $expenseByCategory = Transaction::select('category', DB::raw('sum(amount) as total'))
                            ->where('type', 'expense')
                            ->groupBy('category')
                            ->get();

        // Data Grafik Line (Arus Kas 6 Bulan Terakhir)
        $monthlyStats = Transaction::select(
                DB::raw('DATE_FORMAT(transaction_date, "%Y-%m") as month'),
                DB::raw('SUM(CASE WHEN type = "income" THEN amount ELSE 0 END) as income'),
                DB::raw('SUM(CASE WHEN type = "expense" THEN amount ELSE 0 END) as expense')
            )
            ->where('transaction_date', '>=', Carbon::now()->subMonths(6))
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        return view('dashboard', compact(
            'totalBalance', 
            'incomeThisMonth', 
            'expenseThisMonth', 
            'recentTransactions',
            'expenseByCategory',
            'monthlyStats'
        ));
    }
}