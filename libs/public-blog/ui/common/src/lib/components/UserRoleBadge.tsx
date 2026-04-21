import { User } from '@dans-coding-world/prisma-schema';
import styled from 'styled-components';

const roleConfig: Record<User['role'], { icon: string; color: string }> = {
  ADMIN: { icon: 'fa fa-wrench', color: '#c0392b' },
  MOD: { icon: 'fa fa-shield', color: '#8e44ad' },
  AUTHOR: { icon: 'fa fa-pencil', color: '#2471a3' },
  USER: { icon: 'fa fa-user', color: '#1e8449' },
};

const StyledBadge = styled.span<
  React.ComponentPropsWithoutRef<'span'> & { $color: string }
>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0.4em 0.8em;
  border-radius: 500px;
  font-weight: 600;
  font-size: small;
  text-transform: uppercase;
  background-color: ${({ $color }) => `${$color}18`};
  color: ${({ $color }) => $color};
  border: 1px solid ${({ $color }) => `${$color}40`};
`;

export function UserRoleBadge({ role }: { role: User['role'] }) {
  const config = roleConfig[role] ?? { icon: 'fa fa-user', color: '#888' };
  return (
    <StyledBadge $color={config.color}>
      <i className={config.icon} style={{ fontSize: '0.7rem' }} />
      {role}
    </StyledBadge>
  );
}
