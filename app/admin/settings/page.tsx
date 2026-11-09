import { AdminShell } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/auth";
export const dynamic = "force-dynamic";
export default async function AdminSettingsPage() { const {user} = await requireAdmin(); return <AdminShell active="settings"><div className="admin-top"><div><h1>Settings</h1><p>Workspace and notification preferences.</p></div></div><div className="admin-panel"><h2>Admin profile</h2><div className="field-grid"><div className="field"><label>Name</label><input defaultValue="Hassan" /></div><div className="field"><label>Email</label><input defaultValue={user.email || ""} type="email" /></div></div><button className="button-dark">Save changes</button></div></AdminShell>; }
