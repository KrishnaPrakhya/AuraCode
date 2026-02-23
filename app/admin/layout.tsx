import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Dashboard | AuraCode',
  description: 'Manage problems, monitor participants, and broadcast updates',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
