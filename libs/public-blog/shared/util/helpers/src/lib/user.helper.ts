export function getDisplayName(user: {
  username: string;
  profile?: { firstName?: string; lastName?: string } | null;
}) {
  const first = user.profile?.firstName?.trim() ?? '';
  const last = user.profile?.lastName?.trim() ?? '';

  return first.length > 0 || last.length > 0
    ? `${first} ${last}`.trim()
    : user.username;
}
