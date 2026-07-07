<script lang="ts">
  import DotsLoader from './DotsLoader.svelte';
  import SpinnerLoader from './SpinnerLoader.svelte';
  import { slide } from 'svelte/transition';

  interface SelectOption {
    value: string;
    label: string;
  }

  interface Props {
    options?: SelectOption[];
    isLoadingOptions?: boolean;
    isSearching?: boolean;
    selected?: Pick<SelectOption, 'value'>;
    handleSelect?: (value: string) => void;
    searchInput?: string;
    placeHolder?: string;
    handleSearch?: (value: string) => void;
    error?: string;
    searchInputMaxLength?: number;
    lastOptionRef: Element | null;
  }

  let isOpen = $state(false);

  let {
    options = [],
    isLoadingOptions,
    isSearching,
    selected,
    handleSelect,
    placeHolder,
    searchInput,
    handleSearch,
    error,
    searchInputMaxLength = 50,
    lastOptionRef = $bindable(),
  }: Props = $props();

  const randomId = `dropdown-search-${Math.random() * 1000}`;

  const optionClassName = (
    option: SelectOption,
    index: number,
    isSelected: boolean,
  ) => {
    isSelected ||= selected?.value === option.value;

    return `relative cursor-pointer select-none py-2.5 px-4 text-sm text-left w-full transition-colors block
      ${options.length - 1 === index && !isLoadingOptions ? 'rounded-b-md' : ''} 
      ${
        isSelected
          ? 'bg-(--color-accent-subtle) text-(--color-accent) font-semibold'
          : 'text-(--color-text-primary) hover:bg-(--color-bg-surface-hover)'
      } 
      active:bg-(--color-bg-surface-active) mb-0.5 last:mb-0`;
  };
</script>

<div class="relative grow w-full">
  <!-- Interactive Trigger Container -->
  <div class="relative w-full">
    <search>
      <label for={randomId} class="sr-only">Search for:</label>
      <div class="relative flex items-center">
        <i
          class="fa fa-search absolute left-3 text-sm text-(--color-text-tertiary) pointer-events-none"
        ></i>
        <input
          type="search"
          maxlength={searchInputMaxLength}
          id={randomId}
          onfocus={() => (isOpen = true)}
          oninput={(e: Event & { currentTarget: HTMLInputElement }) => {
            handleSearch?.(e.currentTarget.value);
          }}
          value={searchInput}
          placeholder={placeHolder ?? 'Search...'}
          class="w-full pl-9 pr-10 py-2 text-sm border
          border-(--color-border-default) rounded-md
          bg-(--color-bg-surface) text-(--color-text-primary)
          placeholder:text-(--color-text-tertiary) transition-all
          focus:outline-hidden focus:border-(--color-border-focus)
          focus:ring-2 focus:ring-(--color-focus-ring) shadow-xs"
        />
        {#if isOpen}
          <button
            type="button"
            onclick={() => (isOpen = false)}
            class="absolute right-3 p-1 rounded-sm text-(--color-text-tertiary)
            hover:text-(--color-text-secondary)
            hover:bg-(--color-bg-surface-hover) transition-colors"
            aria-label="Close dropdown"
          >
            <i class="fa fa-times text-xs"></i>
          </button>
        {:else}
          <i
            class="fa fa-chevron-down absolute right-3
             text-xs text-(--color-text-tertiary) pointer-events-none"
          ></i>
        {/if}
      </div>
    </search>
  </div>

  <!-- Clickaway Overlay Guard -->
  {#if isOpen}
    <!-- space-hidden backdrop so clicking outside closes it seamlessly -->
    <button
      tabindex="-1"
      type="button"
      class="fixed inset-0 z-40 cursor-default focus:outline-hidden"
      onclick={() => {
        isOpen = false;
      }}
      aria-label="Close overlay"
    ></button>

    <!-- Dropdown Menu Options Panel -->
    <div
      class="absolute left-0 right-0 z-50 overflow-y-auto mt-1.5 max-h-50 rounded-md border border-(--color-border-subtle) bg-(--color-bg-surface) shadow-lg p-1 focus:outline-hidden"
      role="listbox"
      data-testid="dropdown-search-listbox"
      transition:slide={{ duration: 180 }}
    >
      {#if error}
        <div
          class="p-4 text-sm text-center text-(--color-error) bg-(--color-error-bg) rounded-md m-1"
        >
          <i class="fa fa-exclamation-circle mr-2"></i>{error}
        </div>
      {:else if isSearching || (isLoadingOptions && options.length === 0)}
        <div
          class="flex justify-center items-center py-2 border-t border-(--color-border-subtle) rounded-b-md bg-(--color-bg-surface-hover)"
        >
          <DotsLoader loadingMessage="Searching..." />
        </div>
      {:else if options.length > 0}
        {#each options as { value, label }, index (label)}
          {@const isSelected = value === selected?.value}
          <button
            bind:this={lastOptionRef}
            type="button"
            role="option"
            aria-selected={isSelected}
            class={optionClassName({ value, label }, index, isSelected)}
            onclick={() => {
              handleSelect?.(value);
              isOpen = false;
            }}
          >
            <span class="line-clamp-1" title={label}>
              {label}
            </span>
          </button>
        {/each}

        {#if isLoadingOptions}
          <div
            class="flex justify-center items-center py-2 border-t border-(--color-border-subtle) rounded-b-md bg-(--color-bg-surface-hover)"
          >
            <SpinnerLoader loadingMessage="Loading more options..." />
          </div>
        {/if}
      {:else}
        <div
          class="p-4 text-sm text-center text-(--color-text-secondary) italic"
        >
          No matches found
        </div>
      {/if}
    </div>
  {/if}
</div>
