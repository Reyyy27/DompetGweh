<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminMemberManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_members_cannot_manage_accounts_or_create_invitations(): void
    {
        $member = User::factory()->create();

        $this->actingAs($member)
            ->getJson('/api/admin/members')
            ->assertForbidden();

        $this->postJson('/api/invitations')->assertForbidden();
    }

    public function test_admin_can_update_member_details_and_password_without_changing_role(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $member = User::factory()->create();

        $this->actingAs($admin)->putJson("/api/admin/members/{$member->id}", [
            'name' => 'Updated Member',
            'email' => 'updated@example.test',
            'password' => 'new-member-password',
            'password_confirmation' => 'new-member-password',
        ])->assertOk()
            ->assertExactJson([
                'id' => $member->id,
                'name' => 'Updated Member',
                'email' => 'updated@example.test',
            ]);

        $member->refresh();
        $this->assertSame('member', $member->role);
        $this->assertTrue(Hash::check('new-member-password', $member->password));
    }

    public function test_admin_cannot_change_another_admin_through_member_management(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $anotherAdmin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->putJson("/api/admin/members/{$anotherAdmin->id}", [
                'name' => 'Changed Admin',
                'email' => 'changed@example.test',
            ])
            ->assertNotFound();

        $this->assertSame('admin', $anotherAdmin->fresh()->role);
    }
}