<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    public function index()
    {
        return Transaction::query()
            ->orderByDesc('transaction_date')
            ->orderByDesc('id')
            ->get();
    }

    public function create()
    {
        return view('transactions.create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'description' => 'required|string|max:255',
            'amount' => 'required|numeric|min:1',
            'type' => 'required|in:income,expense',
            'category' => 'required|string|max:255',
            'transaction_date' => 'required|date',
            'wallet' => 'sometimes|in:bank,cash',
            'recurring_month' => 'sometimes|nullable|date_format:Y-m',
            'recurring_key' => 'sometimes|required_with:recurring_month|string|max:80',
        ]);

        if (!empty($validated['recurring_month']) && $validated['type'] !== 'income') {
            return response()->json(['message' => 'Transaksi berulang harus berupa pemasukan.'], 422);
        }

        if (!empty($validated['recurring_month'])) {
            $recurringKey = $validated['recurring_key'] ?? 'default';
            $existing = Transaction::where('recurring_month', $validated['recurring_month'])
                ->where('recurring_key', $recurringKey)
                ->first();
            if ($existing) {
                return response()->json($existing);
            }
            $validated['recurring_key'] = $recurringKey;
        }

        $validated['wallet'] ??= 'bank';
        $transaction = Transaction::create($validated + ['status' => 'success']);

        if ($request->expectsJson()) {
            return response()->json($transaction, 201);
        }

        return redirect()->route('dashboard')->with('success', 'Transaksi berhasil ditambahkan!');
    }

    // MENAMPILKAN FORM 
    public function edit($id)
    {
        $transaction = Transaction::findOrFail($id);
        return view('transactions.edit', compact('transaction'));
    }

    // UPDATE
    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'description' => 'required|string|max:255',
            'amount' => 'required|numeric|min:1',
            'type' => 'required|in:income,expense',
            'category' => 'required|string|max:255',
            'transaction_date' => 'required|date',
            'wallet' => 'sometimes|in:bank,cash',
        ]);

        $transaction = Transaction::findOrFail($id);
        $transaction->update($validated);

        if ($request->expectsJson()) {
            return response()->json($transaction);
        }

        return redirect()->route('dashboard')->with('success', 'Transaksi berhasil diperbarui!');
    }

    // MENGHAPUS DATA
    public function destroy(Request $request, $id)
    {
        $transaction = Transaction::findOrFail($id);
        $transaction->delete();

        if ($request->expectsJson()) {
            return response()->noContent();
        }

        return redirect()->route('dashboard')->with('success', 'Transaksi berhasil dihapus!');
    }
}