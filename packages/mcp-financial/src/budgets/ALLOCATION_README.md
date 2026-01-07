# Budget Allocation Management Module

The Budget Allocation Management module provides comprehensive functionality for managing budget allocations across programs and categories within the mcp-financial server.

## Overview

This module enables:

- Transferring budget amounts between different budgets
- Allocating budgets to specific categories
- Getting allocation summaries by category
- Validating budget allocations before execution
- Distributing remaining budget proportionally
- Freezing and unfreezing budgets

## Functions

### 1. `reallocateBudget()`

Transfers budget amount between two budgets with full validation and audit trail.

**Signature:**
```typescript
async function reallocateBudget(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  fromBudgetId: string,
  toBudgetId: string,
  amount: number,
  reason: string,
  approvedBy: string
): Promise<{ from: Budget; to: Budget }>
```

**Features:**
- Validates sufficient funds in source budget
- Prevents reallocation from/to closed budgets
- Updates both budgets atomically
- Includes rollback mechanism on failure
- Maintains detailed audit trail in notes

**Example:**
```typescript
const result = await reallocateBudget(
  sheets,
  spreadsheetId,
  "BUD-001",
  "BUD-002",
  50000,
  "Increased priority for materials procurement",
  "john.smith@example.com"
);

console.log(`Transferred $50,000 from ${result.from.budgetId} to ${result.to.budgetId}`);
```

### 2. `allocateBudgetToCategory()`

Creates or updates budget allocation for a specific category within a program.

**Signature:**
```typescript
async function allocateBudgetToCategory(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string,
  categoryId: string,
  amount: number,
  fiscalYear: number,
  allocatedBy: string
): Promise<Budget>
```

**Features:**
- Validates category exists and is active
- Creates new budget if none exists for program+category+fiscal year
- Adds to existing budget allocation if one exists
- Prevents allocation to closed budgets
- Auto-generates budget name and description

**Example:**
```typescript
const budget = await allocateBudgetToCategory(
  sheets,
  spreadsheetId,
  "PROG-001",
  "labor",
  250000,
  2024,
  "jane.doe@example.com"
);

console.log(`Allocated $250,000 to labor category in budget ${budget.budgetId}`);
```

### 3. `getBudgetAllocationSummary()`

Provides comprehensive budget summary for a program, grouped by category.

**Signature:**
```typescript
async function getBudgetAllocationSummary(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string,
  fiscalYear?: number
): Promise<BudgetAllocationSummary>
```

**Returns:**
```typescript
interface BudgetAllocationSummary {
  totalAllocated: number;
  totalCommitted: number;
  totalSpent: number;
  totalRemaining: number;
  byCategory: Array<{
    categoryId: string;
    categoryName: string;
    allocated: number;
    committed: number;
    spent: number;
    remaining: number;
  }>;
}
```

**Example:**
```typescript
const summary = await getBudgetAllocationSummary(
  sheets,
  spreadsheetId,
  "PROG-001",
  2024
);

console.log(`Total Allocated: $${summary.totalAllocated.toLocaleString()}`);
console.log(`Total Remaining: $${summary.totalRemaining.toLocaleString()}`);

for (const category of summary.byCategory) {
  console.log(`${category.categoryName}: $${category.allocated.toLocaleString()}`);
}
```

### 4. `validateBudgetAllocation()`

Validates whether a budget allocation is feasible based on various constraints.

**Signature:**
```typescript
async function validateBudgetAllocation(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  budgetId: string,
  amountToAllocate: number
): Promise<ValidationResult>
```

**Validation Checks:**
- Amount is positive
- Budget exists and is not closed
- Budget period has not ended
- Program-level budget caps not exceeded
- Utilization rate considerations

**Returns:**
```typescript
interface ValidationResult {
  valid: boolean;
  reason?: string;
}
```

**Example:**
```typescript
const validation = await validateBudgetAllocation(
  sheets,
  spreadsheetId,
  "BUD-001",
  100000
);

if (validation.valid) {
  console.log("Allocation can proceed");
} else {
  console.log(`Cannot allocate: ${validation.reason}`);
}
```

### 5. `distributeRemainingBudget()`

Distributes remaining budget from one budget item proportionally to under-budget categories.

**Signature:**
```typescript
async function distributeRemainingBudget(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string,
  budgetId: string,
  fiscalYear: number,
  distributedBy: string
): Promise<Budget[]>
```

**Features:**
- Only distributes to under-budget categories (positive variance)
- Proportional distribution based on variance
- Excludes closed budgets
- Updates source budget to zero remaining
- Returns all updated budgets

**Example:**
```typescript
const updatedBudgets = await distributeRemainingBudget(
  sheets,
  spreadsheetId,
  "PROG-001",
  "BUD-001",
  2024,
  "admin@example.com"
);

console.log(`Distributed budget to ${updatedBudgets.length - 1} budgets`);
```

### 6. `freezeBudget()`

Marks a budget as frozen by changing status to "closed", preventing further allocations.

**Signature:**
```typescript
async function freezeBudget(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  budgetId: string,
  frozenBy: string
): Promise<Budget | null>
```

**Example:**
```typescript
const frozen = await freezeBudget(
  sheets,
  spreadsheetId,
  "BUD-001",
  "manager@example.com"
);

if (frozen) {
  console.log(`Budget ${frozen.budgetId} is now frozen`);
}
```

### 7. `unfreezeBudget()`

Changes budget status from "closed" to "active", allowing further allocations.

**Signature:**
```typescript
async function unfreezeBudget(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  budgetId: string,
  unfrozenBy: string
): Promise<Budget | null>
```

**Example:**
```typescript
const unfrozen = await unfreezeBudget(
  sheets,
  spreadsheetId,
  "BUD-001",
  "manager@example.com"
);

if (unfrozen) {
  console.log(`Budget ${unfrozen.budgetId} is now active`);
}
```

## Common Use Cases

### Use Case 1: Mid-Year Budget Reallocation

```typescript
// Reallocate from under-utilized labor to materials
const result = await reallocateBudget(
  sheets,
  spreadsheetId,
  "BUD-LABOR-001",
  "BUD-MATERIALS-001",
  75000,
  "Q3 materials demand exceeded forecast",
  "cfo@example.com"
);
```

### Use Case 2: Fiscal Year Budget Planning

```typescript
// Allocate budgets to all major categories
const categories = ["labor", "materials", "equipment", "travel"];
const amounts = [500000, 300000, 150000, 50000];

for (let i = 0; i < categories.length; i++) {
  await allocateBudgetToCategory(
    sheets,
    spreadsheetId,
    "PROG-001",
    categories[i],
    amounts[i],
    2025,
    "budget-planner@example.com"
  );
}

// Get summary
const summary = await getBudgetAllocationSummary(
  sheets,
  spreadsheetId,
  "PROG-001",
  2025
);
```

### Use Case 3: End-of-Year Cleanup

```typescript
// Find under-utilized budgets
const summary = await getBudgetAllocationSummary(
  sheets,
  spreadsheetId,
  "PROG-001",
  2024
);

// Identify budgets with significant remaining amounts
const underUtilized = summary.byCategory.filter(
  cat => cat.remaining > 10000 && cat.allocated > 0
);

// Distribute each under-utilized budget
for (const category of underUtilized) {
  // Find the budget ID for this category (would need to query)
  // Then distribute
  await distributeRemainingBudget(
    sheets,
    spreadsheetId,
    "PROG-001",
    budgetId, // from query
    2024,
    "finance-admin@example.com"
  );
}
```

### Use Case 4: Emergency Budget Freeze

```typescript
// Freeze all budgets in a program during audit
const budgets = await listBudgets(sheets, spreadsheetId, {
  programId: "PROG-001",
  fiscalYear: "FY2024"
});

for (const budget of budgets) {
  await freezeBudget(
    sheets,
    spreadsheetId,
    budget.budgetId,
    "audit-controller@example.com"
  );
}

// Later, unfreeze after audit complete
for (const budget of budgets) {
  await unfreezeBudget(
    sheets,
    spreadsheetId,
    budget.budgetId,
    "audit-controller@example.com"
  );
}
```

## Error Handling

All functions throw descriptive errors that can be caught and handled:

```typescript
try {
  const result = await reallocateBudget(
    sheets,
    spreadsheetId,
    fromId,
    toId,
    amount,
    reason,
    approver
  );
} catch (error) {
  if (error.message.includes("Insufficient allocated amount")) {
    // Handle insufficient funds
  } else if (error.message.includes("closed budget")) {
    // Handle closed budget error
  } else {
    // Handle other errors
  }
}
```

## Best Practices

1. **Always validate before allocating**: Use `validateBudgetAllocation()` before making large allocations
2. **Provide detailed reasons**: Include comprehensive reasons for reallocations for audit trail
3. **Check budget status**: Verify budgets are not closed before attempting operations
4. **Use summaries for reporting**: `getBudgetAllocationSummary()` provides excellent data for dashboards
5. **Atomic operations**: Reallocation includes rollback mechanism, but avoid partial workflows
6. **Freeze during audits**: Use freeze/unfreeze to prevent changes during sensitive periods

## Integration with Other Modules

The allocation module integrates seamlessly with:

- **budgets.ts**: Uses `readBudget()`, `updateBudget()`, `listBudgets()`, and `createBudget()`
- **categories.ts**: Uses `listCategories()` for validation
- **Financial reporting**: Summary data feeds into reports and dashboards
- **EVM analysis**: Allocation data supports earned value calculations

## Performance Considerations

- Summary functions may be slow for programs with many budgets (100+)
- Consider caching summary results for frequently accessed programs
- Batch operations when possible rather than individual calls
- Distribution operations update multiple budgets sequentially

## Security Notes

- All operations require an `approvedBy` or `allocatedBy` parameter for audit trail
- Budget status prevents unauthorized modifications
- Notes field maintains complete history of all allocation changes
- Consider implementing additional authorization checks at the application layer
