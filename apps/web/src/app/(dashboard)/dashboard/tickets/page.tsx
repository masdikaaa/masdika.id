import { Metadata } from 'next';
import TicketsClient from './TicketsClient';

export const metadata: Metadata = {
  title: 'Support Tickets',
  description: 'Manage your support tickets.',
};

export default function TicketsPage() {
  return <TicketsClient />;
}
