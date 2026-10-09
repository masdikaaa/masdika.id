import { Metadata } from 'next';
import TicketsNewClient from './TicketsNewClient';

export const metadata: Metadata = {
  title: 'Open Support Ticket',
  description: 'Open a new support ticket.',
};

export default function TicketsNewPage() {
  return <TicketsNewClient />;
}
