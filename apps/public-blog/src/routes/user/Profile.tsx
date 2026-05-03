import {
  UserProfile,
  EditUserProfile,
} from '@dans-coding-world/public-blog-features-user-account';
import { useMatch, useParams } from 'react-router-dom';
import styled from 'styled-components';

const StyledContainer = styled.main`
  max-width: 800px;
  margin: 1em auto;
`;

export function Profile() {
  const { userId } = useParams<{ userId: string }>();
  if (!userId || !Number.isInteger(+userId)) throw new Error('Invalid user id');

  const isEditPage = useMatch('/users/:userId/edit');
  return (
    <StyledContainer>
      {isEditPage ? (
        <EditUserProfile userId={+userId}></EditUserProfile>
      ) : (
        <UserProfile userId={+userId}></UserProfile>
      )}
    </StyledContainer>
  );
}

export default Profile;
