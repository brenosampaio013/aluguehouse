import type { ReactNode } from "react";

import { Card } from "@/components/admin/ui/card";
import { EmptyState } from "@/components/admin/ui/empty-state";

/**
 * Seção do portal que ainda não tem dados: diz o que vai aparecer e por que
 * ainda não aparece, sem simular números.
 */
export function ComingSoon({
  icon,
  title,
  description,
  items,
}: {
  icon: ReactNode;
  title: string;
  description: ReactNode;
  items: string[];
}) {
  return (
    <Card>
      <EmptyState icon={icon} title={title} description={description} />
      <div className="border-t border-areia px-5 py-4">
        <h2 className="mb-2 font-semibold">O que vai aparecer aqui</h2>
        <ul className="grid list-disc gap-1 pl-5 text-rocha">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
