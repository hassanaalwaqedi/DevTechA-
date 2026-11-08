import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { GlassSurface } from "@/components/ui/GlassSurface";

export type CapabilityCardProps = {
  title: string;
  subtitle: string;
  href: string;
  icon: React.ReactNode;
};

export function CapabilityCard({ title, subtitle, href, icon }: CapabilityCardProps) {
  return (
    <GlassSurface as={Link} href={href} variant="card" className="dt-capability-card">
      <div className="dt-capability-card-top">
        <span className="dt-capability-icon" aria-hidden="true">
          {icon}
        </span>
        <span className="dt-capability-arrow" aria-hidden="true">
          <ArrowUpRight size={17} />
        </span>
      </div>
      <div className="dt-capability-card-body">
        <h3 className="dt-capability-title">{title}</h3>
        <p className="dt-capability-subtitle">{subtitle}</p>
      </div>
    </GlassSurface>
  );
}

