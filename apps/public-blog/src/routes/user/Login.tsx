import { UserLogin } from '@dans-coding-world/public-blog-features-user-login';
import styled from 'styled-components';

const StyledUserLogin = styled(UserLogin)``;

export function Login() {
  return (
    <main>
      <StyledUserLogin></StyledUserLogin>
    </main>
  );
}

export default Login;
