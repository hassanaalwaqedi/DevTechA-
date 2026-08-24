import { AdminShell } from "@/components/admin-shell";
import { AdminProductsClient } from "@/components/admin-products-client";
export const dynamic = "force-dynamic";
export default function AdminProductsPage() { return <AdminShell active="products"><div className="admin-top"><div><h1>Products</h1><p>Manage the products shown across the company site.</p></div></div><AdminProductsClient /></AdminShell>; }
