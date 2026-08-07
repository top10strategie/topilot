"use client";

import { usePathname, useRouter } from "next/navigation";
import { DrawerBody, DrawerFooterActions } from "@/components/drawers/drawer-section";
import type { DrawerHelpers } from "@/components/drawers/drawer-stack-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSanitizedWikiHtml } from "@/lib/wiki/sanitize-html-client";
import type { WikiListItem } from "@/lib/wiki/types";

type WikiConsultationDrawerProps = {
  wiki: WikiListItem;
  helpers: DrawerHelpers<null>;
};

/**
 * Tiroir de consultation wiki — footer « Aller aux wikis » hors page /wikis.
 */
export function WikiConsultationDrawer({
  wiki,
  helpers,
}: WikiConsultationDrawerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const showGoToWikis = pathname !== "/wikis";
  const contentHtml = useSanitizedWikiHtml(wiki.content_html);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DrawerBody>
        <div className="grid gap-1 text-sm">
          <p className="text-muted-foreground">Titre</p>
          <p className="font-medium">{wiki.title}</p>
        </div>

        <div className="grid gap-1 text-sm">
          <p className="text-muted-foreground">Catégories</p>
          <div className="flex flex-wrap gap-1">
            {wiki.categories.length === 0 ? (
              <span>—</span>
            ) : (
              wiki.categories.map((category) => (
                <Badge key={category.id} variant="secondary">
                  {category.label}
                </Badge>
              ))
            )}
          </div>
        </div>

        <div className="grid gap-1 text-sm">
          <p className="text-muted-foreground">Tags</p>
          <div className="flex flex-wrap gap-1">
            {wiki.tags.length === 0 ? (
              <span>—</span>
            ) : (
              wiki.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))
            )}
          </div>
        </div>

        <div
          className="max-w-none text-sm leading-relaxed [&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mb-1.5 [&_h3]:text-base [&_h3]:font-semibold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:underline [&_img]:my-2 [&_img]:max-w-full [&_img]:rounded-md"
          dangerouslySetInnerHTML={{
            __html: contentHtml,
          }}
        />
      </DrawerBody>

      <DrawerFooterActions>
        <Button
          type="button"
          variant="outline"
          onClick={() => helpers.dismiss()}
        >
          Fermer
        </Button>
        {showGoToWikis ? (
          <Button
            type="button"
            onClick={() => {
              helpers.dismiss();
              router.push("/wikis");
            }}
          >
            Aller aux wikis
          </Button>
        ) : null}
      </DrawerFooterActions>
    </div>
  );
}
