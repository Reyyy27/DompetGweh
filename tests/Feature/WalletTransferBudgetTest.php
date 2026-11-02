<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WalletTransferBudgetTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create([
            'opening_balance_bank' => 500000,
            'opening_balance_cash' => 100000,
        ]);
        $this->actingAs($this->user);
    }

    public function test_wallets_are_auto_seeded_and_can_be_customized(): void
    {
        $response = $this->getJson('/api/wallets')->assertOk();
        $response->assertJsonCount(2);

        $created = $this->postJson('/api/wallets', [
            'name' => 'Bank BCA',
            'type' => 'bank',
            'initial_balance' => 2500000,
            'color' => '#2563EB',
        ])->assertCreated()
            ->assertJsonPath('name', 'Bank BCA')
            ->assertJsonPath('type', 'bank')
            ->assertJsonPath('current_balance', 2500000);

        $walletId = $created->json('id');

        $this->putJson("/api/wallets/{$walletId}", [
            'name' => 'BCA Utama',
            'type' => 'bank',
            'initial_balance' => 3000000,
        ])->assertOk()
            ->assertJsonPath('name', 'BCA Utama');

        $this->deleteJson("/api/wallets/{$walletId}")->assertNoContent();
        $this->assertDatabaseMissing('wallets', ['id' => $walletId]);
    }

    public function test_transfers_can_be_created_and_listed(): void
    {
        $this->getJson('/api/wallets'); // Ensure default wallets exist

        $transfer = $this->postJson('/api/transfers', [
            'from_wallet' => 'bank',
            'to_wallet' => 'cash',
            'amount' => 50000,
            'transfer_date' => '2026-11-02',
            'notes' => 'Tarik tunai ATM',
        ])->assertCreated()
            ->assertJsonPath('amount', '50000.00')
            ->assertJsonPath('from_wallet', 'bank')
            ->assertJsonPath('to_wallet', 'cash');

        $transferId = $transfer->json('id');

        $this->getJson('/api/transfers')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $transferId)
            ->assertJsonPath('0.from_wallet_id', 1)
            ->assertJsonPath('0.to_wallet_id', 2);

        $balances = $this->getJson('/api/wallets')->assertOk();
        $balances->assertJsonPath('0.current_balance', 450000)
            ->assertJsonPath('1.current_balance', 150000);

        $this->deleteJson("/api/transfers/{$transferId}")->assertNoContent();
        $this->assertDatabaseMissing('transfers', ['id' => $transferId]);

        $restored = $this->getJson('/api/wallets')->assertOk();
        $restored->assertJsonPath('0.current_balance', 500000)
            ->assertJsonPath('1.current_balance', 100000);
    }

    public function test_budgets_can_be_set_and_calculated_with_expenses(): void
    {
        $this->user->transactions()->create([
            'description' => 'Makan Siang',
            'amount' => 45000,
            'type' => 'expense',
            'category' => 'Makanan',
            'transaction_date' => '2026-11-02',
            'wallet' => 'cash',
            'status' => 'success',
        ]);

        $this->postJson('/api/budgets', [
            'category' => 'Makanan',
            'amount' => 100000,
            'month' => '2026-11',
        ])->assertCreated()
            ->assertJsonPath('category', 'Makanan')
            ->assertJsonPath('amount', '100000.00');

        $list = $this->getJson('/api/budgets?month=2026-11')->assertOk();
        $list->assertJsonCount(1)
            ->assertJsonPath('0.category', 'Makanan')
            ->assertJsonPath('0.spent', 45000)
            ->assertJsonPath('0.remaining', 55000)
            ->assertJsonPath('0.percentage', 45);

        $budgetId = $list->json('0.id');
        $this->deleteJson("/api/budgets/{$budgetId}")->assertNoContent();
        $this->assertDatabaseMissing('budgets', ['id' => $budgetId]);
    }

    public function test_recurring_income_can_target_a_custom_wallet(): void
    {
        $wallet = $this->postJson('/api/wallets', [
            'name' => 'GoPay',
            'type' => 'ewallet',
            'initial_balance' => 0,
        ])->assertCreated();

        $this->postJson('/api/recurring-incomes', [
            'description' => 'Cashback bulanan',
            'amount' => 50000,
            'day' => 15,
            'category' => 'Bonus',
            'wallet' => $wallet->json('slug'),
        ])->assertCreated()
            ->assertJsonPath('wallet', $wallet->json('slug'));
    }

    public function test_custom_wallets_can_receive_transactions_and_cannot_be_deleted_with_history(): void
    {
        $this->getJson('/api/wallets')->assertOk();

        $wallet = $this->postJson('/api/wallets', [
            'name' => 'Jago',
            'type' => 'bank',
            'initial_balance' => 100000,
        ])->assertCreated();

        $this->postJson('/api/transactions', [
            'description' => 'Kopi',
            'amount' => 25000,
            'type' => 'expense',
            'category' => 'Makanan',
            'transaction_date' => '2026-11-02',
            'wallet' => $wallet->json('slug'),
        ])->assertCreated()
            ->assertJsonPath('wallet', $wallet->json('slug'));

        $this->getJson('/api/wallets')
            ->assertOk()
            ->assertJsonFragment(['slug' => $wallet->json('slug'), 'current_balance' => 75000]);

        $this->deleteJson('/api/wallets/'.$wallet->json('id'))
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Dompet yang memiliki riwayat transaksi atau transfer tidak dapat dihapus.');
    }
}
