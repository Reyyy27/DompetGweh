<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use SQLite3;
use Throwable;

class DatabaseBackupController extends Controller
{
    public function index()
    {
        File::ensureDirectoryExists($this->backupDirectory());

        return collect(File::files($this->backupDirectory()))
            ->filter(fn ($file) => $file->getExtension() === 'sqlite')
            ->sortByDesc(fn ($file) => $file->getMTime())
            ->map(fn ($file) => [
                'filename' => $file->getFilename(),
                'size' => $file->getSize(),
                'created_at' => date(DATE_ATOM, $file->getMTime()),
            ])
            ->values();
    }

    public function create()
    {
        $path = $this->createSnapshot('backup');

        return response()->json([
            'filename' => basename($path),
            'download_url' => route('api.admin.database.backups.download', basename($path)),
        ], 201);
    }

    public function download(string $filename)
    {
        abort_unless(preg_match('/\A[a-zA-Z0-9._-]+\.sqlite\z/', $filename) === 1, 404);

        $path = $this->backupDirectory().DIRECTORY_SEPARATOR.$filename;
        abort_unless(File::isFile($path), 404);

        return response()->download($path, $filename, ['Content-Type' => 'application/vnd.sqlite3']);
    }

    public function restore(Request $request)
    {
        $validated = $request->validate([
            'backup' => ['required', 'file', 'max:90000'],
        ]);

        $databasePath = $this->databasePath();
        abort_if($databasePath === ':memory:' || ! File::isFile($databasePath), 422, 'Database tidak dapat dipulihkan pada konfigurasi ini.');

        $uploadPath = $validated['backup']->getRealPath();
        $this->assertValidBackup($uploadPath);

        $safetyBackup = $this->createSnapshot('pre-restore');

        try {
            DB::purge();
            $this->copyDatabase($uploadPath, $databasePath);
            $this->assertValidBackup($databasePath);
            DB::purge();
        } catch (Throwable $exception) {
            try {
                $this->copyDatabase($safetyBackup, $databasePath);
            } catch (Throwable $restoreException) {
                report($restoreException);
            }
            DB::purge();
            report($exception);

            return response()->json([
                'message' => 'Pemulihan gagal. Database sebelum pemulihan telah disimpan sebagai backup keamanan.',
            ], 500);
        }

        $this->pruneBackups();

        return response()->json([
            'message' => 'Database berhasil dipulihkan. Backup sebelum pemulihan tetap tersimpan.',
            'safety_backup' => basename($safetyBackup),
        ]);
    }

    private function createSnapshot(string $prefix): string
    {
        abort_unless(DB::connection()->getDriverName() === 'sqlite', 501, 'Backup hanya tersedia untuk database SQLite.');

        $directory = $this->backupDirectory();
        File::ensureDirectoryExists($directory);

        $filename = $prefix.'-'.now()->format('Ymd-His').'-'.Str::random(8).'.sqlite';
        $path = $directory.DIRECTORY_SEPARATOR.$filename;
        $source = new SQLite3($this->databasePath(), SQLITE3_OPEN_READONLY);
        $destination = new SQLite3($path, SQLITE3_OPEN_READWRITE | SQLITE3_OPEN_CREATE);

        try {
            $source->busyTimeout(10000);
            $destination->busyTimeout(10000);
            if (! $source->backup($destination)) {
                throw new \RuntimeException('SQLite backup operation failed.');
            }
        } catch (Throwable $exception) {
            File::delete($path);
            throw $exception;
        } finally {
            $source->close();
            $destination->close();
        }

        $this->assertValidBackup($path);
        $this->pruneBackups();

        return $path;
    }

    private function copyDatabase(string $sourcePath, string $destinationPath): void
    {
        $source = new SQLite3($sourcePath, SQLITE3_OPEN_READONLY);
        $destination = new SQLite3($destinationPath, SQLITE3_OPEN_READWRITE);

        try {
            $source->busyTimeout(10000);
            $destination->busyTimeout(10000);
            if (! $source->backup($destination)) {
                throw new \RuntimeException('SQLite restore operation failed.');
            }
        } finally {
            $source->close();
            $destination->close();
        }
    }

    private function assertValidBackup(string $path): void
    {
        if (! File::isFile($path) || file_get_contents($path, false, null, 0, 16) !== "SQLite format 3\0") {
            abort(422, 'File bukan backup SQLite yang valid.');
        }

        $database = new SQLite3($path, SQLITE3_OPEN_READONLY);
        try {
            $database->busyTimeout(10000);
            if ($database->querySingle('PRAGMA integrity_check') !== 'ok') {
                abort(422, 'Backup SQLite rusak dan tidak dapat dipulihkan.');
            }

            $tableCount = (int) $database->querySingle("SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name IN ('users', 'transactions', 'migrations')");
            if ($tableCount !== 3) {
                abort(422, 'Backup tidak memiliki tabel inti DompetGweh.');
            }
        } finally {
            $database->close();
        }
    }

    private function pruneBackups(): void
    {
        File::ensureDirectoryExists($this->backupDirectory());

        $files = collect(File::files($this->backupDirectory()))
            ->filter(fn ($file) => $file->getExtension() === 'sqlite')
            ->sortByDesc(fn ($file) => $file->getMTime())
            ->values();

        $files->slice(10)->each(fn ($file) => File::delete($file->getPathname()));
    }

    private function databasePath(): string
    {
        return (string) config('database.connections.sqlite.database');
    }

    private function backupDirectory(): string
    {
        return (string) config('database.backup_path');
    }
}