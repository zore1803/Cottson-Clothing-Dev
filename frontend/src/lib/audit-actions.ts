// Audit actions and how they read on the Audit log screen (safe to import from client components)
export const AUDIT_ACTIONS: Record<string, string> = {
  "staff.invited": "Invited staff",
  "staff.invite_cancelled": "Cancelled an invite",
  "staff.joined": "Accepted an invite",
  "staff.promoted": "Promoted to superadmin",
  "staff.demoted": "Demoted to admin",
  "staff.removed": "Removed staff",
  "staff.password_reset": "Sent a password reset link",
  "product.added": "Added a product",
  "product.removed": "Removed a product",
  "product.restored": "Restored a product",
  "product.synced": "Synced a product to Medusa",
  "stock.updated": "Changed stock",
  "design.status": "Moved a design in production",
  "design.note": "Edited a design note",
  "quote.updated": "Updated a quote",
};
