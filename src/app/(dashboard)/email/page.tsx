import type { Metadata } from "next";

import { EmailQueue } from "@/components/email/email-queue";
import { listCondominiums } from "@/services/condominium-service";
import { listEmailQueue, listUnclassifiedEmails } from "@/services/email-service";

export const metadata: Metadata = { title: "Email" };

export default async function EmailPage() {
  const [emails, unclassified, condominiums] = await Promise.all([
    listEmailQueue(),
    listUnclassifiedEmails(),
    listCondominiums(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Email</h1>
        <p className="text-sm text-muted-foreground">
          Da approvare, urgenti, in attesa, bozze e inviate — tutto in un&apos;unica coda di lavoro.
        </p>
      </div>

      <EmailQueue
        emails={emails}
        unclassified={unclassified}
        condominiums={condominiums.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
