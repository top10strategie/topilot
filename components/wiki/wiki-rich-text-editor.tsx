"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Image from "@tiptap/extension-image";
import {
  Image as ImageIcon,
  Link as LinkIcon,
  ListBullets,
  ListNumbers,
  TextB,
  TextItalic,
  TextUnderline,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type WikiRichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  className?: string;
};

/**
 * Éditeur Tiptap wiki : H1–H3, listes, B/I/U, liens, images.
 */
export function WikiRichTextEditor({
  value,
  onChange,
  disabled = false,
  className,
}: WikiRichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Image.configure({ allowBase64: true }),
    ],
    content: value || "<p></p>",
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor: current }) => {
      onChange(current.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "wiki-editor-content max-w-none min-h-40 px-3 py-2 text-sm leading-relaxed focus:outline-none [&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mb-1.5 [&_h3]:text-base [&_h3]:font-semibold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:underline [&_img]:my-2 [&_img]:max-w-full [&_img]:rounded-md",
      },
    },
  });

  if (!editor) {
    return (
      <div
        className={cn(
          "min-h-48 rounded-md border bg-muted/20 px-3 py-2 text-sm text-muted-foreground",
          className,
        )}
      >
        Chargement de l&apos;éditeur…
      </div>
    );
  }

  const setLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL du lien", previous ?? "https://");
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url.trim() })
      .run();
  };

  const addImage = () => {
    const url = window.prompt("URL de l'image");
    if (!url?.trim()) return;
    editor.chain().focus().setImage({ src: url.trim() }).run();
  };

  return (
    <div className={cn("overflow-hidden rounded-md border", className)}>
      <div className="flex flex-wrap gap-1 border-b bg-muted/30 p-1">
        <ToolbarButton
          label="Gras"
          active={editor.isActive("bold")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <TextB className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Italique"
          active={editor.isActive("italic")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <TextItalic className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Souligné"
          active={editor.isActive("underline")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <TextUnderline className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Titre 1"
          active={editor.isActive("heading", { level: 1 })}
          disabled={disabled}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
        >
          H1
        </ToolbarButton>
        <ToolbarButton
          label="Titre 2"
          active={editor.isActive("heading", { level: 2 })}
          disabled={disabled}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          label="Titre 3"
          active={editor.isActive("heading", { level: 3 })}
          disabled={disabled}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          H3
        </ToolbarButton>
        <ToolbarButton
          label="Liste à puces"
          active={editor.isActive("bulletList")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <ListBullets className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Liste numérotée"
          active={editor.isActive("orderedList")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListNumbers className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Lien"
          active={editor.isActive("link")}
          disabled={disabled}
          onClick={setLink}
        >
          <LinkIcon className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Image"
          active={false}
          disabled={disabled}
          onClick={addImage}
        >
          <ImageIcon className="size-4" />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "secondary" : "ghost"}
      className="h-8 min-w-8 px-2"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
