<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Illuminate\View\View;

class AuthController extends Controller
{
    public function loginForm(): View|RedirectResponse
    {
        return Auth::check() ? redirect()->route('dashboard') : view('auth.login');
    }

    public function login(Request $request): RedirectResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (! Auth::attempt($credentials, $request->boolean('remember'))) {
            throw ValidationException::withMessages([
                'email' => 'Email atau kata sandi tidak cocok.',
            ]);
        }

        $request->session()->regenerate();

        return redirect()->intended(route('dashboard'));
    }

    public function registerForm(Request $request): View|RedirectResponse
    {
        if (Auth::check()) {
            return redirect()->route('dashboard');
        }

        $invite = $request->query('invite');
        $hasValidInvite = is_string($invite) && $this->invitationQuery($invite)->exists();
        abort_if(User::query()->exists() && ! $hasValidInvite, 404);

        return view('auth.register', ['invite' => $invite]);
    }

    public function register(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:12', 'confirmed'],
            'invite' => ['nullable', 'string', 'max:128'],
        ]);

        $user = DB::transaction(function () use ($validated) {
            $hasAccounts = User::query()->lockForUpdate()->exists();
            $invitation = null;

            if ($hasAccounts) {
                if (empty($validated['invite'])) {
                    throw ValidationException::withMessages([
                        'invite' => 'Pendaftaran hanya dapat dilakukan melalui tautan undangan.',
                    ]);
                }

                $invitation = $this->invitationQuery($validated['invite'])->lockForUpdate()->first();
                if (! $invitation) {
                    throw ValidationException::withMessages([
                        'invite' => 'Tautan undangan tidak valid atau sudah kedaluwarsa.',
                    ]);
                }
            }

            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => $validated['password'],
            ]);

            if ($invitation) {
                DB::table('user_invitations')
                    ->where('id', $invitation->id)
                    ->update(['accepted_at' => now(), 'updated_at' => now()]);
            } else {
                $user->forceFill(['role' => 'admin'])->save();
                Transaction::query()->whereNull('user_id')->update(['user_id' => $user->id]);
            }

            return $user;
        });

        Auth::login($user);
        $request->session()->regenerate();

        return redirect()->route('dashboard');
    }

    public function logout(Request $request): RedirectResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }

    public function createInvitation(Request $request)
    {
        $token = Str::random(48);

        $request->user()->invitations()->create([
            'token_hash' => hash('sha256', $token),
            'expires_at' => now()->addDays(7),
        ]);

        return response()->json([
            'url' => route('register', ['invite' => $token]),
            'expires_at' => now()->addDays(7)->toIso8601String(),
        ], 201);
    }

    private function invitationQuery(string $token)
    {
        return DB::table('user_invitations')
            ->where('token_hash', hash('sha256', $token))
            ->whereNull('accepted_at')
            ->where('expires_at', '>', now());
    }
}
