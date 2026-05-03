import { UserRegistration } from '@dans-coding-world/public-blog-features-user-registration';
import styled from 'styled-components';

const StyledUserRegistration = styled(UserRegistration)``;

export function Register() {
  return (
    <main>
      <StyledUserRegistration></StyledUserRegistration>
    </main>
  );
}

export default Register;
