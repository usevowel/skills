# Custom Actions Best Practices

Guide for designing and implementing custom actions for vowel.to voice agents.

## Table of Contents

- Action Design Principles
- What to Register as Actions
- What NOT to Register as Actions
- Action Parameter Design
- Tool Count Guidelines
- System Instructions

---

## Action Design Principles

### ⚠️ CRITICAL: Actions Should Write to App Store

**MOST IMPORTANT:** Custom actions should modify application state/stores, NOT manipulate the DOM directly. This aligns with React's state-driven architecture.

**Why this matters:**
- React applications are state-driven - the UI automatically updates when state changes
- DOM manipulation breaks the React rendering cycle and causes inconsistencies
- State changes ensure proper data flow and persistence
- Writing to the store keeps your app predictable and maintainable

**Example - Good Pattern:**

```typescript
// ✅ Good: Action writes to app store
vowel.registerAction('addToCart', {
  description: 'Add a product to the shopping cart',
  parameters: {
    productId: { type: 'string', description: 'Product ID' },
    quantity: { type: 'number', description: 'Quantity', optional: true }
  }
}, async ({ productId, quantity = 1 }) => {
  // Write to store - UI updates automatically
  cartStore.addItem({ productId, quantity })
  return { success: true, message: `Added ${quantity} item(s) to cart` }
})
```

**Example - Bad Pattern:**

```typescript
// ❌ Bad: Action manipulates DOM directly
vowel.registerAction('addToCart', {
  description: 'Add a product to the shopping cart',
  parameters: {
    productId: { type: 'string', description: 'Product ID' }
  }
}, async ({ productId }) => {
  // ❌ Don't do this - breaks React's rendering cycle
  document.querySelector('.cart-count').textContent = '5'
  return { success: true }
})
```

### Actions Cannot Call Other Actions

**⚠️ IMPORTANT:** Actions cannot call other actions. Only the AI agent can call actions. Action handlers can only interact with your application code (stores, APIs, DOM if absolutely necessary, etc.).

This means:
- Don't try to call `getAppState()` from within another action
- Don't try to chain actions programmatically
- The AI orchestrates action calls, not your action handlers

---

## What to Register as Actions

### ✅ DO: Business Logic and State Operations

Register actions for:

1. **State modifications** - Adding to cart, updating quantities, changing filters
2. **Data operations** - Searching, filtering, sorting
3. **Business logic** - Calculations, validations, transformations
4. **API calls** - Fetching data, submitting forms
5. **Complex workflows** - Multi-step processes that require coordination

**Examples:**

```typescript
// ✅ Good: Specific actions for business logic
vowel.registerAction('searchProducts', {
  description: 'Search for products by query string',
  parameters: {
    query: { type: 'string', description: 'Search query to filter products' }
  }
}, async ({ query }) => {
  // Write to store - updates search results
  productStore.setSearchQuery(query)
  return { success: true }
})

vowel.registerAction('filterProductsByCategory', {
  description: 'Filter products by category ID',
  parameters: {
    categoryId: { type: 'string', description: 'Category ID to filter products' }
  }
}, async ({ categoryId }) => {
  // Write to store - updates filter
  productStore.setCategoryFilter(categoryId)
  return { success: true }
})

vowel.registerAction('addToCart', {
  description: 'Add a product to the shopping cart',
  parameters: {
    productId: { type: 'string', description: 'Product ID' },
    quantity: { type: 'number', description: 'Quantity', optional: true }
  }
}, async ({ productId, quantity = 1 }) => {
  // Write to store - adds item to cart
  cartStore.addItem({ productId, quantity })
  return { success: true }
})
```

---

## What NOT to Register as Actions

### ❌ DON'T: Navigation Actions

**Don't create navigation actions** - The navigation adapter handles all navigation automatically.

```typescript
// ❌ Bad: Redundant navigation action
vowel.registerAction('navigateToProducts', {
  description: 'Navigate to products page',
  parameters: {}
}, async () => {
  router.push('/products')
  return { success: true }
})

// ✅ Good: Let the navigation adapter handle it
// No action needed - user says "go to products" and adapter handles it
```

### ❌ DON'T: Generic Resource Actions

**Don't use generic resource actions** - Use specific actions per resource instead.

```typescript
// ❌ Bad: Too generic
vowel.registerAction('searchRecords', {
  description: 'Search for records',
  parameters: {
    resource: { type: 'string', description: 'Resource type' },
    query: { type: 'string', description: 'Search query' }
  }
}, async ({ resource, query }) => {
  // AI has to figure out which resource to use
})

// ✅ Good: Specific actions
vowel.registerAction('searchProducts', {
  description: 'Search for products by query string',
  parameters: {
    query: { type: 'string', description: 'Search query' }
  }
}, async ({ query }) => {
  productStore.setSearchQuery(query)
  return { success: true }
})

vowel.registerAction('searchOrders', {
  description: 'Search for orders by query string',
  parameters: {
    query: { type: 'string', description: 'Search query' }
  }
}, async ({ query }) => {
  orderStore.setSearchQuery(query)
  return { success: true }
})
```

### ❌ DON'T: DOM Manipulation Actions (Unless Explicitly Required)

**Don't create actions that manipulate the DOM** - Write to app store instead.

```typescript
// ❌ Bad: DOM manipulation
vowel.registerAction('showModal', {
  description: 'Show a modal dialog',
  parameters: {
    modalId: { type: 'string', description: 'Modal ID' }
  }
}, async ({ modalId }) => {
  document.getElementById(modalId).style.display = 'block'
  return { success: true }
})

// ✅ Good: Write to store
vowel.registerAction('showModal', {
  description: 'Show a modal dialog',
  parameters: {
    modalId: { type: 'string', description: 'Modal ID' }
  }
}, async ({ modalId }) => {
  // Write to store - UI updates automatically
  modalStore.openModal(modalId)
  return { success: true }
})
```

**Exception:** DOM manipulation is acceptable ONLY if the user explicitly requests it and there's no state-driven alternative (e.g., interacting with third-party widgets not under your control).

---

## Action Parameter Design

### ✅ DO: Prefer Shallow Parameters

Use simple, flat parameter structures (strings, numbers, booleans) rather than deeply nested objects.

```typescript
// ✅ Good: Shallow, simple parameters
vowel.registerAction('addToCart', {
  description: 'Add a product to cart',
  parameters: {
    productId: { type: 'string', description: 'Product ID' },
    quantity: { type: 'number', description: 'Quantity', optional: true }
  }
}, async ({ productId, quantity = 1 }) => {
  cartStore.addItem({ productId, quantity })
  return { success: true }
})

// ✅ Good: Optional parameters for flexibility
vowel.registerAction('filterProducts', {
  description: 'Filter products by various criteria',
  parameters: {
    category: { type: 'string', description: 'Category filter', optional: true },
    brand: { type: 'string', description: 'Brand filter', optional: true },
    minPrice: { type: 'number', description: 'Minimum price', optional: true },
    maxPrice: { type: 'number', description: 'Maximum price', optional: true }
  }
}, async ({ category, brand, minPrice, maxPrice }) => {
  productStore.setFilters({ category, brand, minPrice, maxPrice })
  return { success: true }
})
```

### ❌ DON'T: Use Deeply Nested JSON Parameters

The AI struggles with complex nested structures. Keep parameters shallow and simple.

```typescript
// ❌ Bad: Deeply nested parameters
vowel.registerAction('addToCart', {
  description: 'Add a product to cart',
  parameters: {
    item: {
      type: 'object',
      description: 'Item details',
      properties: {
        product: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            variant: { type: 'object', properties: { ... } }
          }
        }
      }
    }
  }
}, async ({ item }) => {
  // Too complex - AI will struggle with nested structure
})
```

---

## Tool Count Guidelines

### ⚠️ IMPORTANT: Keep Action Count Manageable

- **Prefer fewer tools that can do more things** over many tools that each do one thing
- **The Vowel agent tends to struggle above 20 actions registered**
- **Consolidate related actions** when possible
- **Aim for 10-15 actions maximum** for best AI performance

### ✅ Good: Consolidated Actions

```typescript
// ✅ Good: One flexible action instead of many specific ones
vowel.registerAction('filterProducts', {
  description: 'Filter products by various criteria',
  parameters: {
    category: { type: 'string', description: 'Category filter', optional: true },
    brand: { type: 'string', description: 'Brand filter', optional: true },
    minPrice: { type: 'number', description: 'Minimum price', optional: true },
    maxPrice: { type: 'number', description: 'Maximum price', optional: true }
  }
}, async ({ category, brand, minPrice, maxPrice }) => {
  // Single action handles multiple filter types
  productStore.setFilters({ category, brand, minPrice, maxPrice })
  return { success: true }
})
```

### ❌ Bad: Too Many Granular Actions

```typescript
// ❌ Bad: Too many actions (25+ actions will cause issues)
vowel.registerAction('filterProductsByCategory', ...)
vowel.registerAction('filterProductsByBrand', ...)
vowel.registerAction('filterProductsByPriceRange', ...)
vowel.registerAction('filterProductsByRating', ...)
vowel.registerAction('filterProductsByAvailability', ...)
// ... 20+ more actions
```

---

## System Instructions for Custom Actions

When writing system instructions, document all custom actions organized by resource type:

```typescript
instructions: `You are a helpful assistant for this application.

## CRITICAL: Write to App Store, Not DOM
**⚠️ MOST IMPORTANT RULE**: When performing actions, you MUST write to the application store/state management system, NOT manipulate the DOM directly. Always use registered actions that modify the app store. The UI will automatically update to reflect state changes.

## Available Actions:

### Products:
- searchProducts: Search for products by query. Parameters: query (search term).
- filterProductsByCategory: Filter products by category. Parameters: categoryId (category ID).

### Orders:
- searchOrders: Search for orders by query. Parameters: query (search term).
- filterOrdersByStatus: Filter orders by status. Parameters: status (ordered/delivered/cancelled).

### Cart:
- addToCart: Add product to cart. Parameters: productId, quantity (optional).
- removeFromCart: Remove product from cart. Parameters: productId.
- updateCartQuantity: Update item quantity. Parameters: productId, quantity.

## How to Use:
- To search: Say "search for [query] in products" - Action writes to store
- To filter: Say "show me pending orders" - Action writes to store
- To modify cart: Say "add product X to cart" - Action writes to store
- **Navigation is automatic** - Just say "go to products" or "show me cart"

Help users interact with the application by modifying state through registered actions.`
```

### Key Elements to Include

1. **Write to App Store Priority** - Emphasize state-driven actions
2. **Action Documentation** - List all actions organized by resource
3. **Parameter Details** - Document required and optional parameters
4. **Usage Examples** - Show how users can trigger actions
5. **Navigation Note** - Clarify that navigation is handled automatically
6. **DOM Automation Caveat** - State that DOM manipulation should only be used if explicitly requested

---

## Registration Pattern

### ⚠️ CRITICAL: Register Actions BEFORE startSession()

All actions MUST be registered BEFORE calling `startSession()`. Actions registered after startSession() will have NO EFFECT.

```typescript
function registerCustomActions(vowel: Vowel) {
  // ⚠️ CRITICAL: All actions MUST be registered BEFORE startSession()!
  
  vowel.registerAction('searchProducts', {
    description: 'Search for products by query string',
    parameters: {
      query: { type: 'string', description: 'Search query to filter products' }
    }
  }, async ({ query }) => {
    productStore.setSearchQuery(query)
    return { success: true }
  })

  vowel.registerAction('addToCart', {
    description: 'Add a product to the shopping cart',
    parameters: {
      productId: { type: 'string', description: 'Product ID' },
      quantity: { type: 'number', description: 'Quantity', optional: true }
    }
  }, async ({ productId, quantity = 1 }) => {
    cartStore.addItem({ productId, quantity })
    return { success: true }
  })
  
  // ❌ Don't create navigation actions - navigationAdapter handles this automatically!
}

// Call registration function before returning vowel instance
const vowel = new Vowel({ ... })
registerCustomActions(vowel)  // Register before startSession()
return vowel
```

---

## Best Practices Summary

### ✅ DO:

- **Write to app store** - Always modify state through registered actions
- Create specific actions for each resource (searchProducts, searchOrders, etc.)
- Focus actions on business logic and data operations
- Use descriptive action names that clearly indicate what they do
- Prefer shallow parameters (strings, numbers, booleans)
- Keep action count manageable (10-15 maximum)
- Use optional parameters for flexibility
- Register all actions BEFORE startSession()

### ❌ DON'T:

- **Don't manipulate DOM directly** - Use state management instead
- Don't create navigation actions (navigationAdapter handles this)
- Don't use generic resource actions (too vague)
- Don't duplicate adapter functionality
- Don't use deeply nested JSON parameters
- Don't register too many actions (struggles above 20)
- Don't register actions after startSession()
