<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';
  import type { HTMLSelectAttributes } from 'svelte/elements';

  interface Props<T> extends HTMLSelectAttributes {
    items: { label: string; value: T }[];
    option?: Snippet<[label: string, value: T]>;
    collapsedHeight?: string;
  }

  const {
    items,
    option,
    class: className,
    collapsedHeight = '3em',
    ...restProps
  }: Props<T> = $props();

  let wrapper: HTMLDivElement | undefined = $state();
  let selectEl: HTMLSelectElement | undefined = $state();

  let expandedHeight = $state('auto');
  let isOpen = $state(false);
  let isClosing = $state(false);

  function measure() {
    const first = selectEl?.querySelector('option');
    if (!wrapper || !first) return;

    const rect = first.getBoundingClientRect();
    const style = getComputedStyle(first);
    const h =
      rect.height +
      parseFloat(style.marginTop) +
      parseFloat(style.marginBottom);

    expandedHeight = `${h * items.length}px`;
  }

  $effect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  });
  function open() {
    isClosing = false;
    isOpen = true;
  }

  function close() {
    if (!isOpen) return;

    isClosing = true;
  }

  function onTransitionEnd() {
    if (isClosing) {
      isClosing = false;
      isOpen = false;
    }
  }
</script>

<div class="relative w-fit {className ?? ''}">
  <div
    bind:this={wrapper}
    class="select-wrapper {isOpen ? 'open' : ''} {isClosing ? 'closing' : ''}"
    style={`--collapsed-height: ${collapsedHeight}; --expanded-height: ${expandedHeight}`}
    onmouseenter={open}
    onmouseleave={close}
    ontransitionend={onTransitionEnd}
    tabindex="0"
    aria-controls={selectEl?.id}
    aria-expanded={isOpen}
    role="combobox"
  >
    <select
      bind:this={selectEl}
      id={`multi-select-${Math.random() * 10000}`}
      {...restProps}
      multiple
      title="Hold Ctrl (Cmd on Mac) to select multiple"
      class="native-select font-medium text-gray-700
       disabled:cursor-not-allowed border border-gray-200
        bg-white shadow-sm transition-all duration-200 focus:ring-2
                   hover:bg-gray-100
                   focus:bg-blue-600 focus:text-white
                   checked:bg-blue-50 checked:text-blue-700
"
    >
      {#each items as { value, label }}
        {#if option}
          {@render option(label, value)}
        {:else}
          <option
            value={typeof value === 'object' ? JSON.stringify(value) : value}
            class="option-row"
          >
            <span class="line-clamp-1">
              {label}
            </span>
          </option>
        {/if}
      {/each}
    </select>
  </div>
</div>

<style>
  .select-wrapper {
    position: relative;
    overflow: hidden;
    height: var(--collapsed-height);
    transition: 0.4s height;
  }

  /* OPEN state */
  .select-wrapper.open {
    width: 100%;
    position: absolute;
    z-index: 20;
    top: calc(var(--collapsed-height) * -0.5);
    height: var(--expanded-height);
  }

  /* CLOSING state - trigger the transition back */
  .select-wrapper.closing {
    height: var(--collapsed-height);
    position: absolute; /* Keep absolute positioning during collapse */
    z-index: 20;
  }

  .native-select {
    appearance: base-select;
    width: 100%;
    height: 100%;
    border: 1px solid #d1d5db;
    background: white;
    overflow: hidden;
  }

  .option-row {
    padding: 0.5rem 1rem;
  }

  .option-row:hover {
    background: #f3e8ff;
  }
  option::checkmark {
    order: 1;
    margin-left: auto;
    content: '✓';
  }
</style>
