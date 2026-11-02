<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wallets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('type')->default('bank'); // bank, ewallet, cash, other
            $table->string('slug');
            $table->decimal('initial_balance', 15, 2)->default(0);
            $table->string('color')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'slug']);
        });

        Schema::create('transfers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('from_wallet');
            $table->string('to_wallet');
            $table->decimal('amount', 15, 2);
            $table->date('transfer_date');
            $table->string('notes')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'transfer_date']);
        });

        Schema::create('budgets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('category');
            $table->decimal('amount', 15, 2);
            $table->string('month', 7); // YYYY-MM
            $table->timestamps();

            $table->unique(['user_id', 'category', 'month']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('budgets');
        Schema::dropIfExists('transfers');
        Schema::dropIfExists('wallets');
    }
};
