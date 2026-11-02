<?php

namespace Tests\Feature;

use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_users_are_redirected_from_login_and_registration_forms(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/login')
            ->assertRedirect(route('dashboard'));

        $this->get('/register')->assertRedirect(route('dashboard'));
    }

    public function test_auth_forms_include_password_visibility_controls(): void
    {
        $this->get('/login')
            ->assertOk()
            ->assertSee('data-password-toggle', false)
            ->assertSee('id="login-password"', false);

        $this->get('/register')
            ->assertOk()
            ->assertSee('id="register-password"', false)
            ->assertSee('id="register-password-confirmation"', false);
    }

    public function test_first_account_can_register_and_subsequent_accounts_require_a_one_time_invitation(): void
    {
        $legacyTransaction = Transaction::create([
            'description' => 'Legacy transaction',
            'amount' => 1000,
            'type' => 'income',
            'category' => 'Income',
            'transaction_date' => '2026-11-01',
            'wallet' => 'bank',
            'status' => 'success',
        ]);

        $this->post('/register', [
            'name' => 'Owner',
            'email' => 'owner@example.test',
            'password' => 'a-strong-password',
            'password_confirmation' => 'a-strong-password',
        ])->assertRedirect(route('dashboard'));

        $owner = User::where('email', 'owner@example.test')->firstOrFail();
        $this->assertAuthenticatedAs($owner);
        $this->assertTrue($owner->isAdmin());
        $this->assertDatabaseHas('transactions', [
            'id' => $legacyTransaction->id,
            'user_id' => $owner->id,
        ]);

        $invitation = $this->postJson('/api/invitations')->assertCreated()->json('url');
        parse_str(parse_url($invitation, PHP_URL_QUERY) ?? '', $query);
        $token = $query['invite'];

        $this->post('/logout')->assertRedirect(route('login'));
        $this->get('/register')->assertNotFound();

        $this->post('/register', [
            'name' => 'Partner',
            'email' => 'partner@example.test',
            'password' => 'another-strong-password',
            'password_confirmation' => 'another-strong-password',
            'invite' => $token,
        ])->assertRedirect(route('dashboard'));

        $this->assertAuthenticatedAs(User::where('email', 'partner@example.test')->firstOrFail());
        $this->assertDatabaseMissing('user_invitations', ['created_by' => $owner->id, 'accepted_at' => null]);

        $this->post('/logout');
        $this->from('/register')->post('/register', [
            'name' => 'Third user',
            'email' => 'third@example.test',
            'password' => 'third-strong-password',
            'password_confirmation' => 'third-strong-password',
            'invite' => $token,
        ])->assertRedirect('/register')->assertSessionHasErrors('invite');
    }
}
