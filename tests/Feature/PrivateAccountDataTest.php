<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PrivateAccountDataTest extends TestCase
{
    use RefreshDatabase;

    public function test_account_preferences_recurring_incomes_and_paylater_can_be_managed(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $this->putJson('/api/account', [
            'name' => 'Updated name',
            'palette' => 'ocean',
            'opening_balances' => ['bank' => 10000, 'cash' => 2000],
        ])->assertOk()
            ->assertJsonPath('name', 'Updated name')
            ->assertJsonPath('palette', 'ocean')
            ->assertJsonPath('opening_balances.bank', 10000);

        $schedule = $this->postJson('/api/recurring-incomes', [
            'description' => 'Salary',
            'amount' => 5000000,
            'day' => 25,
            'category' => 'Income',
            'wallet' => 'bank',
        ])->assertCreated()
            ->assertJsonPath('day_of_month', 25);
        $scheduleId = $schedule->json('id');
        $this->patchJson("/api/recurring-incomes/{$scheduleId}", ['enabled' => false])
            ->assertOk()
            ->assertJsonPath('enabled', false);
        $this->deleteJson("/api/recurring-incomes/{$scheduleId}")->assertNoContent();

        $bill = $this->postJson('/api/paylater', [
            'brand' => 'Example Paylater',
            'amount' => 25000,
            'due_date' => '2026-11-25',
        ])->assertCreated()
            ->assertJsonPath('brand', 'Example Paylater');
        $billId = $bill->json('id');
        $this->patchJson("/api/paylater/{$billId}", ['paid' => true])
            ->assertOk()
            ->assertJsonPath('paid', true);
        $this->deleteJson("/api/paylater/{$billId}")->assertNoContent();

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'Updated name',
            'palette' => 'ocean',
            'opening_balance_bank' => 10000,
        ]);
        $this->assertDatabaseMissing('recurring_income_schedules', ['id' => $scheduleId]);
        $this->assertDatabaseMissing('paylater_bills', ['id' => $billId]);
    }

    public function test_financial_data_is_only_visible_to_its_owner(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();

        $transaction = $owner->transactions()->create([
            'description' => 'Private income',
            'amount' => 1000,
            'type' => 'income',
            'category' => 'Salary',
            'transaction_date' => '2026-11-01',
            'wallet' => 'bank',
            'status' => 'success',
        ]);
        $schedule = $owner->recurringIncomeSchedules()->create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'description' => 'Private schedule',
            'amount' => 1000,
            'day_of_month' => 1,
            'category' => 'Salary',
            'wallet' => 'bank',
            'enabled' => true,
        ]);
        $bill = $owner->paylaterBills()->create([
            'brand' => 'Private bill',
            'amount' => 500,
            'due_date' => '2026-11-20',
        ]);

        $this->actingAs($otherUser)
            ->getJson('/api/transactions')
            ->assertOk()
            ->assertExactJson([]);

        $this->getJson("/api/transactions/{$transaction->id}")->assertMethodNotAllowed();
        $this->putJson("/api/transactions/{$transaction->id}", [
            'description' => 'Changed',
            'amount' => 1000,
            'type' => 'income',
            'category' => 'Salary',
            'transaction_date' => '2026-11-01',
        ])->assertNotFound();
        $this->deleteJson("/api/transactions/{$transaction->id}")->assertNotFound();
        $this->getJson('/api/recurring-incomes')->assertOk()->assertExactJson([]);
        $this->getJson('/api/paylater')->assertOk()->assertExactJson([]);
        $this->patchJson("/api/recurring-incomes/{$schedule->id}", ['enabled' => false])->assertNotFound();
        $this->patchJson("/api/paylater/{$bill->id}", ['paid' => true])->assertNotFound();

        $this->assertDatabaseHas('transactions', ['id' => $transaction->id, 'description' => 'Private income']);
        $this->assertDatabaseHas('recurring_income_schedules', ['id' => $schedule->id, 'enabled' => true]);
        $this->assertDatabaseHas('paylater_bills', ['id' => $bill->id, 'paid' => false]);
    }

    public function test_recurring_idempotency_is_scoped_to_the_current_account(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $owner->transactions()->create([
            'description' => 'Owner income',
            'amount' => 1000,
            'type' => 'income',
            'category' => 'Salary',
            'transaction_date' => '2026-11-01',
            'wallet' => 'bank',
            'recurring_month' => '2026-11',
            'recurring_key' => 'salary',
            'status' => 'success',
        ]);

        $response = $this->actingAs($otherUser)->postJson('/api/transactions', [
            'description' => 'Other user income',
            'amount' => 2000,
            'type' => 'income',
            'category' => 'Salary',
            'transaction_date' => '2026-11-01',
            'wallet' => 'bank',
            'recurring_month' => '2026-11',
            'recurring_key' => 'salary',
        ])->assertCreated();

        $this->assertNotSame($owner->transactions()->first()->id, $response->json('id'));
        $this->assertDatabaseCount('transactions', 2);
    }
}
