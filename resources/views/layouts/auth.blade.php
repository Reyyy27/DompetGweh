<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#2563EB">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>@yield('title') — DompetGweh</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    @vite(['resources/css/app.css'])
</head>
<body class="bg-[#F8FAFC]">
    <main class="grid min-h-screen place-items-center px-5 py-10">
        <section class="panel w-full max-w-md rounded-[24px] p-7 sm:p-9 shadow-sm">
            <a href="{{ route('login') }}" class="mb-8 inline-flex items-center gap-3">
                <span class="grid h-10 w-10 place-items-center rounded-xl bg-[#2563EB] text-lg font-black text-white shadow-sm shadow-blue-500/30">D</span>
                <span class="text-lg font-extrabold text-[#0F172A]">dompet<span class="text-[#2563EB]">gweh</span></span>
            </a>
            @yield('content')
        </section>
    </main>
</body>
</html>
