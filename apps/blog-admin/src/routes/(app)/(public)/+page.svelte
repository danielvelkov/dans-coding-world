<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<section class="relative overflow-hidden bg-(--color-bg-base) py-20 lg:py-32">
	<div
		class="pointer-events-none absolute top-1/4 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--color-accent-glow) blur-3xl"
	></div>

	<div class="relative z-10 mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
		<span
			class="border-(--color-border-emphasis)] mb-6 inline-flex items-center gap-1.5 rounded-full border bg-(--color-accent-subtle) px-3 py-1 text-xs font-medium text-(--color-accent)"
		>
			<span class="h-1.5 w-1.5 animate-pulse rounded-full bg-(--color-accent)"></span>
			Internal Author & Mod Portal
		</span>
		<h1
			class="mx-auto mb-6 max-w-3xl text-4xl leading-tight font-extrabold tracking-tight text-(--color-text-primary) sm:text-6xl"
		>
			Where Great Stories Are <span
				class="bg-linear-to-r from-(--color-accent) to-(--color-accent-hover) bg-clip-text text-transparent"
				>Built</span
			>
		</h1>
		<p
			class="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-(--color-text-secondary) sm:text-xl"
		>
			Welcome to the private engine behind <a
				href="https://[PUBLIC_BLOG_URL]"
				class="bg-linear-to-r from-(--color-accent) to-(--color-accent-hover) bg-clip-text text-transparent"
				>Dan's Coding World</a
			>
			blog. This portal is reserved for authorized creators and administrators to draft, review, and deploy
			content.
		</p>
		<div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
			<a
				href={resolve('/(app)/(public)/login')}
				class="w-full rounded-xl bg-(--color-accent) px-8 py-4 font-medium text-(--color-text-on-accent) shadow-(--color-focus-ring) transition-all hover:-translate-y-0.5 hover:bg-(--color-accent-hover) sm:w-auto"
			>
				Go to Dashboard Sign-in
			</a>
			<a
				href="#apply"
				class="border-(--color-border-default)] w-full rounded-xl border bg-(--color-bg-surface) px-8 py-4 font-medium text-(--color-text-primary) shadow-xs transition-all hover:bg-(--color-bg-surface-hover) sm:w-auto"
			>
				Join the Crew
			</a>
		</div>
	</div>
</section>

<section
	class="border-t border-b border-(--color-border-subtle) bg-(--color-bg-surface-hover) py-12"
>
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<div class="grid grid-cols-1 gap-8 md:grid-cols-3">
			<div
				class="rounded-2xl border border-(--color-border-default) bg-(--color-bg-surface) p-6 shadow-xs"
			>
				<div
					class="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-(--color-accent-subtle) font-bold text-(--color-accent)"
				>
					🔒
				</div>
				<h3 class="mb-2 text-lg font-semibold text-(--color-text-primary)">Restricted Access</h3>
				<p class="text-sm leading-relaxed text-(--color-text-secondary)">
					Content creation tools are reserved exclusively to registered crew accounts.
				</p>
			</div>
			<div
				class="rounded-2xl border border-(--color-border-default) bg-(--color-bg-surface) p-6 shadow-xs"
			>
				<div
					class="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-(--color-accent-subtle) font-bold text-(--color-accent)"
				>
					📝
				</div>
				<h3 class="mb-2 text-lg font-semibold text-(--color-text-primary)">Advanced Editor</h3>
				<p class="text-sm leading-relaxed text-(--color-text-secondary)">
					A distraction-free markdown environment with live preview.
				</p>
			</div>
			<div
				class="rounded-2xl border border-(--color-border-default) bg-(--color-bg-surface) p-6 shadow-xs"
			>
				<div
					class="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-(--color-accent-subtle) font-bold text-(--color-accent)"
				>
					🛡️
				</div>
				<h3 class="mb-2 text-lg font-semibold text-(--color-text-primary)">
					Comment Reports Moderation
				</h3>
				<p class="text-sm leading-relaxed text-(--color-text-secondary)">
					A unified system for reviewing community comments.
				</p>
			</div>
		</div>
	</div>
</section>

<section id="apply" class="relative bg-(--color-bg-base) py-20 lg:py-28">
	<div class="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
		<div
			class="relative overflow-hidden rounded-3xl border border-(--color-border-emphasis) bg-(--color-bg-surface) p-8 shadow-xl sm:p-12"
		>
			<div
				class="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-(--color-accent-glow) blur-2xl"
			></div>

			<h2 class="mb-4 text-3xl font-bold text-(--color-text-primary)">
				Want to write or moderate for us?
			</h2>
			<p class="mx-auto mb-8 max-w-xl text-(--color-text-secondary)">
				We are always on the lookout for other bloggers to share their experience. If you think
				you'd make a great fit for our author team or act as a moderator in the comments, drop us a
				line with your background.
			</p>

			<a
				href="mailto:danielvelkov13@gmail.com?subject=My%20Dan's%20Coding%20World%20application"
				class="inline-flex w-full items-center justify-center rounded-xl bg-(--color-accent) p-4 text-sm font-semibold text-(--color-text-on-accent) shadow-md transition-colors hover:bg-(--color-accent-hover) focus:ring-2 focus:ring-(--color-border-focus) focus:outline-hidden sm:w-auto sm:px-12"
			>
				Send Mail Request
			</a>
		</div>
	</div>
</section>
