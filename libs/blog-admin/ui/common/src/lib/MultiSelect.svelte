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

  function onTransitionEnd(e: TransitionEvent) {
    if (isClosing && e.propertyName === 'height') {
      isClosing = false;
      isOpen = false;
    }
  }
</script>

<div
  class="relative w-fit {className ?? ''}"
  style="height: {collapsedHeight};"
>
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
      class="native-select font-medium text-(--color-text-primary) rounded-sm
       disabled:cursor-not-allowed border border-(--color-border-default)
       bg-(--color-bg-surface) shadow-xs transition-all duration-200
       focus:ring-2 focus:ring-(--color-focus-ring) focus:border-(--color-border-focus)
       hover:bg-(--color-bg-surface-hover)
       focus:bg-(--color-accent) focus:text-(--color-text-on-accent)
       checked:bg-(--color-accent-subtle) checked:text-(--color-accent)
"
    >
      {#each items as { value, label } (label)}
        {#if option}
          {@render option(label, value)}
        {:else}
          <option
            value={typeof value === 'object' ? JSON.stringify(value) : value}
            class="option-row p-2 text-sm text-(--color-text-primary)
             checked:bg-(--color-accent-subtle) checked:text-(--color-accent)"
          >
            <span class="line-clamp-1">
              {label}
            </span>
          </option>
        {/if}
      {/each}
    </select>
  </div>
  <i
    class="fa fa-chevron-down chevron-hint text-(--color-text-tertiary)
     absolute right-1.5 top-[35%] z-10"
    class:hidden={isOpen || isClosing}
    aria-hidden="true"
  ></i>
</div>

<style>
  .select-wrapper {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    overflow: hidden;
    height: var(--collapsed-height);
    transition:
      height 0.3s cubic-bezier(0.4, 0, 0.2, 1),
      top 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 10;
  }

  .select-wrapper.open {
    z-index: 20;
    top: calc(
      var(--collapsed-height) * -0.1
    ); /* Slight elevation offset if needed, or set to 0 */
    height: var(--expanded-height);
  }

  .select-wrapper.closing {
    height: var(--collapsed-height);
    top: 0;
    z-index: 20;
  }

  .native-select {
    appearance: base-select;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  .option-row {
    padding: 0.5rem 1rem;
  }

  option::checkmark {
    order: 1;
    margin-left: auto;
    content: '✓';
  }

  .chevron-hint {
    pointer-events: none;
    transition: opacity 0.2s;
  }

  .chevron-hint.hidden {
    opacity: 0;
  }
</style>
