import { Metadata } from 'next';
import TicketThreadClient from './TicketThreadClient';

export const metadata: Metadata = {
  title: 'Ticket Thread',
  description: 'View your support ticket.',
};

export default async function TicketThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TicketThreadClient ticketId={id} />;
}
