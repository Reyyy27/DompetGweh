<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class PaylaterController extends Controller
{
    public function index(Request $request)
    {
        return $request->user()->paylaterBills()->orderBy('due_date')->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'brand' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'gt:0', 'max:9999999999999.99'],
            'due_date' => ['required', 'date'],
        ]);

        $bill = $request->user()->paylaterBills()->create($validated);

        return response()->json($bill, 201);
    }

    public function update(Request $request, int $bill)
    {
        $validated = $request->validate([
            'paid' => ['required', 'boolean'],
        ]);

        $ownedBill = $request->user()->paylaterBills()->findOrFail($bill);
        $ownedBill->update($validated);

        return response()->json($ownedBill);
    }

    public function destroy(Request $request, int $bill)
    {
        $request->user()->paylaterBills()->findOrFail($bill)->delete();

        return response()->noContent();
    }
}
