/**
 * Workflow Role Manager
 *
 * Handles role-based access control for workflows including:
 * - Role assignment and management
 * - Permission checking
 * - User role verification
 * - Program-scoped roles
 *
 * Phase 5 Implementation
 */

import type {
  Role,
  Permission,
  UserRoles,
  RoleRequirement,
} from "../types/workflows.js";

/**
 * Role Configuration
 * Defines what permissions each role has
 */
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  system: [
    "read",
    "write",
    "delete",
    "approve",
    "execute_workflow",
    "manage_program",
    "manage_documents",
    "manage_deliverables",
    "manage_workflows",
    "manage_users",
  ],
  admin: [
    "read",
    "write",
    "delete",
    "approve",
    "execute_workflow",
    "manage_program",
    "manage_documents",
    "manage_deliverables",
    "manage_workflows",
    "manage_users",
  ],
  program_manager: [
    "read",
    "write",
    "delete",
    "approve",
    "execute_workflow",
    "manage_program",
    "manage_documents",
    "manage_deliverables",
    "manage_workflows",
  ],
  project_manager: [
    "read",
    "write",
    "approve",
    "execute_workflow",
    "manage_documents",
    "manage_deliverables",
  ],
  team_member: ["read", "write", "execute_workflow"],
  reviewer: ["read", "approve"],
  approver: ["read", "approve"],
  stakeholder: ["read"],
  viewer: ["read"],
};

/**
 * Workflow Role Manager
 * Manages roles and permissions for workflow access control
 */
export class WorkflowRoleManager {
  private userRoles: Map<string, UserRoles[]> = new Map();

  /**
   * Assign roles to a user
   */
  assignRoles(userRoles: UserRoles): void {
    const existing = this.userRoles.get(userRoles.userId) || [];
    existing.push(userRoles);
    this.userRoles.set(userRoles.userId, existing);
  }

  /**
   * Revoke roles from a user
   */
  revokeRoles(userId: string, programId?: string): void {
    if (!programId) {
      // Revoke all roles
      this.userRoles.delete(userId);
      return;
    }

    // Revoke program-specific roles
    const existing = this.userRoles.get(userId) || [];
    const filtered = existing.filter((r) => r.programId !== programId);

    if (filtered.length === 0) {
      this.userRoles.delete(userId);
    } else {
      this.userRoles.set(userId, filtered);
    }
  }

  /**
   * Get user roles
   */
  getUserRoles(userId: string, programId?: string): UserRoles[] {
    const allRoles = this.userRoles.get(userId) || [];

    if (!programId) {
      return allRoles;
    }

    // Filter by program context
    return allRoles.filter(
      (r) => !r.programId || r.programId === programId
    );
  }

  /**
   * Check if user has a specific role
   */
  hasRole(userId: string, role: Role, programId?: string): boolean {
    const roles = this.getUserRoles(userId, programId);

    for (const userRole of roles) {
      // Check expiry
      if (userRole.expiryDate && userRole.expiryDate < new Date()) {
        continue;
      }

      if (userRole.roles.includes(role)) {
        return true;
      }

      // System and admin roles are global
      if (userRole.roles.includes("system") || userRole.roles.includes("admin")) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if user has any of the roles
   */
  hasAnyRole(userId: string, roles: Role[], programId?: string): boolean {
    return roles.some((role) => this.hasRole(userId, role, programId));
  }

  /**
   * Check if user has all of the roles
   */
  hasAllRoles(userId: string, roles: Role[], programId?: string): boolean {
    return roles.every((role) => this.hasRole(userId, role, programId));
  }

  /**
   * Check if user has a specific permission
   */
  hasPermission(userId: string, permission: Permission, programId?: string): boolean {
    const roles = this.getUserRoles(userId, programId);

    for (const userRole of roles) {
      // Check expiry
      if (userRole.expiryDate && userRole.expiryDate < new Date()) {
        continue;
      }

      // Check explicit permissions
      if (userRole.permissions.includes(permission)) {
        return true;
      }

      // Check role-based permissions
      for (const role of userRole.roles) {
        const rolePermissions = ROLE_PERMISSIONS[role] || [];
        if (rolePermissions.includes(permission)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if user has any of the permissions
   */
  hasAnyPermission(
    userId: string,
    permissions: Permission[],
    programId?: string
  ): boolean {
    return permissions.some((permission) =>
      this.hasPermission(userId, permission, programId)
    );
  }

  /**
   * Check if user has all of the permissions
   */
  hasAllPermissions(
    userId: string,
    permissions: Permission[],
    programId?: string
  ): boolean {
    return permissions.every((permission) =>
      this.hasPermission(userId, permission, programId)
    );
  }

  /**
   * Check if user meets role requirements
   */
  meetsRequirements(
    userId: string,
    requirements: RoleRequirement[],
    programId?: string
  ): boolean {
    for (const requirement of requirements) {
      if (!requirement.required) {
        continue;
      }

      if (!this.hasRole(userId, requirement.role, programId)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get all users with a specific role
   */
  getUsersWithRole(role: Role, programId?: string): string[] {
    const users: Set<string> = new Set();

    for (const [userId, roles] of this.userRoles.entries()) {
      for (const userRole of roles) {
        // Check program context
        if (programId && userRole.programId && userRole.programId !== programId) {
          continue;
        }

        // Check expiry
        if (userRole.expiryDate && userRole.expiryDate < new Date()) {
          continue;
        }

        if (userRole.roles.includes(role)) {
          users.add(userId);
          break;
        }
      }
    }

    return Array.from(users);
  }

  /**
   * Get all users with a specific permission
   */
  getUsersWithPermission(permission: Permission, programId?: string): string[] {
    const users: Set<string> = new Set();

    for (const [userId] of this.userRoles.entries()) {
      if (this.hasPermission(userId, permission, programId)) {
        users.add(userId);
      }
    }

    return Array.from(users);
  }

  /**
   * Get permissions for a role
   */
  getRolePermissions(role: Role): Permission[] {
    return ROLE_PERMISSIONS[role] || [];
  }

  /**
   * Get all permissions for a user
   */
  getAllPermissions(userId: string, programId?: string): Permission[] {
    const permissions: Set<Permission> = new Set();
    const roles = this.getUserRoles(userId, programId);

    for (const userRole of roles) {
      // Check expiry
      if (userRole.expiryDate && userRole.expiryDate < new Date()) {
        continue;
      }

      // Add explicit permissions
      for (const permission of userRole.permissions) {
        permissions.add(permission);
      }

      // Add role-based permissions
      for (const role of userRole.roles) {
        const rolePermissions = ROLE_PERMISSIONS[role] || [];
        for (const permission of rolePermissions) {
          permissions.add(permission);
        }
      }
    }

    return Array.from(permissions);
  }

  /**
   * List all users and their roles
   */
  listAllUsers(): Array<{ userId: string; roles: UserRoles[] }> {
    return Array.from(this.userRoles.entries()).map(([userId, roles]) => ({
      userId,
      roles,
    }));
  }

  /**
   * Clean up expired roles
   */
  cleanupExpiredRoles(): number {
    let count = 0;
    const now = new Date();

    for (const [userId, roles] of this.userRoles.entries()) {
      const validRoles = roles.filter(
        (r) => !r.expiryDate || r.expiryDate >= now
      );

      if (validRoles.length !== roles.length) {
        count += roles.length - validRoles.length;

        if (validRoles.length === 0) {
          this.userRoles.delete(userId);
        } else {
          this.userRoles.set(userId, validRoles);
        }
      }
    }

    return count;
  }

  /**
   * Clear all roles
   */
  clearAll(): void {
    this.userRoles.clear();
  }

  /**
   * Export roles (for persistence)
   */
  exportRoles(): Array<UserRoles> {
    const allRoles: UserRoles[] = [];
    for (const roles of this.userRoles.values()) {
      allRoles.push(...roles);
    }
    return allRoles;
  }

  /**
   * Import roles (from persistence)
   */
  importRoles(roles: UserRoles[]): void {
    this.clearAll();
    for (const userRole of roles) {
      this.assignRoles(userRole);
    }
  }
}

/**
 * Helper function to create user roles
 */
export function createUserRoles(
  userId: string,
  roles: Role[],
  permissions: Permission[] = [],
  programId?: string,
  assignedBy: string = "system",
  expiryDate?: Date
): UserRoles {
  return {
    userId,
    programId,
    roles,
    permissions,
    assignedBy,
    assignedDate: new Date(),
    expiryDate,
  };
}

/**
 * Default role assignments for common scenarios
 */
export const DEFAULT_ROLES = {
  /**
   * Assign default roles for a program manager
   */
  programManager: (userId: string, programId: string): UserRoles =>
    createUserRoles(userId, ["program_manager"], [], programId),

  /**
   * Assign default roles for a project manager
   */
  projectManager: (userId: string, programId: string): UserRoles =>
    createUserRoles(userId, ["project_manager"], [], programId),

  /**
   * Assign default roles for a team member
   */
  teamMember: (userId: string, programId: string): UserRoles =>
    createUserRoles(userId, ["team_member"], [], programId),

  /**
   * Assign default roles for a reviewer
   */
  reviewer: (userId: string, programId: string): UserRoles =>
    createUserRoles(userId, ["reviewer"], [], programId),

  /**
   * Assign default roles for an approver
   */
  approver: (userId: string, programId: string): UserRoles =>
    createUserRoles(userId, ["approver"], [], programId),

  /**
   * Assign default roles for a stakeholder
   */
  stakeholder: (userId: string, programId: string): UserRoles =>
    createUserRoles(userId, ["stakeholder"], [], programId),

  /**
   * Assign default roles for a viewer
   */
  viewer: (userId: string, programId: string): UserRoles =>
    createUserRoles(userId, ["viewer"], [], programId),

  /**
   * Assign admin role (global, no program scope)
   */
  admin: (userId: string): UserRoles =>
    createUserRoles(userId, ["admin"], []),
};
