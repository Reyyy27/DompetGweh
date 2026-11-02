@extends('layouts.auth')

@section('title', 'Masuk')

@section('content')
    <p class="eyebrow">Akun pribadi</p>
    <h1 class="mt-2 text-2xl font-extrabold text-[#0F172A]">Masuk ke DompetGweh</h1>
    <p class="mt-2 text-sm text-slate-500">Keuanganmu tersimpan aman di akunmu.</p>

    <form method="POST" action="{{ route('login.store') }}" class="mt-7 space-y-4">
        @csrf
        <label class="block text-xs font-bold text-slate-600">EMAIL
            <input type="email" name="email" value="{{ old('email') }}" autocomplete="email" required autofocus class="mt-2 w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#0F172A] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10">
        </label>
        <label class="block text-xs font-bold text-slate-600">KATA SANDI
            <span class="relative mt-2 block">
                <input id="login-password" type="password" name="password" autocomplete="current-password" required class="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 pr-24 text-sm text-[#0F172A] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10">
                <button type="button" data-password-toggle aria-controls="login-password" aria-pressed="false" aria-label="Tampilkan kata sandi" class="absolute inset-y-0 right-3 text-xs font-bold text-[#2563EB]">Tampilkan</button>
            </span>
        </label>
        @if ($errors->any())
            <p role="alert" class="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100">{{ $errors->first() }}</p>
        @endif
        <label class="flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" name="remember" value="1" class="accent-[#2563EB]"> Ingat saya di perangkat ini
        </label>
        <button class="w-full rounded-xl bg-[#2563EB] py-3.5 text-sm font-extrabold text-white transition hover:bg-blue-700 shadow-sm shadow-blue-500/25">Masuk</button>
    </form>

    @if (! \App\Models\User::query()->exists())
        <p class="mt-6 text-center text-sm text-slate-500">Belum ada akun? <a href="{{ route('register') }}" class="font-bold text-[#2563EB] hover:underline">Buat akun pertama</a></p>
    @endif
@endsection
