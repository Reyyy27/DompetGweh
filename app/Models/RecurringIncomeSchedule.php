<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RecurringIncomeSchedule extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'user_id',
        'description',
        'amount',
        'day_of_month',
        'category',
        'wallet',
        'enabled',
        'last_processed_month',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'enabled' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
