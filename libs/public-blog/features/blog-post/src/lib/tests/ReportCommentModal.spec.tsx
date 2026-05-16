import { render, within } from '@dans-coding-world/public-blog-tools';
import { ReportCommentModal } from '../components/ReportCommentModal';
import userEvent from '@testing-library/user-event';
import { act } from 'react';

describe('ReportCommentModal', () => {
  const renderFeature = (
    overrides?: Partial<Parameters<typeof ReportCommentModal>[0]>
  ) => {
    return render(
      <ReportCommentModal
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        {...overrides}
      />
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render successfully', () => {
    const { baseElement } = renderFeature();
    expect(baseElement).toBeTruthy();
  });

  it('should disable "Submit" button if no reason selected', async () => {
    const { baseElement } = renderFeature();
    expect(
      within(baseElement)
        .getByRole('button', { name: /submit/i })
        .hasAttribute('disabled')
    ).toBe(true);
  });

  it('should enable "Submit" button on reason selected', async () => {
    const user = userEvent.setup();
    const { baseElement } = renderFeature();
    await act(async () => {
      await user.click(within(baseElement).getAllByRole('checkbox')[0]);
    });
    expect(
      within(baseElement)
        .getByRole('button', { name: /submit/i })
        .hasAttribute('disabled')
    ).toBe(false);
  });

  it('should call onCancel() callback on clicking "Cancel" button', async () => {
    const mockClose = vi.fn();
    const user = userEvent.setup();
    const { baseElement } = renderFeature({ onClose: mockClose });
    expect(mockClose).not.toHaveBeenCalledTimes(1);
    await user.click(
      within(baseElement).getByRole('button', { name: /cancel/i })
    );
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('should call onSubmit() callback on clicking "Submit" with reason selected', async () => {
    const mockSubmit = vi.fn();
    const user = userEvent.setup();
    const { baseElement } = renderFeature({ onSubmit: mockSubmit });
    expect(mockSubmit).not.toHaveBeenCalledTimes(1);
    await user.click(
      within(baseElement).getByRole('checkbox', { name: /spam/i })
    );
    await user.click(
      within(baseElement).getByRole('button', { name: /submit/i })
    );
    expect(mockSubmit).toHaveBeenCalledTimes(1);
  });
});
