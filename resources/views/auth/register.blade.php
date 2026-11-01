@extends('layouts.auth')

@section('title', 'Buat akun')

@section('content')
    <p class="eyebrow">Dompet pribadi</p>
    <h1 class="mt-2 text-2xl font-extrabold">Buat akun</h1>
    <p class="mt-2 text-sm text-zinc-500">Data keuanganmu akan terpisah dari akun lainnya.</p>

    <form method="POST" action="{{ route('register.store') }}" class="mt-7 space-y-4">
        @csrf
        <input type="hidden" name="invite" value="{{ $invite }}">
        <label class="block text-xs font-bold text-zinc-400">NAMA
            <input type="text" name="name" value="{{ old('name') }}" maxlength="80" autocomplete="name" required autofocus class="mt-2 w-full rounded-xl border border-[#27272A] bg-[#09090B] px-4 py-3 text-sm text-[#F4F4F5] outline-none focus:border-[#22C55E]">
        </label>
        <label class="block text-xs font-bold text-zinc-400">EMAIL
            <input type="email" name="email" value="{{ old('email') }}" autocomplete="email" required class="mt-2 w-full rounded-xl border border-[#27272A] bg-[#09090B] px-4 py-3 text-sm text-[#F4F4F5] outline-none focus:border-[#22C55E]">
        </label>
        <label class="block text-xs font-bold text-zinc-400">KATA SANDI
            <input type="password" name="password" autocomplete="new-password" minlength="12" required class="mt-2 w-full rounded-xl border border-[#27272A] bg-[#09090B] px-4 py-3 text-sm text-[#F4F4F5] outline-none focus:border-[#22C55E]">
            <span class="mt-1 block font-normal text-zinc-600">Minimal 12 karakter.</span>
        </label>
        <label class="block text-xs font-bold text-zinc-400">ULANGI KATA SANDI
            <input type="password" name="password_confirmation" autocomplete="new-password" minlength="12" required class="mt-2 w-full rounded-xl border border-[#27272A] bg-[#09090B] px-4 py-3 text-sm text-[#F4F4F5] outline-none focus:border-[#22C55E]">
        </label>
        @if ($errors->any())
            <div role="alert" class="rounded-lg bg-[#F43F5E]/10 p-3 text-sm text-[#FDA4AF]">
                @foreach ($errors->all() as $error)
                    <p>{{ $error }}</p>
                @endforeach
            </div>
        @endif
        <button class="w-full rounded-xl bg-[#22C55E] py-3.5 text-sm font-extrabold text-[#052E16]">Buat akun</button>
    </form>

    <p class="mt-6 text-center text-sm text-zinc-500">Sudah punya akun? <a href="{{ route('login') }}" class="font-bold text-[#22C55E]">Masuk</a></p>
@endsection
