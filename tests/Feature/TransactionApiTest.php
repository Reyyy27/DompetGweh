<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransactionApiTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
        $this->actingAs($this->user);
    }

    public function test_transactions_can_be_created_listed_and_deleted_from_the_dashboard_api(): void
    {
        $created = $this->postJson('/api/transactions', [
            'description' => 'Belanja bulanan',
            'amount' => 125000,
            'type' => 'expense',
            'category' => 'Makanan',
            'transaction_date' => '2026-11-01',
            'wallet' => 'cash',
        ]);

        $created
            ->assertCreated()
            ->assertJsonPath('description', 'Belanja bulanan')
            ->assertJsonPath('wallet', 'cash');

        $transactionId = $created->json('id');

        $this->putJson("/api/transactions/{$transactionId}", [
            'description' => 'Belanja dapur',
            'amount' => 130000,
            'type' => 'expense',
            'category' => 'Kebutuhan',
            'transaction_date' => '2026-11-02',
            'wallet' => 'bank',
        ])->assertOk()
            ->assertJsonPath('description', 'Belanja dapur')
            ->assertJsonPath('wallet', 'bank');

        $this->getJson('/api/transactions')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $transactionId)
            ->assertJsonPath('0.description', 'Belanja dapur');

        $this->deleteJson("/api/transactions/{$transactionId}")
            ->assertNoContent();

        $this->assertDatabaseMissing('transactions', ['id' => $transactionId]);
    }

    public function test_api_validates_transaction_fields(): void
    {
        $this->postJson('/api/transactions', [
            'description' => '',
            'amount' => 0,
            'type' => 'transfer',
            'category' => '',
            'transaction_date' => 'not-a-date',
            'wallet' => 'crypto',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['description', 'amount', 'type', 'category', 'transaction_date', 'wallet']);
    }

    public function test_legacy_transaction_form_defaults_to_bank_wallet(): void
    {
        $this->post('/transactions', [
            'description' => 'Gaji',
            'amount' => 5000000,
            'type' => 'income',
            'category' => 'Gaji',
            'transaction_date' => '2026-11-01',
        ])->assertRedirect(route('dashboard'));

        $this->assertDatabaseHas('transactions', [
            'description' => 'Gaji',
            'wallet' => 'bank',
        ]);
    }

    public function test_transactions_are_returned_newest_first(): void
    {
        $this->user->transactions()->create([
            'description' => 'Transaksi lama',
            'amount' => 10000,
            'type' => 'income',
            'category' => 'Lainnya',
            'transaction_date' => '2026-10-01',
            'wallet' => 'bank',
        ]);
        $this->user->transactions()->create([
            'description' => 'Transaksi baru',
            'amount' => 20000,
            'type' => 'income',
            'category' => 'Lainnya',
            'transaction_date' => '2026-11-01',
            'wallet' => 'bank',
        ]);

        $this->getJson('/api/transactions')
            ->assertOk()
            ->assertJsonPath('0.description', 'Transaksi baru')
            ->assertJsonPath('1.description', 'Transaksi lama');
    }

    public function test_monthly_recurring_income_is_idempotent_for_each_month(): void
    {
        $payload = [
            'description' => 'Gaji bulanan',
            'amount' => 8500000,
            'type' => 'income',
            'category' => 'Gaji',
            'transaction_date' => '2026-11-01',
            'wallet' => 'bank',
            'recurring_month' => '2026-11',
            'recurring_key' => 'salary-1',
        ];

        $first = $this->postJson('/api/transactions', $payload)->assertCreated();
        $second = $this->postJson('/api/transactions', $payload)->assertOk();

        $this->assertSame($first->json('id'), $second->json('id'));
        $this->assertDatabaseCount('transactions', 1);
    }

    public function test_two_recurring_income_schedules_can_be_recorded_in_the_same_month(): void
    {
        $base = [
            'amount' => 1000000,
            'type' => 'income',
            'category' => 'Gaji',
            'wallet' => 'bank',
            'recurring_month' => '2026-11',
        ];

        $this->postJson('/api/transactions', $base + [
            'description' => 'Gaji tanggal 1',
            'transaction_date' => '2026-11-01',
            'recurring_key' => 'salary-1',
        ])->assertCreated();

        $this->postJson('/api/transactions', $base + [
            'description' => 'Gaji tanggal 25',
            'transaction_date' => '2026-11-25',
            'recurring_key' => 'salary-25',
        ])->assertCreated();

        $this->assertDatabaseCount('transactions', 2);
    }
}
