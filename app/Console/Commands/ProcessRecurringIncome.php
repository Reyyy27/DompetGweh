<?php

namespace App\Console\Commands;

use App\Models\RecurringIncomeSchedule;
use App\Models\Transaction;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ProcessRecurringIncome extends Command
{
    protected $signature = 'income:process-recurring';

    protected $description = 'Create due recurring income transactions for all accounts';

    public function handle(): int
    {
        $today = CarbonImmutable::today();
        $month = $today->format('Y-m');
        $created = 0;

        RecurringIncomeSchedule::query()
            ->where('enabled', true)
            ->where(function ($query) use ($month) {
                $query->whereNull('last_processed_month')
                    ->orWhere('last_processed_month', '!=', $month);
            })
            ->where(function ($query) use ($today) {
                $query->where('day_of_month', '<=', $today->day);
                if ($today->isLastOfMonth()) {
                    $query->orWhere('day_of_month', '>', $today->day);
                }
            })
            ->orderBy('user_id')
            ->orderBy('id')
            ->chunkById(100, function ($schedules) use ($today, $month, &$created) {
                foreach ($schedules as $schedule) {
                    DB::transaction(function () use ($schedule, $today, $month, &$created) {
                        $locked = RecurringIncomeSchedule::query()
                            ->whereKey($schedule->id)
                            ->lockForUpdate()
                            ->first();

                        if (! $locked || ! $locked->enabled || $locked->last_processed_month === $month) {
                            return;
                        }

                        $day = min($locked->day_of_month, $today->daysInMonth);
                        $recurringKey = $locked->id;
                        $transaction = Transaction::firstOrCreate(
                            [
                                'user_id' => $locked->user_id,
                                'recurring_key' => $recurringKey,
                                'recurring_month' => $month,
                            ],
                            [
                                'description' => $locked->description,
                                'amount' => $locked->amount,
                                'type' => 'income',
                                'category' => $locked->category,
                                'transaction_date' => $today->startOfMonth()->day($day)->toDateString(),
                                'wallet' => $locked->wallet,
                                'status' => 'success',
                            ],
                        );

                        $locked->update(['last_processed_month' => $month]);
                        if ($transaction->wasRecentlyCreated) {
                            $created++;
                        }
                    });
                }
            }, 'id');

        $this->info("Processed {$created} recurring income transaction(s) for {$month}.");

        return self::SUCCESS;
    }
}
