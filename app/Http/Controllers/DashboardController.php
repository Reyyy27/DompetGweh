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
        $transactions = request()->user()->transactions();
        // Hitung Ringkasan Kartu Atas
        $currentMonth = Carbon::now()->month;
        $currentYear = Carbon::now()->year;

        $totalBalance = (clone $transactions)->where('type', 'income')->sum('amount') -
                        (clone $transactions)->where('type', 'expense')->sum('amount');

        $incomeThisMonth = (clone $transactions)->where('type', 'income')
                            ->whereMonth('transaction_date', $currentMonth)
                            ->whereYear('transaction_date', $currentYear)
                            ->sum('amount');

        $expenseThisMonth = (clone $transactions)->where('type', 'expense')
                            ->whereMonth('transaction_date', $currentMonth)
                            ->whereYear('transaction_date', $currentYear)
                            ->sum('amount');

        // Data Tabel Transaksi (5 Terakhir)
        $recentTransactions = (clone $transactions)->latest('transaction_date')->take(5)->get();

        // Data Grafik Doughnut (Pengeluaran per Kategori)
        $expenseByCategory = (clone $transactions)->select('category', DB::raw('sum(amount) as total'))
                            ->where('type', 'expense')
                            ->groupBy('category')
                            ->get();

        // Data Grafik Line (Arus Kas 6 Bulan Terakhir)
        $monthExpression = DB::connection()->getDriverName() === 'sqlite'
            ? "strftime('%Y-%m', transaction_date)"
            : "DATE_FORMAT(transaction_date, '%Y-%m')";

        $monthlyStats = (clone $transactions)->select(
                DB::raw("{$monthExpression} as month"),
                DB::raw("SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income"),
                DB::raw("SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense")
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
