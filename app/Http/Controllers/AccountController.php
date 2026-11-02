<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class AccountController extends Controller
{
    public function show(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'is_admin' => $user->isAdmin(),
            'palette' => $user->palette,
            'opening_balances' => [
                'bank' => (float) $user->opening_balance_bank,
                'cash' => (float) $user->opening_balance_cash,
            ],
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:80'],
            'palette' => ['sometimes', 'required', 'in:emerald,ocean,sand,lavender'],
            'opening_balances.bank' => ['sometimes', 'required', 'numeric', 'min:0', 'max:9999999999999.99'],
            'opening_balances.cash' => ['sometimes', 'required', 'numeric', 'min:0', 'max:9999999999999.99'],
        ]);

        $user = $request->user();
        if (array_key_exists('name', $validated)) {
            $user->name = $validated['name'];
        }
        if (array_key_exists('palette', $validated)) {
            $user->palette = $validated['palette'];
        }
        if (isset($validated['opening_balances']['bank'])) {
            $user->opening_balance_bank = $validated['opening_balances']['bank'];
        }
        if (isset($validated['opening_balances']['cash'])) {
            $user->opening_balance_cash = $validated['opening_balances']['cash'];
        }
        $user->save();

        return $this->show($request);
    }
}
