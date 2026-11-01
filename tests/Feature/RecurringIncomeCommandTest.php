<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Tests\TestCase;

class RecurringIncomeCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_due_schedules_are_processed_once_per_account_and_month(): void
    {
        Carbon::setTestNow('2026-11-25 00:05:00');
        try {
            $user = User::factory()->create();
            $user->recurringIncomeSchedules()->create([
                'id' => (string) Str::uuid(),
                'description' => 'Salary day 1',
                'amount' => 5000,
                'day_of_month' => 1,
                'category' => 'Salary',
                'wallet' => 'bank',
                'enabled' => true,
            ]);
            $user->recurringIncomeSchedules()->create([
                'id' => (string) Str::uuid(),
                'description' => 'Salary day 25',
                'amount' => 7000,
                'day_of_month' => 25,
                'category' => 'Salary',
                'wallet' => 'cash',
                'enabled' => true,
            ]);

            $this->artisan('income:process-recurring')->assertSuccessful();
            $this->artisan('income:process-recurring')->assertSuccessful();

            $this->assertDatabaseCount('transactions', 2);
            $this->assertDatabaseHas('transactions', [
                'user_id' => $user->id,
                'description' => 'Salary day 1',
                'transaction_date' => '2026-11-01',
            ]);
            $this->assertDatabaseHas('transactions', [
                'user_id' => $user->id,
                'description' => 'Salary day 25',
                'transaction_date' => '2026-11-25',
            ]);
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_schedule_for_day_31_runs_on_the_last_day_of_short_months(): void
    {
        Carbon::setTestNow('2028-02-29 00:05:00');
        try {
            $user = User::factory()->create();
            $user->recurringIncomeSchedules()->create([
                'id' => (string) Str::uuid(),
                'description' => 'Month end income',
                'amount' => 1000,
                'day_of_month' => 31,
                'category' => 'Income',
                'wallet' => 'bank',
                'enabled' => true,
            ]);

            $this->artisan('income:process-recurring')->assertSuccessful();

            $this->assertDatabaseHas('transactions', [
                'user_id' => $user->id,
                'description' => 'Month end income',
                'transaction_date' => '2028-02-29',
            ]);
        } finally {
            Carbon::setTestNow();
        }
    }
}
