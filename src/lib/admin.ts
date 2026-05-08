import { createAdminClient } from './supabase'

export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('admin_users')
      .select('id')
      .eq('id', userId)
      .single()
    return !!data
  } catch {
    return false
  }
}

export async function grantAdminAccess(adminId: string, newAdminEmail: string): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = createAdminClient()

    // First, find the user by email
    const { data: { users }, error: searchError } = await supabase.auth.admin.listUsers()

    if (searchError || !users) {
      return { success: false, message: 'Failed to search for user' }
    }

    const targetUser = users.find(u => u.email === newAdminEmail)
    if (!targetUser) {
      return { success: false, message: 'User not found' }
    }

    // Grant admin access
    const { error } = await supabase
      .from('admin_users')
      .insert({
        id: targetUser.id,
        role: 'admin',
        granted_by: adminId,
      })

    if (error) {
      return { success: false, message: error.message }
    }

    return { success: true, message: `Granted admin access to ${newAdminEmail}` }
  } catch (err) {
    return { success: false, message: 'Error granting admin access' }
  }
}
