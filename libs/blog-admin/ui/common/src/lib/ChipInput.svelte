<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';
  import Input from './Input.svelte';
  import Chip from './Chip.svelte';

  interface Props extends HTMLInputAttributes {
    values?: string[];
    hint?: string;
    validate?: (val: string) => boolean;
  }

  let {
    values = $bindable(),
    hint = 'Press enter or comma to add tag . Backspace to remove',
    validate,
    ...props
  }: Props = $props();

  let inputValue: string = $state('');

  const addTag = (value: string) => {
    const rawValue = value.trim();
    if (rawValue.length > 0 && !values?.includes(rawValue))
      values = [...(values ?? []), rawValue];
  };

  function handleKey(e: KeyboardEvent & { currentTarget: HTMLInputElement }) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = e.currentTarget.value.replace(',', '');
      if (validate?.(val) ?? true) {
        addTag(val);
        inputValue = '';
      }
    }
    if (e.key === 'Backspace' && !e.currentTarget.value) {
      if (values === undefined) return;
      if (values !== undefined && values.length > 0) {
        values = [...values.slice(0, -1)];
      }
    }
  }
</script>

<div
  class="flex flex-wrap border gap-2 p-1 items-center
    border-(--color-border-default) rounded-md
    bg-(--color-bg-elevated) text-(--color-text-primary)
    placeholder:text-(--color-text-tertiary) transition-all
    focus-within:outline-none focus-within:border-(--color-border-focus)
    shadow-xs focus-within:shadow-sm"
>
  {#each values as value (value)}
    <Chip
      deletable
      onDelete={() => {
        values = values?.filter((v) => v !== value);
      }}>{value}</Chip
    >
  {/each}

  <Input
    {...props}
    bind:value={inputValue}
    onkeydown={handleKey}
    class="flex-1 w-full bg-transparent placeholder:text-(--color-text-tertiary)
   text-(--color-text-primary) text-sm border-none shadow-none!
   px-3 py-1.5  {props.class}"
  />
</div>

{#if hint}
  <p class="-mt-2 text-sm text-(--color-text-tertiary)">{hint}</p>
{/if}
