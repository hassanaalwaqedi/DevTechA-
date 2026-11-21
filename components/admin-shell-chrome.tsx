"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  AudioLines,
  Bell,
  BriefcaseBusiness,
  Calendar,
  ChevronDown,
  Database,
  Home,
  LogOut,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  PlayCircle,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  Zap,
} from "lucide-react";
import {
  AdminAgentWorkspace,
  type AgentToolInspectorItem,
} from "@/components/admin-agent-workspace";
import { Modal, StatusBadge } from "@/components/admin-ui/primitives";
import type { AgentPageContext } from "@/lib/intelligence/types";

interface ShellSearchResult {
  id: string;
  category: "crm" | "recruitment" | "jobs" | "products" | "tasks" | "team";
  title: string;
  subtitle: string;
  badge: string;
  href: string;
}

export interface ShellNavItem {
  id: string;
  label: string;
  href: string;
  icon:
    | "overview"
    | "agent"
    | "crm"
    | "applications"
    | "jobs"
    | "products"
    | "demonstrations"
    | "team"
    | "audit"
    | "settings";
}

export interface ShellNavGroup {
  label: string;
  items: ShellNavItem[];
}

export interface ShellNotification {
  id: string;
  title: string;
  summary: string;
  href: string;
  severity: "info" | "attention" | "urgent";
  module: string;
  createdAt: string;
}

const ICONS = {
  overview: Home,
  agent: AudioLines,
  crm: Database,
  applications: Users,
  jobs: BriefcaseBusiness,
  products: Package,
  demonstrations: PlayCircle,
  team: Users,
  audit: ShieldCheck,
  settings: Settings,
} as const;

const SIDEBAR_STORAGE_KEY = "hirzexa_sidebar_collapsed";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "HZ";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AdminShellChrome({
  active,
  navGroups,
  notifications,
  actor,
  canUseAgent,
  canViewCrm = true,
  canViewAudit = true,
  canViewSettings = false,
  canManageTeam = false,
  searchPlaceholder = "Search authorized records or ask HIRZEXA...",
  agentTools = [],
  envStatus = "Production",
  children,
}: {
  active: string;
  navGroups: ShellNavGroup[];
  notifications: ShellNotification[];
  actor: {
    fullName: string;
    email: string;
    roleLabel: string;
    scope: string;
    mfaEnrolled: boolean;
  };
  canUseAgent: boolean;
  canViewCrm?: boolean;
  canViewAudit?: boolean;
  canViewSettings?: boolean;
  canManageTeam?: boolean;
  searchPlaceholder?: string;
  agentTools?: AgentToolInspectorItem[];
  envStatus?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ShellSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerContext, setDrawerContext] = useState<AgentPageContext>({
    route: pathname || "/admin",
  });
  const [drawerPrompt, setDrawerPrompt] = useState<string | undefined>(undefined);
  const [signingOut, setSigningOut] = useState(false);

  const notifRef = useRef<HTMLDivElement | null>(null);
  const accountRef = useRef<HTMLDivElement | null>(null);

  const allNavItems = useMemo(
    () => navGroups.flatMap((group) => group.items),
    [navGroups]
  );

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (saved === "1") setCollapsed(true);
    } catch {}
  }, []);

  function toggleSidebar() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  }

  useEffect(() => {
    setMobileNavOpen(false);
    setDrawerContext((prev) =>
      prev.route === pathname ? prev : { route: pathname || "/admin" }
    );
  }, [pathname]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (notifRef.current && !notifRef.current.contains(target)) {
        setNotifOpen(false);
      }
      if (accountRef.current && !accountRef.current.contains(target)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      const isEditable =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        (event.target as HTMLElement | null)?.isContentEditable;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((prev) => !prev);
      } else if (event.key === "/" && !isEditable && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        setCommandQuery("");
        setCommandOpen(true);
      } else if (event.key === "Escape") {
        setDrawerOpen(false);
        setCommandOpen(false);
        setNotifOpen(false);
        setAccountOpen(false);
        setMobileNavOpen(false);
      }
    };

    const onAskEvent = (event: Event) => {
      if (!canUseAgent) return;
      const detail = (
        event as CustomEvent<{
          prompt?: string;
          pageContext?: AgentPageContext;
        }>
      ).detail;
      if (detail?.pageContext) setDrawerContext(detail.pageContext);
      setDrawerPrompt(detail?.prompt);
      setDrawerOpen(true);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("hirzexa:ask-agent", onAskEvent);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("hirzexa:ask-agent", onAskEvent);
    };
  }, [canUseAgent]);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      router.push("/admin/login");
      router.refresh();
    }
  }

  const filteredNavItems = useMemo(() => {
    const q = commandQuery.trim().toLowerCase();
    if (!q) return allNavItems;
    return allNavItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) || item.href.toLowerCase().includes(q)
    );
  }, [allNavItems, commandQuery]);

  // Debounced live permission-aware global search
  useEffect(() => {
    if (!commandOpen) return;
    const q = commandQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    setSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) {
          setSearchResults([]);
          return;
        }
        const data = await res.json();
        setSearchResults(Array.isArray(data.results) ? data.results : []);
      } catch {
        // Ignore aborted searches
      } finally {
        setSearching(false);
      }
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [commandOpen, commandQuery]);

  const urgentNotifCount = notifications.filter(
    (n) => n.severity === "urgent" || n.severity === "attention"
  ).length;

  return (
    <div className={`hz-shell ${collapsed ? "is-collapsed" : ""}`}>
      {mobileNavOpen ? (
        <div
          className="hz-overlay"
          style={{ zIndex: 28, justifyContent: "flex-start" }}
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <aside
        className={`hz-sidebar ${mobileNavOpen ? "is-mobile-open" : ""}`}
        aria-label="HIRZEXA Workspace Navigation"
      >
        <div className="hz-sidebar-head">
          <Link href="/admin" className="hz-brand-link" title="HIRZEXA Intelligence">
            <Image
              className="hz-brand-mark"
              src="/brand/hirzexa-mark.png"
              alt=""
              width={28}
              height={28}
            />
            {!collapsed ? (
              <span className="hz-brand-stack">
                <span className="hz-brand-name">HIRZEXA</span>
                <span className="hz-brand-pill">INTELLIGENCE</span>
              </span>
            ) : null}
          </Link>
          {!collapsed ? (
            <button
              type="button"
              className="hz-icon-btn hz-collapse-btn"
              onClick={toggleSidebar}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <PanelLeftClose size={14} />
            </button>
          ) : null}
        </div>

        {/* Featured Sidebar Ask HIRZEXA Trigger (Matches Reference) */}
        {canUseAgent ? (
          <div className="hz-sidebar-cta-wrap">
            <button
              type="button"
              className="hz-sidebar-ask-btn"
              onClick={() => {
                setDrawerPrompt(undefined);
                setDrawerOpen(true);
              }}
              title="Ask HIRZEXA (Ctrl K)"
            >
              <span className="hz-sidebar-ask-left">
                <Sparkles size={14} color="#818CF8" />
                {!collapsed ? <span>Ask HIRZEXA</span> : null}
              </span>
              {!collapsed ? <kbd>Ctrl K</kbd> : null}
            </button>
          </div>
        ) : null}

        <nav className="hz-sidebar-nav" aria-label="Authorized Modules">
          {allNavItems.map((item) => {
            const Icon = ICONS[item.icon];
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`hz-nav-item ${active === item.id ? "active" : ""}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={16} />
                {!collapsed ? <span>{item.label}</span> : null}
              </Link>
            );
          })}
        </nav>

        <div className="hz-sidebar-foot">
          {collapsed ? (
            <button
              type="button"
              className="hz-icon-btn"
              style={{ width: "100%" }}
              onClick={toggleSidebar}
              aria-label="Expand sidebar"
              title="Expand sidebar"
            >
              <PanelLeftOpen size={15} />
            </button>
          ) : canViewSettings ? (
            <Link href="/admin/settings" className="hz-operator-card">
              <div className="hz-operator-top">
                <span className="hz-live-dot" aria-hidden="true" />
                <strong className="hz-operator-name">{actor.fullName}</strong>
              </div>
              <div className="hz-operator-role">
                {actor.roleLabel} · {actor.scope === "all" ? "All Scope" : `${actor.scope} scope`}
              </div>
              <div className="hz-operator-email">{actor.email}</div>
            </Link>
          ) : (
            <div className="hz-operator-card">
              <div className="hz-operator-top">
                <span className="hz-live-dot" aria-hidden="true" />
                <strong className="hz-operator-name">{actor.fullName}</strong>
              </div>
              <div className="hz-operator-role">
                {actor.roleLabel} · {actor.scope === "all" ? "All Scope" : `${actor.scope} scope`}
              </div>
              <div className="hz-operator-email">{actor.email}</div>
            </div>
          )}
        </div>
      </aside>

      <div className="hz-main-column">
        <header className="hz-topbar">
          <div className="hz-topbar-left">
            <button
              type="button"
              className="hz-icon-btn hz-mobile-menu-btn"
              onClick={() => setMobileNavOpen((o) => !o)}
              aria-label="Toggle navigation menu"
            >
              {mobileNavOpen ? <X size={16} /> : <Menu size={16} />}
            </button>

            <button
              type="button"
              className="hz-global-search"
              onClick={() => {
                setCommandQuery("");
                setCommandOpen(true);
              }}
              aria-label="Open global search and quick commands"
            >
              <span className="hz-global-search-inner">
                <Search size={14} />
                <span>{searchPlaceholder}</span>
              </span>
              <kbd>/</kbd>
            </button>
          </div>

          <div className="hz-topbar-right">
            {canViewSettings ? (
              <Link
                href="/admin/settings"
                className="hz-env-pill"
                title="Live runtime environment status"
              >
                <span className="hz-live-dot" aria-hidden="true" />
                <span>{envStatus}</span>
              </Link>
            ) : (
              <span className="hz-env-pill" title="Live runtime environment status">
                <span className="hz-live-dot" aria-hidden="true" />
                <span>{envStatus}</span>
              </span>
            )}

            {/* Real Business Events Notifications Popover */}
            <div className="hz-popover-wrap" ref={notifRef}>
              <button
                type="button"
                className="hz-icon-btn"
                onClick={() => {
                  setNotifOpen((o) => !o);
                  setAccountOpen(false);
                }}
                aria-label="Operational activity notifications"
                aria-expanded={notifOpen}
              >
                <Bell size={15} />
                {urgentNotifCount > 0 || notifications.length > 0 ? (
                  <span className="hz-notif-dot" />
                ) : null}
              </button>

              {notifOpen ? (
                <div className="hz-popover" role="region" aria-label="Recent business events">
                  <div className="hz-popover-head">
                    <span>Operational Activity</span>
                    <StatusBadge tone="blue">{notifications.length} recent</StatusBadge>
                  </div>
                  <div className="hz-popover-list">
                    {notifications.length > 0 ? (
                      notifications.map((n) => (
                        <Link
                          key={n.id}
                          href={n.href}
                          className="hz-popover-item"
                          onClick={() => setNotifOpen(false)}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 8,
                            }}
                          >
                            <strong>{n.title}</strong>
                            <StatusBadge
                              tone={
                                n.severity === "urgent"
                                  ? "rose"
                                  : n.severity === "attention"
                                  ? "amber"
                                  : "neutral"
                              }
                            >
                              {n.module}
                            </StatusBadge>
                          </div>
                          <small>{n.summary}</small>
                        </Link>
                      ))
                    ) : (
                      <div
                        style={{
                          padding: 20,
                          textAlign: "center",
                          color: "var(--hz-text-muted)",
                          fontSize: 12.5,
                        }}
                      >
                        No recent authorized activity yet.
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            {canViewCrm ? (
              <Link
                href="/admin/crm"
                className="hz-icon-btn hz-hide-xs"
                aria-label="Discovery calls and CRM schedule"
                title="Discovery Calls & Sales CRM"
              >
                <Calendar size={15} />
              </Link>
            ) : null}

            {canViewAudit ? (
              <Link
                href="/admin/audit"
                className="hz-icon-btn hz-hide-xs"
                aria-label="System activity and audit logs"
                title="Audit Logs & Live Events"
              >
                <Zap size={15} />
              </Link>
            ) : null}

            {canUseAgent ? (
              <button
                type="button"
                className="hz-ask-topbar-btn"
                onClick={() => {
                  setDrawerPrompt(undefined);
                  setDrawerOpen(true);
                }}
              >
                <Sparkles size={14} />
                <span>Ask HIRZEXA</span>
              </button>
            ) : null}

            {/* Account & Security Popover */}
            <div className="hz-popover-wrap" ref={accountRef}>
              <button
                type="button"
                className="hz-avatar-btn"
                onClick={() => {
                  setAccountOpen((o) => !o);
                  setNotifOpen(false);
                }}
                aria-expanded={accountOpen}
                aria-label="Account menu"
              >
                <span className="hz-avatar-circle">{getInitials(actor.fullName)}</span>
                <span className="hz-avatar-name">{actor.fullName}</span>
                <ChevronDown size={13} color="#64748B" />
              </button>

              {accountOpen ? (
                <div className="hz-popover" style={{ width: 280 }}>
                  <div
                    style={{
                      padding: "12px 14px",
                      borderBottom: "1px solid var(--hz-border-subtle)",
                    }}
                  >
                    <strong style={{ display: "block", fontSize: 13, color: "var(--hz-text-strong)" }}>
                      {actor.fullName}
                    </strong>
                    <span
                      style={{
                        display: "block",
                        fontSize: 12,
                        color: "var(--hz-text-secondary)",
                        marginTop: 2,
                      }}
                    >
                      {actor.email}
                    </span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                      <StatusBadge tone="blue">{actor.roleLabel}</StatusBadge>
                      <StatusBadge tone={actor.mfaEnrolled ? "emerald" : "neutral"}>
                        {actor.mfaEnrolled ? "MFA Verified" : "Password Auth"}
                      </StatusBadge>
                    </div>
                  </div>
                  <div style={{ padding: 8, display: "grid", gap: 4 }}>
                    {canViewSettings ? (
                      <Link
                        href="/admin/settings"
                        className="hz-nav-item"
                        onClick={() => setAccountOpen(false)}
                      >
                        <Settings size={15} />
                        <span>Profile &amp; Settings</span>
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      className="hz-nav-item"
                      style={{
                        border: 0,
                        background: "transparent",
                        width: "100%",
                        cursor: "pointer",
                        color: "#FDA4AF",
                      }}
                      disabled={signingOut}
                      onClick={() => void handleSignOut()}
                    >
                      <LogOut size={15} />
                      <span>{signingOut ? "Signing out…" : "Sign Out"}</span>
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main
          className={`hz-content ${
            active === "overview" || active === "crm" || active === "team"
              ? "hz-content-cc"
              : active === "agent"
              ? "hz-content-agent"
              : ""
          }`}
        >
          {children}
        </main>
      </div>

      {/* Permission-Aware Global Search & Command Palette */}
      <Modal
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        title="Authorized Global Search"
        subtitle={`Scoped to your ${actor.roleLabel} permissions (${actor.scope} scope).`}
        width={560}
      >
        <input
          autoFocus
          value={commandQuery}
          onChange={(e) => setCommandQuery(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label="Global permission-scoped search"
          onKeyDown={(e) => {
            if (e.key === "Enter" && commandQuery.trim()) {
              if (searchResults.length === 1) {
                setCommandOpen(false);
                router.push(searchResults[0].href);
              } else if (filteredNavItems.length === 1 && searchResults.length === 0) {
                setCommandOpen(false);
                router.push(filteredNavItems[0].href);
              } else if (canUseAgent) {
                const q = commandQuery.trim();
                setCommandOpen(false);
                setDrawerPrompt(q);
                setDrawerOpen(true);
              }
            }
          }}
        />

        {canUseAgent && commandQuery.trim().length > 2 ? (
          <button
            type="button"
            className="hz-list-row"
            style={{
              width: "100%",
              marginTop: 10,
              cursor: "pointer",
              borderColor: "rgba(59,130,246,0.35)",
            }}
            onClick={() => {
              const q = commandQuery.trim();
              setCommandOpen(false);
              setDrawerPrompt(q);
              setDrawerOpen(true);
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Sparkles size={15} color="#60A5FA" />
              <div style={{ textAlign: "start" }}>
                <strong>Ask HIRZEXA Intelligence</strong>
                <small>&ldquo;{commandQuery.trim()}&rdquo;</small>
              </div>
            </div>
            <ArrowRight size={14} color="#60A5FA" />
          </button>
        ) : null}

        {commandQuery.trim().length >= 2 ? (
          <div className="hz-row-list" style={{ marginTop: 12 }}>
            {searching ? (
              <div style={{ padding: "8px 4px", fontSize: 12.5, color: "var(--hz-text-muted)" }}>
                Searching authorized records…
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((hit) => (
                <Link
                  key={hit.id}
                  href={hit.href}
                  className="hz-list-row"
                  onClick={() => setCommandOpen(false)}
                >
                  <div style={{ minWidth: 0 }}>
                    <strong>{hit.title}</strong>
                    <small>{hit.subtitle}</small>
                  </div>
                  <StatusBadge tone="blue">{hit.category}</StatusBadge>
                </Link>
              ))
            ) : (
              <div style={{ padding: "8px 4px", fontSize: 12.5, color: "var(--hz-text-muted)" }}>
                No matching records found within your authorized modules.
              </div>
            )}
          </div>
        ) : null}

        <div className="hz-row-list" style={{ marginTop: 12 }}>
          {filteredNavItems.map((item) => {
            const Icon = ICONS[item.icon];
            return (
              <Link
                key={item.id}
                href={item.href}
                className="hz-list-row"
                onClick={() => setCommandOpen(false)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Icon size={15} color="#94A3B8" />
                  <strong>{item.label}</strong>
                </div>
                <ArrowRight size={13} color="#64748B" />
              </Link>
            );
          })}
        </div>
      </Modal>

      {/* Persistent Contextual AI Agent SlideOver Drawer */}
      {drawerOpen && canUseAgent ? (
        <div
          className="hz-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDrawerOpen(false);
          }}
        >
          <div
            className="hz-slideover"
            style={{ width: "min(540px, 100vw)" }}
            role="dialog"
            aria-modal="true"
            aria-label="Ask HIRZEXA Intelligence"
          >
            <AdminAgentWorkspace
              compact
              actorInfo={{
                fullName: actor.fullName,
                roleLabel: actor.roleLabel,
                scope: actor.scope,
              }}
              canManageTeam={canManageTeam}
              tools={agentTools}
              pageContext={drawerContext}
              initialPrompt={drawerPrompt}
              onClose={() => setDrawerOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
