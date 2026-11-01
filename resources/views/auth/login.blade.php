@extends('layouts.auth')

@section('title', 'Masuk')

@section('content')
    <p class="eyebrow">Akun pribadi</p>
    <h1 class="mt-2 text-2xl font-extrabold">Masuk ke DompetGweh</h1>
    <p class="mt-2 text-sm text-zinc-500">Keuanganmu tersimpan aman di akunmu.</p>

    <form method="POST" action="{{ route('login.store') }}" class="mt-7 space-y-4">
        @csrf
        <label class="block text-xs font-bold text-zinc-400">EMAIL
            <input type="email" name="email" value="{{ old('email') }}" autocomplete="email" required autofocus class="mt-2 w-full rounded-xl border border-[#27272A] bg-[#09090B] px-4 py-3 text-sm text-[#F4F4F5] outline-none focus:border-[#22C55E]">
        </label>
        <label class="block text-xs font-bold text-zinc-400">KATA SANDI
            <input type="password" name="password" autocomplete="current-password" required class="mt-2 w-full rounded-xl border border-[#27272A] bg-[#09090B] px-4 py-3 text-sm text-[#F4F4F5] outline-none focus:border-[#22C55E]">
        </label>
        @if ($errors->any())
            <p role="alert" class="rounded-lg bg-[#F43F5E]/10 p-3 text-sm text-[#FDA4AF]">{{ $errors->first() }}</p>
        @endif
        <label class="flex items-center gap-2 text-xs text-zinc-400">
            <input type="checkbox" name="remember" value="1" class="accent-[#22C55E]"> Ingat saya di perangkat ini
        </label>
        <button class="w-full rounded-xl bg-[#22C55E] py-3.5 text-sm font-extrabold text-[#052E16]">Masuk</button>
    </form>

    @if (! \App\Models\User::query()->exists())
        <p class="mt-6 text-center text-sm text-zinc-500">Belum ada akun? <a href="{{ route('register') }}" class="font-bold text-[#22C55E]">Buat akun pertama</a></p>
    @endif
@endsection
