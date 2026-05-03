import styled from 'styled-components';

const AVATAR_SIZES = {
  XS: 16,
  S: 24,
  M: 32,
  LG: 40,
  XL: 80,
};

const AVATAR_SIZES_FONT = {
  XS: 1,
  S: 1.2,
  M: 1.4,
  LG: 1.6,
  XL: 2,
};

const AVATAR_SHAPES = ['circle', 'square'] as const;

type AvatarSize = keyof typeof AVATAR_SIZES;
type AvatarShape = (typeof AVATAR_SHAPES)[number];

const StyledAvatar = styled.div<
  React.ComponentPropsWithoutRef<'div'> & {
    $imgSize: AvatarSize;
    $shape: AvatarShape;
  }
>`
  display: flex;
  cursor: pointer;
  justify-content: center;
  text-align: center;

  .avatar {
    object-fit: cover;
    font-size: ${(props) => AVATAR_SIZES_FONT[props.$imgSize]}em;
    height: ${(props) => AVATAR_SIZES[props.$imgSize]}px;
    align-content: center;
    aspect-ratio: 1/1;
    border-radius: ${(props) =>
      props.$shape === AVATAR_SHAPES[0] ? '50%' : 'none'};
  }
`;

export function UserAvatar({
  avatarURL,
  name,
  size = 'M',
  shape = 'square',
  className,
}: {
  avatarURL?: string;
  name: string;
  size?: AvatarSize;
  shape?: AvatarShape;
  className?: string;
}) {
  return (
    <StyledAvatar className={className} $imgSize={size} $shape={shape}>
      {avatarURL ? (
        <img className="avatar" src={avatarURL} alt={`${name}'s avatar`} />
      ) : (
        <i
          className="avatar fa fa-regular fa-user"
          aria-label="Default user avatar"
        ></i>
      )}
    </StyledAvatar>
  );
}

export default UserAvatar;
