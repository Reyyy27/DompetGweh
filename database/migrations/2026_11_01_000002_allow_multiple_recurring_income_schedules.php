<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropUnique(['recurring_month']);
            $table->string('recurring_key', 80)->default('default');
            $table->unique(['recurring_key', 'recurring_month']);
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropUnique(['recurring_key', 'recurring_month']);
            $table->dropColumn('recurring_key');
            $table->unique('recurring_month');
        });
    }
};
