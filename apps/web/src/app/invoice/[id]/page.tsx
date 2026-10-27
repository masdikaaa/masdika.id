import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import InvoiceViewClient from './InvoiceViewClient';
import { decryptDeterministic } from '@/lib/encryption';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return {
    title: id,
  };
}

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let invoice = await prisma.invoice.findUnique({
    where: { invoiceNumber: id },
    include: {
      user: true,
      subscription: {
        include: { plan: true }
      },
      vpsService: true
    }
  });

  if (!invoice) {
    invoice = await prisma.invoice.findUnique({
      where: { merchantOrderId: id },
      include: {
        user: true,
        subscription: {
          include: { plan: true }
        },
        vpsService: true
      }
    });

    if (!invoice) {
      return notFound();
    }
  }

  const isPaid = invoice.status === 'PAID';

  // Decrypt server-side so client component receives plain strings
  const decryptedName = decryptDeterministic(invoice.user.name) || invoice.user.name || 'Valued Customer';
  const decryptedEmail = decryptDeterministic(invoice.user.email) || invoice.user.email;

  const sanitizedInvoice = {
    ...invoice,
    user: {
      ...invoice.user,
      name: decryptedName,
      email: decryptedEmail,
    }
  };

  return <InvoiceViewClient invoice={sanitizedInvoice} isPaid={isPaid} decryptedName={decryptedName} decryptedEmail={decryptedEmail} />;
}