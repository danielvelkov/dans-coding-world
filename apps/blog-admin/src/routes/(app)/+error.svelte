<script lang="ts">
	import { page } from '$app/state';
	import { GenericError } from '@dans-coding-world/blog-admin-ui-errors';
</script>

<div class="flex flex-col items-center justify-center bg-(--color-background)">
	<GenericError message={page.error?.message ?? 'Something went wrong'} statusCode={page.status}
	></GenericError>
</div>
