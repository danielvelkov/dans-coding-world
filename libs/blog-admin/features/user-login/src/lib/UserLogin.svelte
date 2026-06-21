<script lang="ts">
  import { createLoginMutation } from '@dans-coding-world/blog-admin-data-access-operations';
  import LoginForm from './components/LoginForm.svelte';

  type User = NonNullable<
    ReturnType<typeof createLoginMutation>['data']
  >['user'];

  interface Props {
    onLogin: (user: User) => void;
  }
  const { onLogin }: Props = $props();

  const loginMutation = $derived(createLoginMutation({ throwOnError: false }));

  const {
    reset,
    mutate,
    error,
    isPending: isLoading,
  } = $derived(loginMutation);
  const user = $derived(loginMutation.data?.user);

  $effect(() => {
    if (user) {
      onLogin(user);
    }
    reset();
  });

  const handleSubmit = async (email: string, password: string) => {
    reset();
    mutate({ email, password });
  };
</script>

<LoginForm {handleSubmit} error={error ?? undefined} {isLoading}></LoginForm>
