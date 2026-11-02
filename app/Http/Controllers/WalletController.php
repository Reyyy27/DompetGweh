<?php

namespace App\Http\Controllers;

use App\Models\Wallet;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class WalletController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $this->ensureDefaultWallets($user);

        $wallets = $user->wallets()->get()->map(function (Wallet $wallet) use ($user) {
            $incomes = (float) $user->transactions()
                ->where('wallet', $wallet->slug)
                ->where('type', 'income')
                ->sum('amount');

            $expenses = (float) $user->transactions()
                ->where('wallet', $wallet->slug)
                ->where('type', 'expense')
                ->sum('amount');

            $transfersOut = (float) $user->transfers()
                ->where(function ($query) use ($wallet) {
                    $query->where('from_wallet_id', $wallet->id)
                        ->orWhere(function ($legacy) use ($wallet) {
                            $legacy->whereNull('from_wallet_id')->where('from_wallet', $wallet->slug);
                        });
                })
                ->sum('amount');

            $transfersIn = (float) $user->transfers()
                ->where(function ($query) use ($wallet) {
                    $query->where('to_wallet_id', $wallet->id)
                        ->orWhere(function ($legacy) use ($wallet) {
                            $legacy->whereNull('to_wallet_id')->where('to_wallet', $wallet->slug);
                        });
                })
                ->sum('amount');

            $currentBalance = (float) $wallet->initial_balance + $incomes - $expenses - $transfersOut + $transfersIn;

            return array_merge($wallet->toArray(), [
                'current_balance' => $currentBalance,
            ]);
        });

        return response()->json($wallets);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'type' => ['required', 'in:bank,ewallet,cash,other'],
            'initial_balance' => ['nullable', 'numeric', 'min:0', 'max:9999999999999.99'],
            'color' => ['nullable', 'string', 'max:30'],
        ]);

        $user = $request->user();
        $baseSlug = Str::slug($validated['name']) ?: 'wallet';
        $slug = $baseSlug;
        $counter = 1;

        while ($user->wallets()->where('slug', $slug)->exists() || in_array($slug, ['bank', 'cash'], true)) {
            $slug = "{$baseSlug}-{$counter}";
            $counter++;
        }

        $wallet = $user->wallets()->create([
            'name' => $validated['name'],
            'type' => $validated['type'],
            'slug' => $slug,
            'initial_balance' => $validated['initial_balance'] ?? 0,
            'color' => $validated['color'] ?? null,
        ]);

        return response()->json(array_merge($wallet->toArray(), [
            'current_balance' => (float) $wallet->initial_balance,
        ]), 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $wallet = $request->user()->wallets()->findOrFail($id);

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:80'],
            'type' => ['sometimes', 'required', 'in:bank,ewallet,cash,other'],
            'initial_balance' => ['sometimes', 'required', 'numeric', 'min:0', 'max:9999999999999.99'],
            'color' => ['nullable', 'string', 'max:30'],
        ]);

        $wallet->update($validated);

        if ($wallet->slug === 'bank' && isset($validated['initial_balance'])) {
            $request->user()->update(['opening_balance_bank' => $validated['initial_balance']]);
        } elseif ($wallet->slug === 'cash' && isset($validated['initial_balance'])) {
            $request->user()->update(['opening_balance_cash' => $validated['initial_balance']]);
        }

        return response()->json($wallet);
    }

    public function destroy(Request $request, int $id): \Illuminate\Http\Response|\Illuminate\Http\JsonResponse
    {
        $wallet = $request->user()->wallets()->findOrFail($id);

        if ($request->user()->wallets()->count() <= 1) {
            return response()->json(['message' => 'Tidak bisa menghapus satu-satunya dompet.'], 422);
        }

        $hasTransactions = $request->user()->transactions()->where('wallet', $wallet->slug)->exists();
        $hasTransfers = $request->user()->transfers()
            ->where(function ($query) use ($wallet) {
                $query->where('from_wallet_id', $wallet->id)
                    ->orWhere('to_wallet_id', $wallet->id)
                    ->orWhere(function ($legacy) use ($wallet) {
                        $legacy->whereNull('from_wallet_id')->where('from_wallet', $wallet->slug);
                    })
                    ->orWhere(function ($legacy) use ($wallet) {
                        $legacy->whereNull('to_wallet_id')->where('to_wallet', $wallet->slug);
                    });
            })
            ->exists();

        if ($hasTransactions || $hasTransfers) {
            return response()->json(['message' => 'Dompet yang memiliki riwayat transaksi atau transfer tidak dapat dihapus.'], 422);
        }

        $wallet->delete();

        return response()->noContent();
    }

    private function ensureDefaultWallets($user): void
    {
        if ($user->wallets()->exists()) {
            return;
        }

        $user->wallets()->createMany([
            [
                'name' => 'Rekening Utama',
                'type' => 'bank',
                'slug' => 'bank',
                'initial_balance' => (float) $user->opening_balance_bank,
                'color' => '#2563EB',
            ],
            [
                'name' => 'Uang Tunai',
                'type' => 'cash',
                'slug' => 'cash',
                'initial_balance' => (float) $user->opening_balance_cash,
                'color' => '#0EA5E9',
            ],
        ]);
    }
}
