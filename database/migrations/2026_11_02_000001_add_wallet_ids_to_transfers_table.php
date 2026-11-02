<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transfers', function (Blueprint $table) {
            $table->foreignId('from_wallet_id')->nullable()->after('from_wallet')->constrained('wallets')->nullOnDelete();
            $table->foreignId('to_wallet_id')->nullable()->after('to_wallet')->constrained('wallets')->nullOnDelete();
        });

        DB::table('transfers')->orderBy('id')->chunkById(100, function ($transfers): void {
            foreach ($transfers as $transfer) {
                $wallets = DB::table('wallets')
                    ->where('user_id', $transfer->user_id)
                    ->whereIn('slug', [$transfer->from_wallet, $transfer->to_wallet])
                    ->pluck('id', 'slug');

                if ($wallets->has($transfer->from_wallet) && $wallets->has($transfer->to_wallet)) {
                    DB::table('transfers')->where('id', $transfer->id)->update([
                        'from_wallet_id' => $wallets[$transfer->from_wallet],
                        'to_wallet_id' => $wallets[$transfer->to_wallet],
                    ]);
                }
            }
        });
    }

    public function down(): void
    {
        Schema::table('transfers', function (Blueprint $table) {
            $table->dropConstrainedForeignId('from_wallet_id');
            $table->dropConstrainedForeignId('to_wallet_id');
        });
    }
};