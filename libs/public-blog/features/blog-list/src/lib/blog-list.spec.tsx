import { render } from '@testing-library/react';

import BlogList from './blog-list';

describe('Public-Blog feature - BlogList', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<BlogList />);
    expect(baseElement).toBeTruthy();
  });
});
