import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "./admin.css";
import "../careers/job-visuals.css";

const arabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
});

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={`hz-os-root ${arabic.variable}`} dir="ltr" lang="en">
      {children}
    </div>
  );
}
