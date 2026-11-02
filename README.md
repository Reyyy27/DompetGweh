# DompetGweh

DompetGweh adalah aplikasi pengelola keuangan pribadi untuk mencatat pemasukan dan pengeluaran, memantau saldo di berbagai rekening, mengatur anggaran, serta mengelola tagihan Paylater dalam satu dashboard.

## Tujuan

Keuangan pribadi sering tersebar di rekening bank, uang tunai, dan e-wallet. Catatan transfer yang keliru dianggap pemasukan atau pengeluaran dapat membuat arus kas tampak lebih besar dari kondisi sebenarnya. Sementara itu, pengeluaran tanpa batas kategori dan tagihan yang luput dari perhatian menyulitkan pengguna merencanakan uang bulanan.

DompetGweh membantu pengguna mendapatkan gambaran saldo dan aktivitas keuangan yang lebih teratur tanpa mencampur data antar akun.

## Masalah yang Diselesaikan

| Masalah | Solusi di DompetGweh |
| --- | --- |
| Saldo tersebar di banyak rekening, tunai, dan e-wallet. | Buat dan kelola banyak dompet dengan nama, jenis, dan saldo awal masing-masing. |
| Top-up atau tarik tunai tercatat sebagai pemasukan atau pengeluaran. | Catat sebagai transfer antar dompet; transfer mengurangi satu saldo dan menambah saldo lain tanpa mengubah total kekayaan atau arus kas transaksi. |
| Pengeluaran kategori tertentu sulit dikendalikan. | Tetapkan budget bulanan per kategori dan pantau pemakaiannya melalui progress bar di dashboard. |
| Transaksi lama sulit ditemukan dan dibandingkan. | Lihat transaksi terbaru di Ringkasan, cari dan filter riwayat, serta tinjau tren arus kas. |
| Tagihan Paylater berisiko terlambat dibayar. | Catat nominal dan tanggal jatuh tempo, tandai tagihan yang lunas, serta lihat total dan jatuh tempo terdekat di Ringkasan. |
| Pemasukan bulanan harus dicatat berulang kali. | Buat jadwal pemasukan rutin yang diproses otomatis oleh Laravel Scheduler. |

## Fitur

- **Dashboard Ringkasan:** total saldo lintas dompet, pemasukan dan pengeluaran bulan ini, transaksi terbaru, progres budget, serta ringkasan Paylater dan jatuh tempo terdekat.
- **Dompet kustom:** buat rekening bank, uang tunai, e-wallet, atau jenis lain. Saldo mengikuti saldo awal, pemasukan, pengeluaran, dan transfer.
- **Transfer antar dompet:** catat sumber, tujuan, nominal, tanggal, dan catatan transfer. Transfer tidak dimasukkan ke laporan pemasukan atau pengeluaran.
- **Transaksi:** tambah, ubah, hapus, cari, dan filter pemasukan maupun pengeluaran berdasarkan kategori, tanggal, dan dompet.
- **Budget bulanan:** atur batas per kategori untuk bulan tertentu dan lihat nominal terpakai, sisa, serta persentase pemakaian.
- **Paylater:** kelola tagihan, tanggal jatuh tempo, status pembayaran, dan pengingat visual untuk tagihan yang terlambat.
- **Pemasukan rutin:** jadwal dapat diaktifkan atau dinonaktifkan tanpa menghapus transaksi yang sudah dibuat.
- **Kalender dan analisis:** lihat aktivitas berdasarkan tanggal serta tren arus kas enam bulan terakhir.
- **Tema warna:** pilih Fintech Blue, Ocean Teal, Warm Amber, atau Soft Violet. Semua tema mempertahankan latar terang dan kontras yang nyaman.
- **Akun privat:** transaksi, dompet, budget, undangan, dan data keuangan lainnya dibatasi per akun.

## Teknologi

- Laravel 12 dan PHP 8.2+
- React 19, Vite 7, Tailwind CSS 4
- Chart.js untuk visualisasi arus kas
- SQLite sebagai database bawaan pengembangan; konfigurasi database Laravel lain dapat digunakan melalui `.env`

## Menjalankan Secara Lokal

Persyaratan: PHP 8.2 atau lebih baru, Composer, Node.js 20.19+ atau 22.12+, dan npm.

Contoh berikut untuk PowerShell di Windows:

```powershell
composer install
if (!(Test-Path .env)) { Copy-Item .env.example .env }
if (!(Test-Path database/database.sqlite)) { New-Item -ItemType File database/database.sqlite | Out-Null }
php artisan key:generate
php artisan migrate
npm install
npm run build
php artisan serve
```

Buka alamat yang ditampilkan oleh `php artisan serve` (biasanya `http://127.0.0.1:8000`). Untuk hot reload saat mengembangkan frontend, jalankan `npm run dev` di terminal kedua.

Database bawaan memakai SQLite. Jika menggunakan database lain, sesuaikan pengaturan `DB_*` di `.env` sebelum menjalankan migrasi.

## Akun dan Privasi

- Akun pertama dapat mendaftar tanpa undangan. Pendaftaran berikutnya memerlukan tautan undangan sekali pakai yang berlaku selama tujuh hari.
- Tautan undangan dibuat dari **Pengaturan → Undang pengguna**. Setiap akun hanya dapat melihat dan mengelola data keuangannya sendiri.
- Kata sandi harus memiliki panjang minimal 12 karakter.
- Seeder tidak membuat akun demo. Instalasi lama mungkin masih memiliki akun demo `test@example.com`; hapus atau amankan akun tersebut sebelum aplikasi dibuka untuk publik.
- Transaksi lama yang belum memiliki pemilik hanya otomatis diklaim oleh akun pertama jika database belum memiliki pengguna. Jika database sudah berisi akun, cadangkan database lalu tetapkan transaksi yatim ke pemilik yang benar sebelum deployment. Jangan publikasikan aplikasi selama data tersebut belum dibereskan.

## Pemasukan Rutin dan Scheduler

Setiap jadwal memproses pemasukan pada pukul 00.05 sesuai `APP_TIMEZONE` (bawaan proyek: `Asia/Jakarta`). Scheduler memastikan jadwal yang sama hanya dicatat satu kali per akun per bulan. Tanggal 29–31 disesuaikan ke hari terakhir pada bulan yang lebih pendek.

Untuk menjalankan scheduler di lingkungan lokal, gunakan terminal terpisah:

```sh
php artisan schedule:work
```

Di server produksi, jalankan Laravel Scheduler setiap menit melalui cron:

```cron
* * * * * cd /path/to/DompetGweh && php artisan schedule:run >> /dev/null 2>&1
```

Menonaktifkan jadwal mencegah transaksi berikutnya dibuat, tetapi tidak menghapus transaksi yang sudah tercatat.

## Pengujian

```sh
php artisan test
npm run build
```

## Deployment

Repository ini menyertakan `Dockerfile`, `fly.toml`, dan workflow GitHub Actions untuk Fly.io. Deployment otomatis melalui GitHub Actions memerlukan secret repository bernama `FLY_API_TOKEN`.

Untuk deployment di VPS:

1. Atur `.env` produksi dengan `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL` HTTPS, `APP_TIMEZONE=Asia/Jakarta`, dan `SESSION_SECURE_COOKIE=true`. Gunakan `APP_KEY` unik.
2. Gunakan database dan penyimpanan sesi yang persisten. SQLite hanya sesuai jika file database berada di disk persisten dan masuk dalam backup.
3. Arahkan document root web server ke folder `public`, aktifkan HTTPS, dan izinkan web server menulis ke `storage` serta `bootstrap/cache`.
4. Jalankan `composer install --no-dev --optimize-autoloader`, `npm ci`, `php artisan migrate --force`, `npm run build`, dan `php artisan optimize`.
5. Siapkan scheduler sesuai bagian di atas. Buat akun pertama saat akses masih dibatasi, periksa data lama, dan bagikan undangan hanya kepada pengguna yang dituju.
6. Cadangkan database dan `APP_KEY` dengan aman, serta uji proses pemulihan backup.
