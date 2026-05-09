import { notFound, redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/admin-session';
import { prisma } from '@/lib/prisma';
import { AdminShell } from '@/components/admin/admin-shell';
import { AdminTicketClient } from './ticket-client';

export const dynamic = 'force-dynamic';

export default async function AdminTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) redirect('/admin/signin');
  const { id } = await params;

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, phone: true } },
      order: { select: { id: true, vendorName: true, totalInr: true, placedAt: true, status: true } },
      messages: { orderBy: { createdAt: 'asc' } },
      assignedAgent: { select: { id: true, name: true } },
    },
  });
  if (!ticket) notFound();

  return (
    <AdminShell name={admin.name} role={admin.role}>
      <AdminTicketClient
        ticket={{
          id: ticket.id,
          shortCode: ticket.shortCode,
          subject: ticket.subject,
          category: ticket.category,
          status: ticket.status,
          priority: ticket.priority,
          createdAt: ticket.createdAt.toISOString(),
          resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
          user: ticket.user,
          order: ticket.order ? {
            ...ticket.order,
            placedAt: ticket.order.placedAt.toISOString(),
          } : null,
          assignedAgent: ticket.assignedAgent,
          messages: ticket.messages.map((m) => ({
            id: m.id,
            author: m.author,
            authorName: m.authorName,
            body: m.body,
            createdAt: m.createdAt.toISOString(),
          })),
        }}
      />
    </AdminShell>
  );
}
