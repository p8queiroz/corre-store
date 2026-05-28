import { AdminClient } from "./AdminClient";

/**
 * Admin panel — no public registration path.
 * Access requires ADMIN role (session check to be wired in middleware).
 * See docs/10-admin-and-rbac.md
 */
export default function AdminPage() {
  return <AdminClient section="overview" />;
}
