export const ACCOUNT_TYPES = ['basic', 'admin', 'superadmin', 'developer']

export function accountTypeOf(user) {
  const type = user?.accountType
  if (type === 'admin' || type === 'superadmin' || type === 'developer') return type
  return 'basic'
}

export function accountTypeLabel(user) {
  const type = accountTypeOf(user)
  if (type === 'admin') return 'Admin'
  if (type === 'superadmin') return 'Superadmin'
  if (type === 'developer') return 'Developer'
  return 'Basic'
}

export function isNkuEmail(email) {
  return String(email ?? '').trim().toLowerCase().endsWith('@nku.edu')
}

export function isDeveloper(user) {
  return accountTypeOf(user) === 'developer'
}

// Admins and developers can post with any email. Basic accounts need @nku.edu.
function isStaff(user) {
  const type = accountTypeOf(user)
  return type === 'admin' || type === 'superadmin' || type === 'developer'
}

export function canCreateEvents(user) {
  if (!user) return false
  if (isStaff(user)) return true
  return isNkuEmail(user.email)
}

export function canModerateEvents(user) {
  return isStaff(user)
}

export function canManageLocations(user) {
  return isStaff(user)
}

// Admins, superadmins, and developers can open the admin page and invite admins.
export function canInviteAdmins(user) {
  return isStaff(user)
}

// Only a developer can grant developer or superadmin access.
export function canGrantElevatedRoles(user) {
  return isDeveloper(user)
}

// Superadmins can remove admins. Developers can remove admins, superadmins, and developers.
export function canRemoveAdmins(user) {
  const type = accountTypeOf(user)
  return type === 'superadmin' || type === 'developer'
}
