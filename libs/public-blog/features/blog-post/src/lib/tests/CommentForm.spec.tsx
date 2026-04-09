import {
  render,
  screen,
  waitFor,
  within,
} from '@dans-coding-world/public-blog-tools';
import CommentForm from '../components/CommentForm';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import React from 'react';
import userEvent from '@testing-library/user-event';
import { generateRandomString } from '@dans-coding-world/helpers';
import { COMMENT_CONSTRAINTS } from '@dans-coding-world/shared-constants';
import { fireEvent } from '@testing-library/react';

describe('CommentForm', () => {
  const renderFeature = (
    attrs: React.ComponentProps<typeof CommentForm> = {
      isLocked: false,
      onSubmit: () => null,
    }
  ) => {
    return render(
      <MemoryRouter>
        <CommentForm {...attrs} />
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render successfully', () => {
    const { baseElement } = renderFeature();
    expect(baseElement).toBeTruthy();
  });

  it('should disable "submit" button on an empty comment', async () => {
    const user = userEvent.setup();
    const { baseElement } = renderFeature();
    const textbox = within(baseElement).getByRole('textbox');
    await user.type(textbox, '              ');

    expect(screen.getByRole('button', { name: 'Submit' })).toHaveAttribute(
      'disabled'
    );
  });

  it('should not allow typing in textbox past limit', async () => {
    const user = userEvent.setup();
    const { baseElement } = renderFeature();
    const textbox = within(baseElement).getByRole('textbox');

    const maxLenComment = generateRandomString(
      COMMENT_CONSTRAINTS.MAX_CONTENT_LENGTH
    );
    const overflowCharacter = 'z';

    fireEvent.change(textbox, { target: { value: maxLenComment } });
    await user.type(textbox, overflowCharacter);

    expect(
      screen.getByDisplayValue(
        maxLenComment.substring(0, COMMENT_CONSTRAINTS.MAX_CONTENT_LENGTH)
      )
    ).toBeInTheDocument();
  });

  it('should show submit button only when "isLocked" is false', async () => {
    const { baseElement } = renderFeature({
      isLocked: true,
      onSubmit: () => null,
    });

    expect(
      within(baseElement).queryByRole('button', { name: 'Submit' })
    ).not.toBeTruthy();

    const { baseElement: unlockedBaseElement } = renderFeature();
    expect(
      within(unlockedBaseElement).getByRole('button', { name: 'Submit' })
    ).toBeInTheDocument();
  });

  it(`should call parameter cb "onSubmit" with current comment as value on 
    clicking submit`, async () => {
    const user = userEvent.setup();
    const mockSubmitFn = vi.fn();
    const { baseElement } = renderFeature({
      isLocked: false,
      onSubmit: mockSubmitFn,
    });

    const textbox = within(baseElement).getByRole('textbox');

    const commentText = generateRandomString(50);

    await user.clear(textbox);
    await user.type(textbox, commentText);
    await user.click(
      within(baseElement).getByRole('button', { name: 'Submit' })
    );

    expect(mockSubmitFn).toHaveBeenLastCalledWith(commentText);
  });

  it(`should show login call to action modal only when
     "isLocked" is true and 
    user selects textbox`, async () => {
    renderFeature({
      isLocked: true,
      onSubmit: () => null,
    });
    const user = userEvent.setup();

    await user.click(screen.getByTestId('locked-comment-overlay'));

    await waitFor(() => {
      expect(
        screen.getByText(/login to join the conversation/i)
      ).toBeInTheDocument();
    });
  });

  it(`should contain link to login page on call to action modal `, async () => {
    renderFeature({
      isLocked: true,
      onSubmit: () => null,
    });
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    const user = userEvent.setup();

    await user.click(screen.getByTestId('locked-comment-overlay'));

    await waitFor(() => {
      expect(screen.getByRole('link')).toHaveAttribute('href', '/login');
    });
  });
});
