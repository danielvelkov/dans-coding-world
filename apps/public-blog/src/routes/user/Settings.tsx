import { UserSettings } from '@dans-coding-world/public-blog-features-user-account';
import styled from 'styled-components';

const StyledUserSettings = styled(UserSettings)``;

export function Settings() {
  return (
    <main>
      <StyledUserSettings></StyledUserSettings>
    </main>
  );
}

export default Settings;
