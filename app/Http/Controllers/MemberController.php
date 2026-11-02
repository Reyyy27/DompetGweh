<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;

class MemberController extends Controller
{
    public function index()
    {
        return User::query()
            ->where('role', 'member')
            ->orderBy('name')
            ->get(['id', 'name', 'email']);
    }

    public function update(Request $request, User $member)
    {
        abort_unless($member->role === 'member', 404);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email,'.$member->id],
            'password' => ['nullable', 'string', 'min:12', 'confirmed'],
        ]);

        $member->name = $validated['name'];
        $member->email = $validated['email'];
        if (! empty($validated['password'])) {
            $member->password = $validated['password'];
        }
        $member->save();

        return response()->json([
            'id' => $member->id,
            'name' => $member->name,
            'email' => $member->email,
        ]);
    }
}