<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('palette', 32)->default('emerald');
            $table->decimal('opening_balance_bank', 15, 2)->default(0);
            $table->decimal('opening_balance_cash', 15, 2)->default(0);
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
            $table->dropUnique(['recurring_key', 'recurring_month']);
            $table->unique(['user_id', 'recurring_key', 'recurring_month']);
        });

        Schema::create('recurring_income_schedules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('description');
            $table->decimal('amount', 15, 2);
            $table->unsignedTinyInteger('day_of_month');
            $table->string('category');
            $table->string('wallet', 16)->default('bank');
            $table->boolean('enabled')->default(true);
            $table->string('last_processed_month', 7)->nullable();
            $table->timestamps();
            $table->index(['enabled', 'day_of_month']);
        });

        Schema::create('paylater_bills', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('brand');
            $table->decimal('amount', 15, 2);
            $table->date('due_date');
            $table->boolean('paid')->default(false);
            $table->timestamps();
            $table->index(['user_id', 'due_date']);
        });

        Schema::create('user_invitations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->string('token_hash', 64)->unique();
            $table->timestamp('expires_at');
            $table->timestamp('accepted_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_invitations');
        Schema::dropIfExists('paylater_bills');
        Schema::dropIfExists('recurring_income_schedules');

        Schema::table('transactions', function (Blueprint $table) {
            $table->dropUnique(['user_id', 'recurring_key', 'recurring_month']);
            $table->dropConstrainedForeignId('user_id');
            $table->unique(['recurring_key', 'recurring_month']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['palette', 'opening_balance_bank', 'opening_balance_cash']);
        });
    }
};
