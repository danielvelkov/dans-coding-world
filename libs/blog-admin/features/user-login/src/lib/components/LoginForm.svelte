<script lang="ts">
  import {
    Button,
    Input,
    SpinnerLoader,
  } from '@dans-coding-world/blog-admin-ui-common';
  import {
    ERROR_CODES,
    ERROR_MESSAGES,
  } from '@dans-coding-world/shared-constants';
  import { getValidationErrors } from '@dans-coding-world/public-blog-shared-helpers';

  interface Props {
    handleSubmit: (email: string, password: string) => void;
    error?: Error;
    isLoading?: boolean;
  }

  let email = $state('');
  let password = $state('');
  let errors: Partial<Record<'email' | 'password', string>> = $state({});

  const { handleSubmit, error, isLoading }: Props = $props();

  $effect(() => {
    if (error) {
      const apiErrors = getValidationErrors(error, ['email', 'password']);
      if (Object.keys(apiErrors).length > 0) {
        errors = { ...apiErrors };
      }
    }
  });

  const handleInvalid = (
    event: Event & { currentTarget: EventTarget & HTMLInputElement },
  ) => {
    const { name, validationMessage } = event.currentTarget;

    if (name === 'email') errors.email = validationMessage;
    else errors.password = validationMessage;
  };
</script>

<form
  onsubmit={(e) => {
    e.preventDefault();
    handleSubmit(email, password);
  }}
  class="m-auto py-8 px-10 border rounded-md flex flex-col gap-6"
>
  <h1
    class="text-2xl/7 font-bold sm:truncate sm:text-3xl sm:tracking-tight m-4 text-center"
  >
    Login
  </h1>
  <div class="flex flex-col gap-4">
    <label for="email" class="text-sm font-semibold">Email</label>
    <Input
      id="email"
      name="email"
      type="email"
      placeholder="john.doe@gmail.com"
      oninput={() => (errors.email = '')}
      bind:value={email}
      oninvalid={handleInvalid}
      required
    />
    {#if errors.email}
      <span class="text-(--color-error) text-sm sm:truncate">
        <i class="fa fa-warning"></i>
        {' ' + errors.email}</span
      >
    {/if}
  </div>
  <div class="flex flex-col gap-4">
    <label for="pwd" class="text-sm font-semibold">Password</label>
    <Input
      id="pwd"
      type="password"
      name="password"
      placeholder="••••••••"
      oninput={() => (errors.password = '')}
      bind:value={password}
      oninvalid={handleInvalid}
      required
    />
    {#if errors.password}
      <span class="text-(--color-error) text-sm sm:truncate">
        <i class="fa fa-warning"></i>
        {' ' + errors.password}</span
      >
    {/if}
  </div>
  {#if error && !errors.email && !errors.password && error.message !== ERROR_MESSAGES[ERROR_CODES.VALIDATION.VALIDATION_ERROR]}
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      data-testid="login-error"
    >
      <span class="text-(--color-error) sm:truncate text-sm">
        {error.message ?? 'Unable to login. Please try again.'}
      </span>
    </div>
  {/if}

  <Button
    data-testid="login-button"
    class="flex flex-col items-center"
    disabled={isLoading}
    type="submit"
  >
    {#if isLoading}
      <SpinnerLoader loadingMessage={'Logging in... Please wait... '}
      ></SpinnerLoader>
    {:else}
      Login
    {/if}
  </Button>
</form>

<!-- TODO: remove -->
<div class="flex flex-col">
  <span class="uppercase font-extrabold">DEBUG ACTIONS - Login</span>
  <a onclick={() => handleSubmit('admin123@gmail.com', 'Admin123@')}>as admin</a
  >
  <a onclick={() => handleSubmit('author123@gmail.com', 'Author123@')}
    >as author</a
  >
  <a onclick={() => handleSubmit('moderator123@gmail.com', 'Moderator123@')}
    >as moderator</a
  >
  <a onclick={() => handleSubmit('user123@gmail.com', 'User123@')}>as user</a>
</div>
