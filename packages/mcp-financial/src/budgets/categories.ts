/**
 * Budget Categories CRUD Operations
 *
 * Provides hierarchical category management for budget classification
 * Supports parent-child relationships and category hierarchies
 */

import type { sheets_v4 } from "googleapis";
import {
  readSheetRange,
  appendRows,
  updateRow,
  findRowById,
  generateNextId,
} from "@gw-mcp/shared-core";

/**
 * Budget Category Type
 * Defines the type of budget category
 */
export type BudgetCategoryType =
  | "labor"
  | "materials"
  | "equipment"
  | "travel"
  | "subcontracts"
  | "overhead"
  | "contingency"
  | "other";

/**
 * Budget Category Interface
 * Represents a hierarchical budget classification category
 */
export interface BudgetCategory {
  categoryId: string; // CAT-001
  name: string;
  code: string; // CAT-LABOR, CAT-MATERIALS
  type: BudgetCategoryType;
  description: string;
  parentCategoryId?: string; // For hierarchical categories
  active: boolean;
  createdDate: Date;
  createdBy: string;
  modifiedDate: Date;
  modifiedBy: string;
}

/**
 * Create Budget Category Input
 */
export interface CreateBudgetCategoryInput {
  name: string;
  code: string;
  type: BudgetCategoryType;
  description: string;
  parentCategoryId?: string;
}

/**
 * Update Budget Category Input
 */
export interface UpdateBudgetCategoryInput {
  categoryId: string;
  name?: string;
  code?: string;
  type?: BudgetCategoryType;
  description?: string;
  parentCategoryId?: string;
  active?: boolean;
}

/**
 * Column mapping for Budget Categories sheet
 */
export const CATEGORY_COLUMNS = {
  categoryId: "A",
  name: "B",
  code: "C",
  type: "D",
  description: "E",
  parentCategoryId: "F",
  active: "G",
  createdDate: "H",
  createdBy: "I",
  modifiedDate: "J",
  modifiedBy: "K",
};

const CATEGORIES_SHEET = "Budget Categories";

/**
 * Parse a row from the sheet into a BudgetCategory object
 */
export function parseCategoryRow(row: any[]): BudgetCategory | null {
  if (!row || row.length === 0 || !row[0]) {
    return null;
  }

  return {
    categoryId: row[0] || "",
    name: row[1] || "",
    code: row[2] || "",
    type: (row[3] as BudgetCategoryType) || "other",
    description: row[4] || "",
    parentCategoryId: row[5] || undefined,
    active: row[6] === "TRUE" || row[6] === true || row[6] === "true",
    createdDate: row[7] ? new Date(row[7]) : new Date(),
    createdBy: row[8] || "",
    modifiedDate: row[9] ? new Date(row[9]) : new Date(),
    modifiedBy: row[10] || "",
  };
}

/**
 * Convert a BudgetCategory object to a row array
 */
export function categoryToRow(category: BudgetCategory): any[] {
  return [
    category.categoryId,
    category.name,
    category.code,
    category.type,
    category.description,
    category.parentCategoryId || "",
    category.active ? "TRUE" : "FALSE",
    category.createdDate.toISOString(),
    category.createdBy,
    category.modifiedDate.toISOString(),
    category.modifiedBy,
  ];
}

/**
 * Create a new budget category
 */
export async function createCategory(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  input: CreateBudgetCategoryInput,
  createdBy: string
): Promise<BudgetCategory> {
  try {
    // Validate parent category exists if provided
    if (input.parentCategoryId) {
      const parent = await readCategory(
        sheets,
        spreadsheetId,
        input.parentCategoryId
      );
      if (!parent) {
        throw new Error(
          `Parent category ${input.parentCategoryId} not found`
        );
      }
      if (!parent.active) {
        throw new Error(
          `Parent category ${input.parentCategoryId} is not active`
        );
      }
    }

    // Generate next category ID
    const categoryId = await generateNextId(
      sheets,
      spreadsheetId,
      CATEGORIES_SHEET,
      "Category ID",
      "CAT"
    );

    const now = new Date();

    const category: BudgetCategory = {
      categoryId,
      name: input.name,
      code: input.code,
      type: input.type,
      description: input.description,
      parentCategoryId: input.parentCategoryId,
      active: true, // Default to active
      createdDate: now,
      createdBy,
      modifiedDate: now,
      modifiedBy: createdBy,
    };

    // Append to sheet
    const row = categoryToRow(category);
    await appendRows(sheets, spreadsheetId, `${CATEGORIES_SHEET}!A:K`, [row]);

    return category;
  } catch (error) {
    throw new Error(
      `Failed to create budget category: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Read a budget category by ID
 */
export async function readCategory(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  categoryId: string
): Promise<BudgetCategory | null> {
  try {
    const result = await findRowById(
      sheets,
      spreadsheetId,
      CATEGORIES_SHEET,
      "Category ID",
      categoryId
    );

    if (!result) {
      return null;
    }

    return parseCategoryRow(result.rowData);
  } catch (error) {
    throw new Error(
      `Failed to read budget category: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Update a budget category
 */
export async function updateCategory(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  input: UpdateBudgetCategoryInput,
  modifiedBy: string
): Promise<BudgetCategory | null> {
  try {
    // First, read the existing category
    const existing = await readCategory(sheets, spreadsheetId, input.categoryId);

    if (!existing) {
      return null;
    }

    // Validate parent category if being updated
    if (input.parentCategoryId !== undefined && input.parentCategoryId !== null) {
      // Prevent self-referencing
      if (input.parentCategoryId === input.categoryId) {
        throw new Error("Category cannot be its own parent");
      }

      // Check parent exists and is active
      const parent = await readCategory(
        sheets,
        spreadsheetId,
        input.parentCategoryId
      );
      if (!parent) {
        throw new Error(
          `Parent category ${input.parentCategoryId} not found`
        );
      }
      if (!parent.active) {
        throw new Error(
          `Parent category ${input.parentCategoryId} is not active`
        );
      }

      // Prevent circular references by checking if parent has this category as ancestor
      const isCircular = await checkCircularReference(
        sheets,
        spreadsheetId,
        input.categoryId,
        input.parentCategoryId
      );
      if (isCircular) {
        throw new Error(
          "Cannot set parent: would create circular reference"
        );
      }
    }

    // Apply updates
    const updated: BudgetCategory = {
      ...existing,
      modifiedDate: new Date(),
      modifiedBy,
    };

    // Apply individual updates
    if (input.name !== undefined) updated.name = input.name;
    if (input.code !== undefined) updated.code = input.code;
    if (input.type !== undefined) updated.type = input.type;
    if (input.description !== undefined) updated.description = input.description;
    if (input.parentCategoryId !== undefined)
      updated.parentCategoryId = input.parentCategoryId || undefined;
    if (input.active !== undefined) updated.active = input.active;

    // Build update map
    const updates: Record<string, any> = {};

    if (input.name !== undefined) updates.name = input.name;
    if (input.code !== undefined) updates.code = input.code;
    if (input.type !== undefined) updates.type = input.type;
    if (input.description !== undefined)
      updates.description = input.description;
    if (input.parentCategoryId !== undefined)
      updates.parentCategoryId = input.parentCategoryId || "";
    if (input.active !== undefined)
      updates.active = input.active ? "TRUE" : "FALSE";

    // Always update modified fields
    updates.modifiedDate = updated.modifiedDate.toISOString();
    updates.modifiedBy = modifiedBy;

    // Update the row
    await updateRow(
      sheets,
      spreadsheetId,
      CATEGORIES_SHEET,
      "Category ID",
      input.categoryId,
      updates,
      CATEGORY_COLUMNS
    );

    return updated;
  } catch (error) {
    throw new Error(
      `Failed to update budget category: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * List budget categories with optional filters
 */
export async function listCategories(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  filters?: {
    type?: BudgetCategoryType;
    active?: boolean;
    parentCategoryId?: string;
  }
): Promise<BudgetCategory[]> {
  try {
    const data = await readSheetRange(
      sheets,
      spreadsheetId,
      `${CATEGORIES_SHEET}!A:K`
    );

    if (data.length <= 1) {
      return []; // No data or only headers
    }

    const categories: BudgetCategory[] = [];

    // Skip header row
    for (let i = 1; i < data.length; i++) {
      const category = parseCategoryRow(data[i]);
      if (!category) continue;

      // Apply filters
      if (filters) {
        if (filters.type && category.type !== filters.type) {
          continue;
        }
        if (filters.active !== undefined && category.active !== filters.active) {
          continue;
        }
        if (
          filters.parentCategoryId !== undefined &&
          category.parentCategoryId !== filters.parentCategoryId
        ) {
          continue;
        }
      }

      categories.push(category);
    }

    return categories;
  } catch (error) {
    throw new Error(
      `Failed to list budget categories: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Delete a budget category (soft delete - marks as inactive)
 */
export async function deleteCategory(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  categoryId: string,
  deletedBy: string
): Promise<boolean> {
  try {
    // Check if category has active children
    const children = await getSubcategories(sheets, spreadsheetId, categoryId);
    const activeChildren = children.filter((c) => c.active);

    if (activeChildren.length > 0) {
      throw new Error(
        `Cannot delete category: has ${activeChildren.length} active subcategories. Deactivate subcategories first.`
      );
    }

    // Mark category as inactive
    const result = await updateCategory(
      sheets,
      spreadsheetId,
      {
        categoryId,
        active: false,
      },
      deletedBy
    );

    return result !== null;
  } catch (error) {
    throw new Error(
      `Failed to delete budget category: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get category hierarchy
 * Returns a hierarchical tree of categories starting from root or specified category
 */
export async function getCategoryHierarchy(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  rootCategoryId?: string
): Promise<BudgetCategory[]> {
  try {
    // Get all categories
    const allCategories = await listCategories(sheets, spreadsheetId, {
      active: true,
    });

    // If rootCategoryId specified, start from that category
    if (rootCategoryId) {
      const rootCategory = allCategories.find(
        (c) => c.categoryId === rootCategoryId
      );
      if (!rootCategory) {
        return [];
      }

      // Get all descendants recursively
      const descendants: BudgetCategory[] = [rootCategory];
      const getDescendants = (parentId: string) => {
        const children = allCategories.filter(
          (c) => c.parentCategoryId === parentId
        );
        for (const child of children) {
          descendants.push(child);
          getDescendants(child.categoryId);
        }
      };
      getDescendants(rootCategoryId);

      return descendants;
    }

    // Return all categories in hierarchical order (breadth-first)
    const result: BudgetCategory[] = [];
    const processed = new Set<string>();

    // Start with root categories (no parent)
    const roots = allCategories.filter((c) => !c.parentCategoryId);
    const queue = [...roots];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (processed.has(current.categoryId)) continue;

      result.push(current);
      processed.add(current.categoryId);

      // Add children to queue
      const children = allCategories.filter(
        (c) => c.parentCategoryId === current.categoryId
      );
      queue.push(...children);
    }

    return result;
  } catch (error) {
    throw new Error(
      `Failed to get category hierarchy: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get subcategories (direct children)
 * Returns all direct child categories of a parent category
 */
export async function getSubcategories(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  parentCategoryId: string
): Promise<BudgetCategory[]> {
  try {
    return await listCategories(sheets, spreadsheetId, {
      parentCategoryId,
    });
  } catch (error) {
    throw new Error(
      `Failed to get subcategories: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get category path
 * Returns the full hierarchical path of a category (e.g., "Labor > Engineering > Software Development")
 */
export async function getCategoryPath(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  categoryId: string
): Promise<string> {
  try {
    const category = await readCategory(sheets, spreadsheetId, categoryId);
    if (!category) {
      throw new Error(`Category ${categoryId} not found`);
    }

    const path: string[] = [category.name];

    // Walk up the parent chain
    let currentParentId = category.parentCategoryId;
    const visited = new Set<string>([categoryId]); // Prevent infinite loops

    while (currentParentId) {
      if (visited.has(currentParentId)) {
        // Circular reference detected
        throw new Error(
          `Circular reference detected in category hierarchy for ${categoryId}`
        );
      }
      visited.add(currentParentId);

      const parent = await readCategory(
        sheets,
        spreadsheetId,
        currentParentId
      );
      if (!parent) {
        // Parent not found, break the chain
        break;
      }

      path.unshift(parent.name);
      currentParentId = parent.parentCategoryId;
    }

    return path.join(" > ");
  } catch (error) {
    throw new Error(
      `Failed to get category path: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Check for circular reference in category hierarchy
 * Returns true if setting parentId as parent of categoryId would create a cycle
 */
async function checkCircularReference(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  categoryId: string,
  parentId: string
): Promise<boolean> {
  try {
    const visited = new Set<string>([categoryId]);
    let currentId: string | undefined = parentId;

    // Walk up the parent chain from the proposed parent
    while (currentId) {
      if (visited.has(currentId)) {
        return true; // Circular reference found
      }
      visited.add(currentId);

      const current = await readCategory(sheets, spreadsheetId, currentId);
      if (!current) {
        break;
      }

      currentId = current.parentCategoryId;
    }

    return false;
  } catch (error) {
    // If there's an error checking, assume it's safe (or let the update fail later)
    console.error("Error checking circular reference:", error);
    return false;
  }
}
