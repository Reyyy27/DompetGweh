<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    public function create()
    {
        return view('transactions.create');
    }

    public function store(Request $request)
    {
        $request->validate([
            'description' => 'required|string|max:255',
            'amount' => 'required|numeric|min:1000',
            'type' => 'required|in:income,expense',
            'category' => 'required|string',
            'transaction_date' => 'required|date',
        ]);

        // Simpan ke database
        Transaction::create([
            'description' => $request->description,
            'amount' => $request->amount,
            'type' => $request->type,
            'category' => $request->category,
            'transaction_date' => $request->transaction_date,
            'status' => 'success' // Default sukses biar gampang
        ]);

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
        $request->validate([
            'description' => 'required|string|max:255',
            'amount' => 'required|numeric',
            'type' => 'required|in:income,expense',
            'category' => 'required|string',
            'transaction_date' => 'required|date',
        ]);

        $transaction = Transaction::findOrFail($id);
        $transaction->update($request->all());

        return redirect()->route('dashboard')->with('success', 'Transaksi berhasil diperbarui!');
    }

    // MENGHAPUS DATA
    public function destroy($id)
    {
        $transaction = Transaction::findOrFail($id);
        $transaction->delete();

        return redirect()->route('dashboard')->with('success', 'Transaksi berhasil dihapus!');
    }
}