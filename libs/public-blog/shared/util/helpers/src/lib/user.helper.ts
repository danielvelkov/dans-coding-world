export function getDisplayName(user: {
  username: string;
  profile?: { firstName?: string; lastName?: string } | null;
}) {
  const first = user.profile?.firstName ?? '';
  const last = user.profile?.lastName ?? '';

  return first || last ? `${first} ${last}`.trim() : user.username;
}
