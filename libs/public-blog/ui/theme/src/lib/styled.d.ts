import 'styled-components';
import { Theme } from './theme.ts';

declare module 'styled-components' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface
  export interface DefaultTheme extends Theme {}
}
