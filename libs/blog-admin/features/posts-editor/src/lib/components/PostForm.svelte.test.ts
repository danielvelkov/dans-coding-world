import { type ComponentProps } from 'svelte';
import { render } from 'vitest-browser-svelte';
import { page, userEvent } from 'vitest/browser';
import { expect, it, describe } from 'vitest';
import PostForm from './PostForm.svelte';
import { createValidationErrorDetailsList } from '@dans-coding-world/exceptions';
import { ResponseErrorDetails } from '@dans-coding-world/api-types';
import { generateRandomPosts } from '@dans-coding-world/shared-post-testing';
import { FormAction } from '../types/form-actions.type.js';
import type { PostStatus } from '@dans-coding-world/prisma-schema';
import { generateRandomString } from '@dans-coding-world/helpers';
import {
  POST_CONSTRAINTS,
  TAG_CONSTRAINTS,
} from '@dans-coding-world/shared-constants';

describe('PostForm', () => {
  const renderFeature = async (
    params?: Partial<ComponentProps<typeof PostForm>>,
  ) => {
    return await render(PostForm, {
      handleSubmit: vi.fn(),
      mode: 'create',
      isLoading: false,
      ...params,
    });
  };

  const randomPost = generateRandomPosts(1)[0];

  const openTagsDropdown = async () => {
    await page.getByRole('searchbox').click();
  };

  const typeIntoContentEditor = async (value: string) => {
    const user = userEvent.setup();
    const editor = page.getByTestId('editor');
    const textArea = editor.element().querySelector('.ql-editor');
    if (!textArea) throw new Error('Missing editor');

    await user.click(editor);
    await user.fill(textArea, value);
  };

  const typeIntoTitleInput = async (value: string) => {
    const user = userEvent.setup();
    const input = page.getByLabelText('Title');

    await user.fill(input, value);
  };

  it('renders successfully', async () => {
    const screen = await renderFeature();
    expect(screen).toBeDefined();
  });

  it('contains "Title" input field', async () => {
    const screen = await renderFeature();
    const titleInput = screen.getByLabelText('Title');
    expect(titleInput).toBeTruthy();
    expect(titleInput.element().tagName).toBe('INPUT');
  });

  it('contains "Content" field', async () => {
    const screen = await renderFeature();
    const contentEditor = screen.getByLabelText('Content');
    expect(contentEditor).toBeTruthy();
  });

  it('renders "Tags" search input with placeholder', async () => {
    await renderFeature();
    await expect
      .element(page.getByRole('searchbox'))
      .toHaveAttribute('placeholder', 'Search tag...');
  });

  it('contains "Members-only" checkbox field', async () => {
    const screen = await renderFeature();
    const membersOnlyCheckbox = screen.getByLabelText('Members-only');
    expect(membersOnlyCheckbox).toBeTruthy();
    expect(membersOnlyCheckbox.element().tagName).toBe('INPUT');
  });

  describe('content editor', () => {
    it('updates preview section when editing "Content" field editor', async () => {
      const screen = await renderFeature();
      await typeIntoContentEditor(randomPost.content);
      const preview = screen.getByTestId('preview');
      expect(preview).toHaveTextContent(randomPost.content);
    });

    it(`should reflect the HTML changes from "Content" field editor
    into the "Preview' section as semantic HTML
     when selecting text headers from toolbar`, async () => {
      const content = 'Hello World';
      const screen = await renderFeature();
      await typeIntoContentEditor(content);
      const preview = screen.getByTestId('preview');
      await expect
        .element(preview.getByRole('heading', { name: content }))
        .not.toBeInTheDocument();

      // Open the header picker
      const headerPickerLabel = document.querySelector(
        '.ql-picker.ql-header .ql-picker-label',
      ) as HTMLElement;
      headerPickerLabel.click();

      const h1Option = document.querySelector(
        '.ql-picker.ql-header .ql-picker-item[data-value="1"]', // Heading 1 option
      ) as HTMLElement;
      h1Option.click();

      await expect
        .element(preview.getByRole('heading', { name: content, level: 1 }))
        .toBeInTheDocument();

      const h2Option = document.querySelector(
        '.ql-picker.ql-header .ql-picker-item[data-value="2"]', // Heading 2 option
      ) as HTMLElement;
      h2Option.click();
      await expect
        .element(preview.getByRole('heading', { name: content, level: 2 }))
        .toBeInTheDocument();
    });
  });

  describe('tag selection', () => {
    it('should populate tag search input with passed tagOptions on click', async () => {
      const tags = ['tag-1', 'tag-2'];
      const screen = await renderFeature({
        tagOptions: tags.map((name) => ({ name })),
      });
      await openTagsDropdown();
      const dropdownListBox = screen.getByTestId('dropdown-search-listbox');
      for (const tag of tags)
        await expect
          .element(
            dropdownListBox.getByRole('option', { name: new RegExp(tag) }),
          )
          .toBeInTheDocument();
    });

    it(`should show post's tags as deletable chips if postData present in edit mode`, async () => {
      const tags = ['tag-1', 'tag-2'];
      const screen = await renderFeature({
        mode: 'edit',
        tagOptions: tags.map((name) => ({ name })),
        postData: { ...randomPost, tags },
      });
      const chips = screen.getByTestId(/chip-/).elements();
      expect(chips.length).toBe(tags.length);
    });

    it('selecting a tag from the search input toggles it', async () => {
      const [first, second] = ['tag-1', 'tag-2'];
      const screen = await renderFeature({
        tagOptions: [first, second].map((name) => ({ name })),
      });
      await openTagsDropdown();
      const dropdownListBox = screen.getByTestId('dropdown-search-listbox');
      expect(screen.getByTestId(/chip-\s+/)).not.toBeInTheDocument();
      await dropdownListBox
        .getByRole('option', { name: new RegExp(first) })
        .click();
      expect(screen.getByTestId(`chip-${first}`)).toBeInTheDocument();
      expect(screen.getByTestId(`chip-${second}`)).not.toBeInTheDocument();

      // Toggle
      await openTagsDropdown();
      await dropdownListBox
        .getByRole('option', { name: new RegExp(first) })
        .click();
      expect(screen.getByTestId(`chip-${first}`)).not.toBeInTheDocument();
    });

    it('adding a tag through the tag input toggles it in search input dropdown', async () => {
      const user = userEvent.setup();
      const [first, second] = ['tag-1', 'tag-2'];
      const screen = await renderFeature({
        tagOptions: [first, second].map((name) => ({ name })),
      });

      const input = screen.getByPlaceholder(/add tag.../i);
      await user.click(input);
      await user.keyboard(first);
      await user.keyboard('[Enter]');

      await openTagsDropdown();
      const dropdownListBox = screen.getByTestId('dropdown-search-listbox');
      expect(
        dropdownListBox.getByRole('option', { name: new RegExp(first) }),
      ).toHaveAttribute('aria-selected', 'true');
      expect(
        dropdownListBox.getByRole('option', { name: new RegExp(second) }),
      ).not.toHaveAttribute('aria-selected', 'true');
    });

    it(`should call handleSubmit() with selected tags from search or 
      newly added tags typed through tag input`, async () => {
      const user = userEvent.setup();
      const mockSubmitFn = vi.fn();
      const customTagName = 'unique';
      const [first, second] = ['tag-1', 'tag-2'];
      const screen = await renderFeature({
        mode: 'create',
        tagOptions: [first, second].map((name) => ({ name })),
        handleSubmit: mockSubmitFn,
      });

      const input = screen.getByPlaceholder(/add tag.../i);
      await user.click(input);
      await user.keyboard(customTagName);
      await user.keyboard('[Enter]');

      await openTagsDropdown();
      const dropdownListBox = screen.getByTestId('dropdown-search-listbox');
      await dropdownListBox
        .getByRole('option', { name: new RegExp(first) })
        .click();
      // fill required data
      await typeIntoTitleInput(randomPost.title);
      await typeIntoContentEditor(randomPost.content);
      await screen.getByRole('button', { name: /save as draft$/i }).click();
      expect(mockSubmitFn).toHaveBeenCalled();
      expect(mockSubmitFn).toHaveBeenCalledWith(
        expect.objectContaining({ tags: [customTagName, first] }),
      );
    });
  });

  describe('Create mode', () => {
    it('does not contain status of the edited post', async () => {
      const screen = await renderFeature({
        mode: 'create',
        postData: randomPost,
      });

      expect(
        screen.getByText(`Current status: ${randomPost.status}`),
      ).not.toBeInTheDocument();
    });

    it.each(['Save as Draft', 'Publish'] as FormAction[])(
      'contains "%s" action',
      async (actionName: string) => {
        const screen = await renderFeature({
          mode: 'create',
        });
        await expect
          .element(screen.getByRole('button', { name: actionName }))
          .toBeInTheDocument();
      },
    );

    it.each(['Save as Draft', 'Publish'] as FormAction[])(
      `disables action "%s" action if isLoading is true`,
      async (actionName: FormAction) => {
        const screen = await renderFeature({
          mode: 'create',
          isLoading: true,
        });
        expect(
          screen.getByRole('button', {
            name: actionName,
          }),
        ).toBeDisabled();
      },
    );

    describe('on valid data entered', () => {
      let mockSubmitFn = vi.fn();

      beforeEach(async () => {
        vi.clearAllMocks();
        mockSubmitFn = vi.fn();
        await renderFeature({
          mode: 'create',
          handleSubmit: mockSubmitFn,
        });

        await typeIntoTitleInput(randomPost.title);
        await typeIntoContentEditor(randomPost.content);
      });

      it(`displays a confirmation dialog when selecting "Publish"`, async () => {
        await page.getByRole('button', { name: /publish$/i }).click();
        const dialog = page.getByRole('dialog');
        expect(dialog).toBeVisible();
      });

      it(`should call handleSubmit() with isDraft = false when clicking 'Publish'
        and confirming dialog`, async () => {
        await page.getByRole('button', { name: /^Publish/i }).click();
        const dialog = page.getByRole('dialog');
        await dialog.getByRole('button', { name: 'Confirm' }).click();
        expect(mockSubmitFn).toHaveBeenCalled();
        expect(mockSubmitFn).toHaveBeenCalledWith(
          expect.objectContaining({ isDraft: false }),
        );
      });

      it(`should call handleSubmit() with isDraft = true 
         when clicking 'Save as Draft'`, async () => {
        await page.getByRole('button', { name: /^save as draft/i }).click();
        expect(mockSubmitFn).toHaveBeenCalled();
        expect(mockSubmitFn).toHaveBeenCalledWith(
          expect.objectContaining({ isDraft: true }),
        );
      });
    });
  });

  describe('Edit mode', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('contains status of the edited post', async () => {
      const screen = await renderFeature({
        mode: 'edit',
        postData: randomPost,
      });

      expect(
        screen.getByText(`Current status: ${randomPost.status}`),
      ).toBeInTheDocument();
    });

    it('contains "Save" action', async () => {
      const screen = await renderFeature({
        mode: 'edit',
      });
      await expect
        .element(screen.getByRole('button', { name: /save$/i }))
        .toBeInTheDocument();
    });

    for (const [isShown, actionName, status] of [
      [true, 'Unpublish', 'PUBLISHED'],
      [false, 'Unpublish', 'DRAFT'],
      [false, 'Unpublish', 'ARCHIVED'],
      [false, 'Publish', 'PUBLISHED'],
      [true, 'Publish', 'DRAFT'],
      [true, 'Publish', 'ARCHIVED'],
      [true, 'Archive', 'PUBLISHED'],
      [true, 'Archive', 'DRAFT'],
      [false, 'Archive', 'ARCHIVED'],
    ])
      it(`should${isShown ? '' : ' not'} render action "${actionName}" if post status is "${status}"`, async () => {
        const screen = await renderFeature({
          mode: 'edit',
          postData: { ...randomPost, status: status as PostStatus },
        });
        if (isShown)
          await expect
            .element(
              screen.getByRole('button', {
                name: new RegExp(`^${actionName as string}`),
              }),
            )
            .toBeInTheDocument();
        else
          await expect
            .element(
              screen.getByRole('button', {
                name: new RegExp(`^${actionName as string}`),
              }),
            )
            .not.toBeInTheDocument();
      });

    it('should populate form fields if postData present', async () => {
      const screen = await renderFeature({
        mode: 'edit',
        postData: {
          ...randomPost,
          visibility: Math.random() > 0.5 ? 'MEMBERS_ONLY' : 'PUBLIC',
        },
      });

      await expect
        .element(screen.getByRole('textbox', { name: 'Title' }))
        .toHaveValue(randomPost.title);

      const editorEl = screen.getByTestId('editor').element() as HTMLElement;
      expect(editorEl.innerHTML).toContain(randomPost.content);

      if (randomPost.visibility === 'MEMBERS_ONLY')
        await expect
          .element(screen.getByRole('checkbox', { name: 'Members-only' }))
          .toHaveAttribute('checked');
      else
        await expect
          .element(screen.getByRole('checkbox', { name: 'Members-only' }))
          .not.toHaveAttribute('checked');
    });

    it('should not execute any js if postData content contains XSS injection', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      const xssInjectionHTML =
        "<img src='x' onerror='confirm(\"hacked\")' width='0' height='0'>";

      const screen = await renderFeature({
        mode: 'edit',
        postData: {
          ...randomPost,
          content: xssInjectionHTML,
        },
      });

      // INFO: never do this, html is turned into a DOM structure which in turn runs the HTML
      // Did not know why the test always failed, turns out this line always caused onerror to run
      // expect(screen.getByTestId('editor')).not.toContainHTML(xssInjectionHTML); // <-- WOW
      const editorEl = screen.getByTestId('editor').element() as HTMLElement;
      expect(editorEl.innerHTML).not.toContain('onerror');
      expect(editorEl.innerHTML).not.toContain('confirm(');

      expect(editorEl.querySelector('[onerror]')).toBeNull();

      await new Promise((r) => setTimeout(r, 100));

      expect(confirmSpy).not.toHaveBeenCalled();
      expect(confirmSpy).not.toHaveBeenCalledWith('hacked');
    });

    for (const status of ['PUBLISHED', 'ARCHIVED', 'DRAFT'] as PostStatus[])
      it(`should call handleSubmit() with post's status when clicking "Save" (${status})`, async () => {
        const mockSubmitFn = vi.fn();

        const screen = await renderFeature({
          mode: 'edit',
          postData: { ...randomPost, status },
          handleSubmit: mockSubmitFn,
        });
        await screen.getByRole('button', { name: /save$/i }).click();
        expect(mockSubmitFn).toHaveBeenCalled();
        expect(mockSubmitFn).toHaveBeenCalledWith(
          expect.objectContaining({ status }),
        );
      });

    it(`should call handleSubmit() with 'PUBLISHED' status when clicking 'Publish' 
    after confirming dialog`, async () => {
      const randomPost = generateRandomPosts(1)[0];
      const mockSubmitFn = vi.fn();

      const screen = await renderFeature({
        mode: 'edit',
        postData: { ...randomPost, status: 'ARCHIVED' },
        handleSubmit: mockSubmitFn,
        isLoading: false,
      });
      await screen.getByRole('button', { name: /^Publish/i }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('button', { name: 'Confirm' }).click();
      expect(mockSubmitFn).toHaveBeenCalled();
      expect(mockSubmitFn).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'PUBLISHED' }),
      );
    });

    it(`should call handleSubmit() with 'DRAFT' status when clicking 'Unpublish'
      after confirming dialog`, async () => {
      const mockSubmitFn = vi.fn();

      await renderFeature({
        mode: 'edit',
        postData: { ...randomPost, status: 'PUBLISHED' },
        handleSubmit: mockSubmitFn,
      });
      await page.getByRole('button', { name: /^unpublish/i }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('button', { name: 'Confirm' }).click();
      expect(mockSubmitFn).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'DRAFT' }),
      );
    });

    for (const status of ['PUBLISHED', 'DRAFT'] as PostStatus[])
      it(`should call handleSubmit() with 'ARCHIVED' status when clicking 'Archive' (${status})
    after confirming dialog`, async () => {
        const mockSubmitFn = vi.fn();

        const screen = await renderFeature({
          mode: 'edit',
          postData: { ...randomPost, status },
          handleSubmit: mockSubmitFn,
        });
        await screen.getByRole('button', { name: /^Archive/i }).click();
        const dialog = page.getByRole('dialog');
        await dialog.getByRole('button', { name: 'Confirm' }).click();
        expect(mockSubmitFn).toHaveBeenCalled();
        expect(mockSubmitFn).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'ARCHIVED' }),
        );
      });
  });

  describe('validation', () => {
    test.each([
      [
        'title too long',
        'title-error',
        {
          ...randomPost,
          title: generateRandomString(POST_CONSTRAINTS.MAX_TITLE_LENGTH + 1),
        },
      ],
      [
        'title too short',
        'title-error',
        {
          ...randomPost,
          title: generateRandomString(POST_CONSTRAINTS.MIN_TITLE_LENGTH - 1),
        },
      ],
      [
        'content too long',
        'content-error',
        {
          ...randomPost,
          content: generateRandomString(
            POST_CONSTRAINTS.MAX_CONTENT_LENGTH + 1,
          ),
        },
      ],
      [
        'content too short',
        'content-error',
        {
          ...randomPost,
          content: generateRandomString(
            POST_CONSTRAINTS.MIN_CONTENT_LENGTH - 1,
          ),
        },
      ],
    ])(
      'should show error if %s and selecting form action',
      async (_, errorTestId, postData) => {
        const screen = await renderFeature({
          mode: 'edit',
          postData,
        });
        await screen.getByRole('button', { name: /save/i }).click();
        await expect
          .element(screen.getByTestId(errorTestId))
          .toBeInTheDocument();
      },
    );

    const INVALID_TAG_CHARS = [
      'A',
      'Z',
      'Q', // uppercase
      '_',
      '&',
      '(',
      ')',
      '@',
      '#',
      '$',
      '%',
      '^',
      '*',
      '+',
      '=',
      '/',
      '\\',
      '|',
      ':',
      ';',
      '"',
      "'",
      '<',
      '>',
    ];

    test.each([
      ['too short', generateRandomString(TAG_CONSTRAINTS.MIN_NAME_LENGTH - 1)],
      ['too long', generateRandomString(TAG_CONSTRAINTS.MAX_NAME_LENGTH + 1)],
      ...INVALID_TAG_CHARS.map((char) => [
        `contains invalid character "${char}"`,
        generateRandomString(TAG_CONSTRAINTS.MAX_NAME_LENGTH - 4) + char,
      ]),
    ])('should show error message if entered tag is %s', async (_, tag) => {
      const user = userEvent.setup();
      const screen = await renderFeature({ mode: 'create' });
      const input = screen.getByPlaceholder(/add tag.../i);
      await user.click(input);
      await user.keyboard(tag);

      await expect.element(input).toHaveValue(tag);

      expect(screen.getByTestId('tag-error')).not.toBeInTheDocument();
      await user.keyboard('[Enter]');
      expect(screen.getByTestId(`chip-${tag}`)).not.toBeInTheDocument();
      expect(screen.getByTestId('tag-error')).toBeInTheDocument();
    });

    it('should render error message if apiError param is present', async () => {
      const errorMessage = new Error('Failed to create post');
      const screen = await renderFeature({ apiError: errorMessage });
      const createPostError = screen.getByTestId('post-form-error');
      expect(createPostError).toBeInTheDocument();
      expect(createPostError).toHaveTextContent(errorMessage.message);
    });

    test.each([
      ['title', 'Already taken'],
      ['content', 'Too long'],
      ['tags', 'Invalid tag'],
    ])(
      'should render error details if %s apiError param present with details',
      async (field: string, errorMessage: string) => {
        const errorDetails = createValidationErrorDetailsList([
          { property: field, constraints: { valid: errorMessage } },
        ]);
        const error: ResponseErrorDetails & Error = {
          name: 'Validation',
          status: 400,
          message: 'Failed to create post',
          details: errorDetails,
        };
        const screen = await renderFeature({ apiError: error });
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      },
    );
  });
});
