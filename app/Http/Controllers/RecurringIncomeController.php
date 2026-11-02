<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class RecurringIncomeController extends Controller
{
    public function index(Request $request)
    {
        return $request->user()->recurringIncomeSchedules()
            ->orderBy('day_of_month')
            ->orderBy('created_at')
            ->get();
    }

    public function store(Request $request)
    {
        $validWallets = array_unique(array_merge(
            ['bank', 'cash'],
            $request->user()->wallets()->pluck('slug')->all()
        ));

        $validated = $request->validate([
            'description' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'gt:0', 'max:9999999999999.99'],
            'day' => ['required', 'integer', 'between:1,31'],
            'category' => ['required', 'string', 'max:255'],
            'wallet' => ['required', 'string', Rule::in($validWallets)],
        ]);

        $schedule = $request->user()->recurringIncomeSchedules()->create([
            'id' => (string) Str::uuid(),
            'description' => $validated['description'],
            'amount' => $validated['amount'],
            'day_of_month' => $validated['day'],
            'category' => $validated['category'],
            'wallet' => $validated['wallet'],
            'enabled' => true,
        ]);

        return response()->json($schedule, 201);
    }

    public function update(Request $request, string $schedule)
    {
        $validated = $request->validate([
            'enabled' => ['required', 'boolean'],
        ]);

        $ownedSchedule = $request->user()->recurringIncomeSchedules()->findOrFail($schedule);
        $ownedSchedule->update(['enabled' => $validated['enabled']]);

        return response()->json($ownedSchedule);
    }

    public function destroy(Request $request, string $schedule)
    {
        $request->user()->recurringIncomeSchedules()->findOrFail($schedule)->delete();

        return response()->noContent();
    }
}
