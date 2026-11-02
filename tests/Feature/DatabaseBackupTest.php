<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Tests\TestCase;

class DatabaseBackupTest extends TestCase
{
    private string $databasePath;

    private string $backupDirectory;

    protected function setUp(): void
    {
        parent::setUp();

        $testingDirectory = storage_path('framework/testing');
        File::ensureDirectoryExists($testingDirectory);
        $suffix = Str::random(12);
        $this->databasePath = $testingDirectory.DIRECTORY_SEPARATOR.'backup-test-'.$suffix.'.sqlite';
        $this->backupDirectory = $testingDirectory.DIRECTORY_SEPARATOR.'backups-'.$suffix;
        File::put($this->databasePath, '');

        config([
            'database.default' => 'sqlite',
            'database.connections.sqlite.database' => $this->databasePath,
            'database.backup_path' => $this->backupDirectory,
        ]);
        DB::purge('sqlite');
        Artisan::call('migrate:fresh', ['--force' => true]);
    }

    protected function tearDown(): void
    {
        DB::purge('sqlite');
        File::delete($this->databasePath);
        File::delete($this->databasePath.'-shm');
        File::delete($this->databasePath.'-wal');
        File::deleteDirectory($this->backupDirectory);

        parent::tearDown();
    }

    public function test_only_admins_can_create_list_download_or_restore_backups(): void
    {
        $member = User::factory()->create();

        $this->actingAs($member)
            ->getJson('/api/admin/database/backups')
            ->assertForbidden();

        $this->postJson('/api/admin/database/backups')->assertForbidden();
        $this->postJson('/api/admin/database/restore')->assertForbidden();
    }

    public function test_admin_can_export_and_restore_a_valid_backup_with_a_safety_copy(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $member = User::factory()->create(['name' => 'Original Member']);

        $created = $this->actingAs($admin)
            ->postJson('/api/admin/database/backups')
            ->assertCreated()
            ->assertJsonStructure(['filename', 'download_url']);

        $filename = $created->json('filename');
        $backupPath = $this->backupDirectory.DIRECTORY_SEPARATOR.$filename;
        $this->assertFileExists($backupPath);

        $this->get($created->json('download_url'))
            ->assertOk()
            ->assertDownload($filename);

        $this->putJson('/api/account', ['name' => 'Modified after backup'])->assertOk();
        $upload = UploadedFile::fake()->createWithContent($filename, file_get_contents($backupPath));

        $restored = $this->postJson('/api/admin/database/restore', ['backup' => $upload])
            ->assertOk()
            ->assertJsonPath('message', 'Database berhasil dipulihkan. Backup sebelum pemulihan tetap tersimpan.');

        DB::purge('sqlite');
        $this->assertSame('Original Member', User::findOrFail($member->id)->name);
        $this->assertFileExists($this->backupDirectory.DIRECTORY_SEPARATOR.$restored->json('safety_backup'));
        $this->assertCount(2, File::files($this->backupDirectory));
    }

    public function test_corrupt_backup_is_rejected_without_changing_live_data(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $member = User::factory()->create(['name' => 'Keep this member']);
        $upload = UploadedFile::fake()->createWithContent('invalid.sqlite', 'not a SQLite database');

        $this->actingAs($admin)
            ->postJson('/api/admin/database/restore', ['backup' => $upload])
            ->assertUnprocessable();

        $this->assertSame('Keep this member', $member->fresh()->name);
        $this->assertDirectoryDoesNotExist($this->backupDirectory);
    }
}