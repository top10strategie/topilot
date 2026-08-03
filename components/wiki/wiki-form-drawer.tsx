"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Plus } from "@phosphor-icons/react";
import { toast } from "sonner";
import { createCategory, updateCategory } from "@/actions/categories";
import { createWiki, updateWiki } from "@/actions/wikis";
import { CategoryMultiCombobox } from "@/components/categories/category-multi-combobox";
import { LabelEntityFormDrawer } from "@/components/categories/label-entity-form-drawer";
import { DrawerBody, DrawerFooterActions } from "@/components/drawers/drawer-section";
import type { DrawerHelpers } from "@/components/drawers/drawer-stack-context";
import { useDrawerStack } from "@/components/drawers/drawer-stack-context";
import { WikiRichTextEditor } from "@/components/wiki/wiki-rich-text-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CategoryItem } from "@/lib/categories/types";
import type { WikiLinkEntity, WikiListItem } from "@/lib/wiki/types";

type WikiFormDrawerProps = {
  mode: "create" | "edit";
  wiki?: WikiListItem;
  categories: CategoryItem[];
  linkEntity?: WikiLinkEntity;
  linkEntityId?: string;
  helpers: DrawerHelpers<{ id: string; title: string }>;
};

export function WikiFormDrawer({
  mode,
  wiki,
  categories: initialCategories,
  linkEntity,
  linkEntityId,
  helpers,
}: WikiFormDrawerProps) {
  const { pushDrawer } = useDrawerStack();
  const [categories, setCategories] = useState(initialCategories);
  const [title, setTitle] = useState(wiki?.title ?? "");
  const [tags, setTags] = useState((wiki?.tags ?? []).join(", "));
  const [contentHtml, setContentHtml] = useState(
    wiki?.content_html ?? "<p></p>",
  );
  const [selectedCategories, setSelectedCategories] = useState<CategoryItem[]>(
    () => [...(wiki?.categories ?? [])],
  );
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<"title" | "content_html", string>>
  >({});
  const [isPending, startTransition] = useTransition();

  const openCreateCategory = () => {
    void pushDrawer<{ id: string; label: string }>({
      title: "Nouvelle catégorie",
      content: (nestedHelpers) => (
        <LabelEntityFormDrawer
          mode="create"
          entityKind="category"
          helpers={nestedHelpers}
          onCreate={createCategory}
          onUpdate={updateCategory}
        />
      ),
    }).then((created) => {
      if (!created) return;
      const item = { id: created.id, label: created.label };
      setCategories((prev) =>
        [...prev, item].sort((a, b) => a.label.localeCompare(b.label, "fr")),
      );
      setSelectedCategories((prev) => [...prev, item]);
    });
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFieldErrors({});

    startTransition(async () => {
      const formData = new FormData();
      formData.set("title", title);
      formData.set("tags", tags);
      formData.set("content_html", contentHtml);
      for (const category of selectedCategories) {
        formData.append("category_ids", category.id);
      }
      if (mode === "create" && linkEntity && linkEntityId) {
        formData.set("link_entity", linkEntity);
        formData.set("link_entity_id", linkEntityId);
      }

      const result =
        mode === "create"
          ? await createWiki(formData)
          : await updateWiki(wiki!.id, formData);

      if (!result.success) {
        setFieldErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }

      toast.success(mode === "create" ? "Wiki créé." : "Wiki enregistré.");
      helpers.resolve({ id: result.id, title: title.trim() });
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <DrawerBody>
        <div className="grid gap-2">
          <Label htmlFor="wiki_title">
            Titre <span className="text-destructive">*</span>
          </Label>
          <Input
            id="wiki_title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            aria-invalid={Boolean(fieldErrors.title)}
            disabled={isPending}
          />
          {fieldErrors.title ? (
            <p className="text-xs text-destructive">{fieldErrors.title}</p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <Label>Catégories</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2"
              onClick={openCreateCategory}
              disabled={isPending}
            >
              <Plus className="size-3.5" />
              Catégorie
            </Button>
          </div>
          <CategoryMultiCombobox
            items={categories}
            value={selectedCategories}
            onValueChange={setSelectedCategories}
            disabled={isPending}
            placeholder="Catégories…"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="wiki_tags">Tags</Label>
          <Input
            id="wiki_tags"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="séparés par des virgules"
            disabled={isPending}
          />
        </div>

        <div className="grid gap-2">
          <Label>Contenu</Label>
          <WikiRichTextEditor
            value={contentHtml}
            onChange={setContentHtml}
            disabled={isPending}
          />
        </div>
      </DrawerBody>

      <DrawerFooterActions>
        <Button
          type="button"
          variant="outline"
          onClick={() => helpers.dismiss()}
          disabled={isPending}
        >
          Annuler
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "Enregistrement…"
            : mode === "create"
              ? "Créer"
              : "Enregistrer"}
        </Button>
      </DrawerFooterActions>
    </form>
  );
}
