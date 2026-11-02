<?php

namespace App\Http\Controllers;

use App\Models\Budget;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BudgetController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $month = $request->query('month', date('Y-m'));

        $budgets = $user->budgets()->where('month', $month)->get()->map(function (Budget $budget) use ($user, $month) {
            $spent = (float) $user->transactions()
                ->where('type', 'expense')
                ->where('category', $budget->category)
                ->where('transaction_date', 'like', "{$month}%")
                ->sum('amount');

            $limit = (float) $budget->amount;
            $remaining = max(0, $limit - $spent);
            $percentage = $limit > 0 ? (int) round(($spent / $limit) * 100) : 0;

            return array_merge($budget->toArray(), [
                'spent' => $spent,
                'remaining' => $remaining,
                'percentage' => $percentage,
                'is_over' => $spent > $limit,
            ]);
        });

        return response()->json($budgets);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category' => ['required', 'string', 'max:80'],
            'amount' => ['required', 'numeric', 'min:1', 'max:9999999999999.99'],
            'month' => ['nullable', 'date_format:Y-m'],
        ]);

        $month = $validated['month'] ?? date('Y-m');

        $budget = $request->user()->budgets()->updateOrCreate(
            [
                'category' => $validated['category'],
                'month' => $month,
            ],
            [
                'amount' => $validated['amount'],
            ]
        );

        return response()->json($budget, 201);
    }

    public function destroy(Request $request, int $id): \Illuminate\Http\Response|\Illuminate\Http\JsonResponse
    {
        $budget = $request->user()->budgets()->findOrFail($id);
        $budget->delete();

        return response()->noContent();
    }
}
