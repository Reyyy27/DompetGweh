<?php

namespace App\Http\Controllers;

use App\Models\Transfer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TransferController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $transfers = $request->user()->transfers()
            ->orderByDesc('transfer_date')
            ->orderByDesc('id')
            ->get();

        return response()->json($transfers);
    }

    public function store(Request $request): JsonResponse
    {
        $validWallets = array_unique(array_merge(
            $request->user()->wallets()->pluck('slug')->all()
        ));

        $validated = $request->validate([
            'from_wallet' => ['required', 'string', Rule::in($validWallets)],
            'to_wallet' => ['required', 'string', 'different:from_wallet', Rule::in($validWallets)],
            'amount' => ['required', 'numeric', 'min:1', 'max:9999999999999.99'],
            'transfer_date' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        $wallets = $request->user()->wallets()
            ->whereIn('slug', [$validated['from_wallet'], $validated['to_wallet']])
            ->get()
            ->keyBy('slug');

        $transfer = $request->user()->transfers()->create($validated + [
            'from_wallet_id' => $wallets[$validated['from_wallet']]->id,
            'to_wallet_id' => $wallets[$validated['to_wallet']]->id,
        ]);

        return response()->json($transfer, 201);
    }

    public function destroy(Request $request, int $id): \Illuminate\Http\Response|\Illuminate\Http\JsonResponse
    {
        $transfer = $request->user()->transfers()->findOrFail($id);
        $transfer->delete();

        return response()->noContent();
    }
}
