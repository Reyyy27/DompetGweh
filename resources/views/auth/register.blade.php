@extends('layouts.auth')

@section('title', 'Buat akun')

@section('content')
    <p class="eyebrow">Dompet pribadi</p>
    <h1 class="mt-2 text-2xl font-extrabold text-[#0F172A]">Buat akun</h1>
    <p class="mt-2 text-sm text-slate-500">Data keuanganmu akan terpisah dari akun lainnya.</p>

    <form method="POST" action="{{ route('register.store') }}" class="mt-7 space-y-4">
        @csrf
        <input type="hidden" name="invite" value="{{ $invite }}">
        <label class="block text-xs font-bold text-slate-600">NAMA
            <input type="text" name="name" value="{{ old('name') }}" maxlength="80" autocomplete="name" required autofocus class="mt-2 w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#0F172A] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10">
        </label>
        <label class="block text-xs font-bold text-slate-600">EMAIL
            <input type="email" name="email" value="{{ old('email') }}" autocomplete="email" required class="mt-2 w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#0F172A] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10">
        </label>
        <label class="block text-xs font-bold text-slate-600">KATA SANDI
            <input type="password" name="password" autocomplete="new-password" minlength="12" required class="mt-2 w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#0F172A] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10">
            <span class="mt-1 block font-normal text-slate-400">Minimal 12 karakter.</span>
        </label>
        <label class="block text-xs font-bold text-slate-600">ULANGI KATA SANDI
            <input type="password" name="password_confirmation" autocomplete="new-password" minlength="12" required class="mt-2 w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#0F172A] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10">
        </label>
        @if ($errors->any())
            <div role="alert" class="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100">
                @foreach ($errors->all() as $error)
                    <p>{{ $error }}</p>
                @endforeach
            </div>
        @endif
        <button class="w-full rounded-xl bg-[#2563EB] py-3.5 text-sm font-extrabold text-white transition hover:bg-blue-700 shadow-sm shadow-blue-500/25">Buat akun</button>
    </form>

    <p class="mt-6 text-center text-sm text-slate-500">Sudah punya akun? <a href="{{ route('login') }}" class="font-bold text-[#2563EB] hover:underline">Masuk</a></p>
@endsection
