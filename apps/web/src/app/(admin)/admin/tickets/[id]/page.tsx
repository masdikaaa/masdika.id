import { Metadata } from 'next';
import AdminTicketThreadClient from './AdminTicketThreadClient';

export const metadata: Metadata = {
  title: 'Manage Ticket | Admin',
  description: 'View and reply to customer support ticket.',
};

export default async function AdminTicketThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminTicketThreadClient ticketId={id} />;
}
