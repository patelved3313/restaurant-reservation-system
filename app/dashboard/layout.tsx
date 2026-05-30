import { DashboardShell } from "@/components/DashboardShell";
import { requireAuthContext } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await requireAuthContext();

  return (
    <DashboardShell userEmail={auth.user.email} userRole={auth.role}>
      {children}
    </DashboardShell>
  );
}
