import { Metadata } from 'next';
import AdminTicketsClient from './AdminTicketsClient';

export const metadata: Metadata = {
  title: 'Manage Support Tickets | Admin',
  description: 'Manage all customer support tickets.',
};

export default function AdminTicketsPage() {
  return <AdminTicketsClient />;
}
