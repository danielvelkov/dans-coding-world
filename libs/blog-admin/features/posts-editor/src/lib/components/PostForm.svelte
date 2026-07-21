<script lang="ts" generics="M extends 'edit' | 'create'">
  import { getValidationErrors } from '@dans-coding-world/public-blog-shared-helpers';
  import {
    Button,
    ChipInput,
    DropdownSearch,
    Input,
    SpinnerLoader,
    Toggle,
  } from '@dans-coding-world/blog-admin-ui-common';
  import {
    ERROR_CODES,
    ERROR_MESSAGES,
    POST_CONSTRAINTS,
    TAG_CONSTRAINTS,
    VALIDATION_MESSAGES,
  } from '@dans-coding-world/shared-constants';
  import { toggleValue } from '@dans-coding-world/helpers';
  import Quill from 'quill';
  import { onMount } from 'svelte';
  import DOMPurify from 'dompurify';
  import type {
    CreateSubmitData,
    EditSubmitData,
  } from '../types/submit-data.type.js';
  import type { PostFull } from '@dans-coding-world/post-data-access';
  import type { FormAction } from '../types/form-actions.type.js';
  import PostActionDialog from './PostActionDialog.svelte';

  const ACTIONS_WITH_DIALOG: FormAction[] = ['Archive', 'Publish', 'Unpublish'];

  type Props = {
    mode: M;
    handleSubmit: (data: CreateSubmitData | EditSubmitData) => void;
    apiError?: Error;
    isLoading?: boolean;
    postData?: Pick<
      PostFull,
      'title' | 'content' | 'tags' | 'status' | 'visibility'
    >;
    tagOptions?: { name: string }[];
  };

  let {
    mode,
    handleSubmit,
    apiError,
    isLoading,
    postData,
    tagOptions = [],
  }: Props = $props();

  let title = $state('');
  let content = $state('');
  let isMembersOnly = $state(false);
  let tags: string[] = $state([]);

  let tagsSearchInput: string = $state('');
  const tagsSearchResult = $derived(
    tagsSearchInput.length > 0
      ? tagOptions.filter(({ name }) =>
          name.toLowerCase().includes(tagsSearchInput.toLowerCase()),
        )
      : tagOptions,
  );

  let currentAction: FormAction | null = $state(null);
  let openDialog: boolean = $state(false);

  let errors: Partial<Record<'title' | 'content' | 'tags', string>> = $state(
    {},
  );

  let form: HTMLFormElement;
  let editor: HTMLDivElement;
  let quill: Quill;

  $effect(() => {
    if (postData && mode === 'edit') {
      title = postData.title;
      content = postData.content;
      tags = postData.tags ?? [];
      isMembersOnly = postData.visibility === 'MEMBERS_ONLY';
    }
  });

  onMount(() => {
    quill = new Quill(editor, {
      theme: 'snow',
    });
    quill.on('text-change', () => {
      const html = quill.root.innerHTML
        .replace(/<p><br><\/p>/g, '<br>')
        .replace(/<p><\/p>/g, '<br>');

      if (html.length > POST_CONSTRAINTS.MAX_CONTENT_LENGTH) {
        errors.content = VALIDATION_MESSAGES.posts.contentTooLarge;
      } else {
        content = DOMPurify.sanitize(html);
      }
    });
    if (mode === 'edit' && postData?.content) {
      quill.clipboard.dangerouslyPasteHTML(
        DOMPurify.sanitize(postData.content),
      );
    }
  });

  $effect(() => {
    if (apiError) {
      const apiErrors = getValidationErrors(apiError, [
        'title',
        'content',
        'tags',
      ]);
      if (Object.keys(apiErrors).length > 0) {
        errors = { ...apiErrors };
      }
    }
  });

  function validateForm(): boolean {
    errors = {};
    const nativeValid = form.reportValidity();

    const newErrors: typeof errors = {};

    if (!title || title.trim().length < POST_CONSTRAINTS.MIN_TITLE_LENGTH) {
      newErrors.title = VALIDATION_MESSAGES.minLength(
        POST_CONSTRAINTS.MIN_TITLE_LENGTH,
      );
    } else if (title.trim().length > POST_CONSTRAINTS.MAX_TITLE_LENGTH) {
      newErrors.title = VALIDATION_MESSAGES.maxLength(
        POST_CONSTRAINTS.MAX_TITLE_LENGTH,
      );
    }

    const contentText = quill.getText();

    if (
      !contentText ||
      contentText.trim().length < POST_CONSTRAINTS.MIN_CONTENT_LENGTH
    ) {
      newErrors.content = VALIDATION_MESSAGES.minLength(
        POST_CONSTRAINTS.MIN_CONTENT_LENGTH,
      );
    } else if (content.trim().length > POST_CONSTRAINTS.MAX_CONTENT_LENGTH) {
      newErrors.content = VALIDATION_MESSAGES.posts.contentTooLarge;
    }

    errors = { ...errors, ...newErrors };

    return nativeValid && Object.keys(newErrors).length === 0;
  }

  export function reset() {
    errors = {};
    currentAction = null;
    openDialog = false;
  }
</script>

<div class="md:flex md:gap-10">
  <form
    bind:this={form}
    onsubmit={(e) => {
      e.preventDefault();
    }}
    class="flex flex-1/5 flex-col gap-5"
  >
    <label for="title" class="text-sm font-semibold">Title</label>
    <Input
      bind:value={title}
      id="title"
      name="title"
      maxlength={POST_CONSTRAINTS.MAX_TITLE_LENGTH}
    />
    {#if errors.title}
      <span data-testid="title-error" class="text-sm text-(--color-error)">
        <i class="fa fa-warning"></i>
        {' ' + errors.title}</span
      >
    {/if}

    <label for="content" class="text-sm font-semibold">Content</label>
    <div
      class="flex flex-col h-[30vh] w-auto mb-5 md:mb-5 border border-(--color-border-default)
      focus-within:outline-none focus-within:border-(--color-border-focus)
    shadow-xs focus-within:shadow-sm"
    >
      <div
        data-testid="editor"
        id="content"
        class="bg-(--color-bg-elevated)"
        bind:this={editor}
      ></div>
    </div>
    {#if errors.content}
      <span data-testid="content-error" class="text-sm text-(--color-error)">
        <i class="fa fa-warning"></i>
        {' ' + errors.content}</span
      >
    {/if}

    <label for="tags" class="text-sm font-semibold">Tags</label>
    <DropdownSearch
      options={tagsSearchResult.map((t) => ({
        label: `#${t.name}`,
        value: t.name,
      }))}
      placeHolder="Search tag..."
      lastOptionRef={null}
      handleSelect={(tag) => {
        tags = toggleValue(tags, tag);
      }}
      handleSearch={(searchKeyword) => {
        tagsSearchInput = searchKeyword;
      }}
      selected={tags.map((value) => ({
        value,
      }))}
      searchInputMaxLength={TAG_CONSTRAINTS.MAX_NAME_LENGTH}
    ></DropdownSearch>
    <ChipInput
      bind:values={tags}
      placeholder="Add tag..."
      validate={(val) => {
        errors.tags = undefined;
        if (val.length < TAG_CONSTRAINTS.MIN_NAME_LENGTH)
          errors.tags = VALIDATION_MESSAGES.minLength(
            TAG_CONSTRAINTS.MIN_NAME_LENGTH,
          );
        if (val.length > TAG_CONSTRAINTS.MAX_NAME_LENGTH)
          errors.tags = VALIDATION_MESSAGES.maxLength(
            TAG_CONSTRAINTS.MAX_NAME_LENGTH,
          );
        if (!TAG_CONSTRAINTS.NAME_PATTERN.test(val))
          errors.tags = VALIDATION_MESSAGES.tags.invalid;
        return errors.tags === undefined;
      }}
    ></ChipInput>
    {#if errors.tags}
      <span class="text-sm text-(--color-error)">
        <i class="fa fa-warning"></i>
        {' ' + errors.tags}</span
      >
    {/if}

    <label for="visibility" class="text-sm font-semibold">Members-only</label>
    <Toggle id="visibility" bind:checked={isMembersOnly}></Toggle>

    {#if mode === 'edit' && postData}
      <div class="text-sm font-semibold">
        <span class="mr-1">Current Status:</span>
        <span
          class="inline-flex items-center px-2.5 py-0.5 rounded-full
      text-xs font-semibold bg-(--color-info-bg) text-(--color-info)
      border border-(--color-info-border) w-fit"
        >
          {postData?.status.toUpperCase()}
        </span>
      </div>
    {/if}

    <!-- Create mode actions -->
    {#if mode === 'create'}
      <div class="inline-flex gap-0.5">
        {@render Action('Save as Draft', () =>
          handleSubmit({
            title,
            content,
            tags,
            isDraft: true,
            isMembersOnly,
          } as CreateSubmitData),
        )}

        {@render Action('Publish', () => {
          openDialog = true;
        })}
      </div>
    {/if}

    <!-- Edit mode Actions -->
    {#if mode === 'edit'}
      <div class="inline-flex gap-0.5">
        {@render Action('Save', () =>
          handleSubmit({
            title,
            content,
            tags,
            status: postData?.status ?? 'DRAFT',
            visibility: isMembersOnly ? 'MEMBERS_ONLY' : 'PUBLIC',
          } as EditSubmitData),
        )}

        {#if postData && postData.status === 'PUBLISHED'}
          {@render Action('Unpublish', () => {
            openDialog = true;
          })}
        {/if}

        {#if postData && postData.status !== 'PUBLISHED'}
          {@render Action('Publish', () => {
            openDialog = true;
          })}
        {/if}

        {#if postData && postData.status !== 'ARCHIVED'}
          {@render Action('Archive', () => {
            openDialog = true;
          })}
        {/if}
      </div>
    {/if}

    {#if apiError && !errors.title && !errors.content && !errors.tags && apiError.message !== ERROR_MESSAGES[ERROR_CODES.VALIDATION.VALIDATION_ERROR]}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        data-testid="post-form-error"
      >
        <span class="text-sm text-(--color-error) sm:truncate">
          <i class="fa fa-warning"></i>
          {' ' +
            (apiError.message ?? 'Something went wrong. Please try again.')}
        </span>
      </div>
    {/if}
  </form>

  <!-- Preview -->
  <div
    class="mt-5 flex flex-1 flex-col gap-5 relative min-w-0 overflow-hidden pt-5"
  >
    <h2
      class="text-xl font-bold absolute top-1 border rounded-md left-4 bg-(--color-bg-base) px-2"
    >
      Preview
    </h2>
    <div class="rounded border p-4 min-h-50 w-full bg-(--color-bg-elevated)">
      <output data-testid="preview" class="wrap-break-word break-all block">
        {@html DOMPurify.sanitize(content)}
      </output>
    </div>
  </div>
</div>

{#if openDialog}
  {#if currentAction === 'Publish'}
    <PostActionDialog
      modalTitle="Confirm Publish"
      leadingMessage={'You are about to publish this post to the public feed:'}
      supportingMessage={'Other users will instantly be able to read and view it'}
      {isLoading}
      postTitle={title}
      onClose={() => {
        openDialog = false;
        currentAction = null;
      }}
      onConfirm={() => {
        if (mode === 'create')
          handleSubmit({
            title,
            content,
            tags,
            isDraft: false,
            isMembersOnly,
          } as CreateSubmitData);
        else
          handleSubmit({
            title,
            content,
            tags,
            status: 'PUBLISHED',
            visibility: isMembersOnly ? 'MEMBERS_ONLY' : 'PUBLIC',
          } as EditSubmitData);
      }}
    ></PostActionDialog>
  {:else if currentAction === 'Archive'}
    <PostActionDialog
      modalTitle="Archive Post"
      leadingMessage={'You are about to archive this post:'}
      supportingMessage={`This will hide the post from the public and set its status to Archived.
       It will remain in your history for future reference`}
      {isLoading}
      postTitle={title}
      onClose={() => {
        openDialog = false;
        currentAction = null;
      }}
      onConfirm={() => {
        handleSubmit({
          title,
          content,
          tags,
          status: 'ARCHIVED',
          visibility: isMembersOnly ? 'MEMBERS_ONLY' : 'PUBLIC',
        } as EditSubmitData);
      }}
    ></PostActionDialog>
  {:else if currentAction === 'Unpublish'}
    <PostActionDialog
      modalTitle="Move Post to drafts"
      leadingMessage={'You are about to unpublish this post:'}
      supportingMessage={`This will hide the post from the public and change it back to draft.`}
      {isLoading}
      postTitle={title}
      onClose={() => {
        openDialog = false;
        currentAction = null;
      }}
      onConfirm={() => {
        handleSubmit({
          title,
          content,
          tags,
          status: 'DRAFT',
          visibility: isMembersOnly ? 'MEMBERS_ONLY' : 'PUBLIC',
        } as EditSubmitData);
      }}
    ></PostActionDialog>
  {/if}
{/if}

{#snippet Action(name: FormAction, onclick: () => void)}
  <Button
    type="button"
    class="flex-1 flex flex-col items-center rounded-l-none
     rounded-r-none first:rounded-l-lg last:rounded-r-lg"
    onclick={() => {
      if (validateForm()) {
        currentAction = name;
        onclick();
      } else currentAction = null;
    }}
    disabled={isLoading}
  >
    {#if isLoading && currentAction === name && !ACTIONS_WITH_DIALOG.includes(name)}
      <SpinnerLoader></SpinnerLoader>
    {:else}
      {name}
    {/if}
  </Button>
{/snippet}

<style>
  [data-testid='preview'] {
    :global(ol),
    :global(ul) {
      list-style: revert;
      margin: revert;
      padding: revert;
    }

    :global(li) {
      display: revert;
      margin: revert;
      padding: revert;
    }

    :global(p) {
      display: revert;
      margin: revert;
      padding: revert;
    }

    :global(br) {
      display: revert;
      margin: revert;
      padding: revert;
    }

    :global(a) {
      text-decoration: revert;
      color: revert;
    }
  }
</style>
