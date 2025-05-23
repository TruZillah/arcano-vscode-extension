# Testing Runes-Migrated Components

This document outlines the test strategy and provides example test cases for components that have been migrated from legacy Svelte syntax to the new Svelte Runes API.

## Testing Strategy

Our testing approach for migrated components follows a comprehensive multi-layer strategy:

1. **Unit Tests**: Testing individual components in isolation
   - Test props, slots, events, and state management
   - Verify reactive behavior works as expected
   - Test lifecycle behaviors

2. **Integration Tests**: Testing components working together
   - Verify parent-child component relationships
   - Test context propagation
   - Test complex interactions between components

3. **Visual Regression Tests**: Ensuring UI appearance is preserved
   - Compare screenshots before and after migration
   - Test different component states and variations

4. **End-to-End Tests**: Testing in a real browser environment
   - Verify entire features built with migrated components
   - Test user interactions like clicks, form submissions, etc.

## Testing Frameworks

For our component tests, we're using the following tools:

- **Vitest**: For fast unit and integration tests
- **Testing Library**: For component rendering and interactions
- **Playwright**: For end-to-end and visual regression tests

## Test Examples

Below are examples demonstrating how to test components that have been migrated to the Svelte Runes API:

### 1. Unit Tests with Vitest + Testing Library

These tests verify that individual components behave correctly after migration.

#### Button Component Unit Test

```ts
// src/lib/components/ui/Button.test.ts
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import Button from '$lib/components/ui/Button.svelte';

describe('Button Component (Runes Version)', () => {
  it('renders with default props', () => {
    const { getByRole } = render(Button, { props: { label: 'Test Button' } });
    const button = getByRole('button');
    
    expect(button).toBeTruthy();
    expect(button.textContent).toContain('Test Button');
    expect(button.getAttribute('type')).toBe('button');
    expect(button.classList.contains('electric-blue')).toBe(true);
  });

  it('handles clicks correctly', async () => {
    const handleClick = vi.fn();
    const { getByRole } = render(Button, { 
      props: { 
        label: 'Click Me',
        onClick: handleClick
      } 
    });
    
    const button = getByRole('button');
    await fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies correct classes based on props', () => {
    const { getByRole } = render(Button, { 
      props: { 
        color: 'deep-navy',
        size: 'lg',
        variant: 'outline',
        fullWidth: true,
        disabled: true
      } 
    });
    
    const button = getByRole('button');
    expect(button.classList.contains('deep-navy')).toBe(true);
    expect(button.classList.contains('size-lg')).toBe(true);
    expect(button.classList.contains('btn-outline')).toBe(true);
    expect(button.classList.contains('w-full')).toBe(true);
    expect(button.disabled).toBe(true);
  });

  it('respects keyboard shortcuts', async () => {
    const handleClick = vi.fn();
    const { getByRole } = render(Button, { 
      props: { 
        label: 'Shortcut Button',
        shortcut: 'k',
        onClick: handleClick
      } 
    });
    
    // Simulate pressing the shortcut key
    await fireEvent.keyDown(window, { key: 'k' });
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('supports magical glow effect', () => {
    const { container } = render(Button, { 
      props: { 
        label: 'Glowy Button',
        magicalGlow: true
      } 
    });
    
    // Check if MagicalGlow component is rendered
    expect(container.querySelector('.magical-glow')).toBeTruthy();
  });

  // Testing reactivity with props updates
  it('updates when props change', async () => {
    const { getByRole, rerender } = render(Button, { 
      props: { label: 'Initial Text', disabled: false } 
    });
    
    const button = getByRole('button');
    expect(button.textContent).toContain('Initial Text');
    expect(button.disabled).toBe(false);
    
    // Update props
    await rerender({ label: 'Updated Text', disabled: true });
    
    expect(button.textContent).toContain('Updated Text');
    expect(button.disabled).toBe(true);
  });
});
```

#### Card Component Unit Test

```ts
// src/lib/components/ui/Card.test.ts
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import Card from '$lib/components/ui/Card.svelte';
import CardHeader from '$lib/components/ui/CardHeader.svelte';
import CardTitle from '$lib/components/ui/CardTitle.svelte';
import CardContent from '$lib/components/ui/CardContent.svelte';

describe('Card Component (Runes Version)', () => {
  it('renders with default props', () => {
    const { container } = render(Card);
    const card = container.querySelector('.card');
    
    expect(card).toBeTruthy();
    expect(card.classList.contains('bg-white')).toBe(true);
  });

  it('applies color theme correctly', () => {
    const { container } = render(Card, { props: { color: 'electric-blue' } });
    const card = container.querySelector('.card');
    
    expect(card.classList.contains('bg-white')).toBe(true);
    // Check border color for outline variant
    const rerender = render(Card, { 
      props: { 
        color: 'electric-blue',
        variant: 'outline' 
      } 
    });
    
    const outlineCard = rerender.container.querySelector('.card');
    expect(outlineCard.classList.contains('border-electric-blue')).toBe(true);
  });

  it('renders with hover effects when hoverable=true', () => {
    const { container } = render(Card, { props: { hoverable: true } });
    const card = container.querySelector('.card');
    
    expect(card.classList.contains('hover:shadow-lg')).toBe(true);
    expect(card.classList.contains('hover:-translate-y-1')).toBe(true);
  });

  it('renders children properly', () => {
    const { getByText } = render(Card, {
      props: {},
      slots: {
        default: `
          <CardHeader>
            <CardTitle>Test Title</CardTitle>
          </CardHeader>
          <CardContent>Test Content</CardContent>
        `
      },
      components: {
        CardHeader,
        CardTitle,
        CardContent
      }
    });
    
    expect(getByText('Test Title')).toBeTruthy();
    expect(getByText('Test Content')).toBeTruthy();
  });

  it('renders magical glow effect when enabled', () => {
    const { container } = render(Card, { props: { magicalGlow: true } });
    
    // Check if MagicalGlow component is rendered
    expect(container.querySelector('.magical-glow')).toBeTruthy();
  });

  // Test dynamic updates to derived values
  it('updates classes when props change', async () => {
    const { container, rerender } = render(Card, { 
      props: { padding: 'md', variant: 'default' } 
    });
    
    const card = container.querySelector('.card');
    expect(card.classList.contains('p-4')).toBe(true);
    
    // Update props
    await rerender({ padding: 'lg', variant: 'elevated' });
    
    expect(card.classList.contains('p-6')).toBe(true);
    expect(card.classList.contains('shadow-md')).toBe(true);
  });
});
```

### 2. Integration Tests for Component Combinations

These tests verify that migrated components work correctly together:

```ts
// src/lib/components/ui/CardGroup.test.ts
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { CardIntegrationTest } from './CardIntegrationTest.svelte';

// This is a test harness component that combines Card components
// with other related components to test their interactions

describe('Card Component Integration (Runes Version)', () => {
  it('interacts correctly with other card components', async () => {
    const { getByText, queryByText } = render(CardIntegrationTest);
    
    // Check initial rendering
    expect(getByText('Card Title')).toBeTruthy();
    expect(getByText('Card Description')).toBeTruthy();
    expect(getByText('Card Content')).toBeTruthy();
    expect(getByText('Show More')).toBeTruthy();
    
    // Initially, extra content should be hidden
    expect(queryByText('Extra Content')).toBeNull();
    
    // Click to show more content
    await fireEvent.click(getByText('Show More'));
    
    // Now extra content should be visible
    expect(getByText('Extra Content')).toBeTruthy();
    
    // Button text should have changed
    expect(getByText('Show Less')).toBeTruthy();
    expect(queryByText('Show More')).toBeNull();
  });
});
```

Example of the integration test component:

```svelte
<!-- src/lib/components/ui/CardIntegrationTest.svelte -->
<script lang="ts">
  import Card from './Card.svelte';
  import CardHeader from './CardHeader.svelte';
  import CardTitle from './CardTitle.svelte';
  import CardDescription from './CardDescription.svelte';
  import CardContent from './CardContent.svelte';
  import CardFooter from './CardFooter.svelte';
  import Button from './Button.svelte';
  
  let showExtra = $state(false);
  
  function toggleExtra() {
    showExtra = !showExtra;
  }
</script>

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card Description</CardDescription>
  </CardHeader>
  <CardContent>
    Card Content
    
    {#if showExtra}
      <div class="mt-4 p-3 bg-gray-100 rounded">
        Extra Content
      </div>
    {/if}
  </CardContent>
  <CardFooter>
    <Button onClick={toggleExtra}>
      {showExtra ? 'Show Less' : 'Show More'}
    </Button>
  </CardFooter>
</Card>
```

### 3. Visual Regression Tests with Playwright

These tests verify that the visual appearance of components is preserved after migration:

```ts
// tests/visual/card.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Card Component Visual Tests', () => {
  test('default card appearance', async ({ page }) => {
    await page.goto('/component-test/card-default');
    
    // Take a screenshot and compare with baseline
    await expect(page.locator('.card')).toHaveScreenshot('card-default.png');
  });
  
  test('card with color variants', async ({ page }) => {
    await page.goto('/component-test/card-variants');
    
    // Take screenshots of different card variants
    await expect(page.locator('.card-electric-blue')).toHaveScreenshot('card-electric-blue.png');
    await expect(page.locator('.card-deep-navy')).toHaveScreenshot('card-deep-navy.png');
    await expect(page.locator('.card-silver-gray')).toHaveScreenshot('card-silver-gray.png');
  });
  
  test('card with magical glow effect', async ({ page }) => {
    await page.goto('/component-test/card-magical');
    
    // Take screenshot of card with glow effect
    await expect(page.locator('.card-magical')).toHaveScreenshot('card-magical-glow.png');
  });
});
```

### 4. End-to-End Tests for Full Features

These tests verify that entire features built with migrated components work correctly:

```ts
// tests/e2e/accordion.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Accordion Component E2E Tests', () => {
  test('accordion expands and collapses correctly', async ({ page }) => {
    await page.goto('/component-test/accordion');
    
    // Initially only headers should be visible
    await expect(page.locator('.accordion-header').first()).toBeVisible();
    await expect(page.locator('.accordion-content').first()).not.toBeVisible();
    
    // Click on first header to expand
    await page.locator('.accordion-header').first().click();
    
    // Content should now be visible
    await expect(page.locator('.accordion-content').first()).toBeVisible();
    
    // Click again to collapse
    await page.locator('.accordion-header').first().click();
    
    // Content should be hidden again
    await expect(page.locator('.accordion-content').first()).not.toBeVisible();
  });
  
  test('accordion keyboard navigation works', async ({ page }) => {
    await page.goto('/component-test/accordion');
    
    // Focus first header
    await page.locator('.accordion-header').first().focus();
    
    // Press Enter to expand
    await page.keyboard.press('Enter');
    await expect(page.locator('.accordion-content').first()).toBeVisible();
    
    // Navigate with arrow keys and test keyboard accessibility
    await page.keyboard.press('ArrowDown');
    
    // Second header should be focused
    await expect(page.locator('.accordion-header').nth(1)).toBeFocused();
    
    // Press Space to expand second section
    await page.keyboard.press(' ');
    await expect(page.locator('.accordion-content').nth(1)).toBeVisible();
  });
});
```

## Test File Structure

We organize our tests in a structure that mirrors the component structure:

```
frontend/
  src/
    lib/
      components/
        ui/
          Button.svelte
          Button.test.ts  // Unit tests
          Card.svelte
          Card.test.ts    // Unit tests
          ...
  tests/
    components/          // Component integration tests
      card-group.spec.ts
      form-elements.spec.ts
      ...
    visual/             // Visual regression tests
      button.spec.ts
      card.spec.ts
      ...
    e2e/                // End-to-end tests
      accordion.spec.ts
      alert.spec.ts
      ...
```

## Running Tests

To run the different types of tests:

```bash
# Unit tests with Vitest
npm run test:unit

# Component tests with Playwright
npm run test:components

# Visual regression tests
npm run test:visual

# End-to-end tests
npm run test:e2e

# All tests
npm run test
```

## Best Practices for Testing Runes Components

1. **Test State Changes**: Verify that `$state()` variables update correctly and trigger expected UI changes.

2. **Test Derived Values**: Ensure that `$derived` expressions calculate correctly when dependencies change.

3. **Test Effects**: Verify that `$effect` runs at the right times and handles cleanup properly.

4. **Prop Testing**: Test both default props and explicitly passed props to ensure the component behaves correctly in all scenarios.

5. **Event Testing**: Verify that events are dispatched correctly and with the right data.

6. **Accessibility Testing**: Ensure that migrated components maintain accessibility properties like ARIA attributes.

7. **Reactivity Testing**: Test that components react appropriately when props or state change.

8. **Unmounting**: Test that cleanup functions in `$effect` run properly when components are unmounted.

## Migration Testing Checklist

For each migrated component, ensure:

- [ ] All props work the same as before migration
- [ ] Component renders correctly with both default and custom props 
- [ ] All events are dispatched correctly
- [ ] Reactive statements work as expected
- [ ] Lifecycle functionality is maintained (initialization, cleanup)
- [ ] Component interacts correctly with parent/child components
- [ ] Visual appearance matches pre-migration version
- [ ] Proper error handling is in place
- [ ] Accessibility features are preserved

By following this testing strategy, we can ensure that our migration to Svelte Runes maintains component functionality and avoids regressions.
