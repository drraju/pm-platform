import { PageHeader } from "@/components/layout/page-header";

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        description="Delivery alerts and workflow updates will appear here."
        eyebrow="Workspace"
        title="Notifications"
      />

      <section className="rounded-md border border-slate-200 bg-white px-5 py-8 shadow-soft">
        <p className="text-sm text-slate-500">No notifications yet.</p>
      </section>
    </div>
  );
}
