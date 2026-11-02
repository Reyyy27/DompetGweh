<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TransactionController extends Controller
{
    public function index()
    {
        return request()->user()->transactions()
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
        $validWallets = array_unique(array_merge(
            ['bank', 'cash'],
            $request->user()?->wallets()->pluck('slug')->all() ?? []
        ));

        $validated = $request->validate([
            'description' => 'required|string|max:255',
            'amount' => 'required|numeric|min:1',
            'type' => 'required|in:income,expense',
            'category' => 'required|string|max:255',
            'transaction_date' => 'required|date',
            'wallet' => ['sometimes', 'string', Rule::in($validWallets)],
            'recurring_month' => 'sometimes|nullable|date_format:Y-m',
            'recurring_key' => 'sometimes|required_with:recurring_month|string|max:80',
        ]);

        if (! empty($validated['recurring_month']) && $validated['type'] !== 'income') {
            return response()->json(['message' => 'Transaksi berulang harus berupa pemasukan.'], 422);
        }

        if (! empty($validated['recurring_month'])) {
            $recurringKey = $validated['recurring_key'] ?? 'default';
            $existing = $request->user()->transactions()
                ->where('recurring_month', $validated['recurring_month'])
                ->where('recurring_key', $recurringKey)
                ->first();
            if ($existing) {
                return response()->json($existing);
            }
            $validated['recurring_key'] = $recurringKey;
        }

        $validated['wallet'] ??= 'bank';
        $transaction = $request->user()->transactions()->create($validated + ['status' => 'success']);

        if ($request->expectsJson()) {
            return response()->json($transaction, 201);
        }

        return redirect()->route('dashboard')->with('success', 'Transaksi berhasil ditambahkan!');
    }

    // MENAMPILKAN FORM
    public function edit(Request $request, $id)
    {
        $transaction = $request->user()->transactions()->findOrFail($id);

        return view('transactions.edit', compact('transaction'));
    }

    // UPDATE
    public function update(Request $request, $id)
    {
        $validWallets = array_unique(array_merge(
            ['bank', 'cash'],
            $request->user()?->wallets()->pluck('slug')->all() ?? []
        ));

        $validated = $request->validate([
            'description' => 'required|string|max:255',
            'amount' => 'required|numeric|min:1',
            'type' => 'required|in:income,expense',
            'category' => 'required|string|max:255',
            'transaction_date' => 'required|date',
            'wallet' => ['sometimes', 'string', Rule::in($validWallets)],
        ]);

        $transaction = $request->user()->transactions()->findOrFail($id);
        $transaction->update($validated);

        if ($request->expectsJson()) {
            return response()->json($transaction);
        }

        return redirect()->route('dashboard')->with('success', 'Transaksi berhasil diperbarui!');
    }

    // MENGHAPUS DATA
    public function destroy(Request $request, $id)
    {
        $transaction = $request->user()->transactions()->findOrFail($id);
        $transaction->delete();

        if ($request->expectsJson()) {
            return response()->noContent();
        }

        return redirect()->route('dashboard')->with('success', 'Transaksi berhasil dihapus!');
    }
}
