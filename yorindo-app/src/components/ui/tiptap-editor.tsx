'use client'

import { useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Highlight } from '@tiptap/extension-highlight'
import { Link } from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Bold, Italic, Underline as UnderlineIcon, Palette, Highlighter, Link as LinkIcon } from 'lucide-react'

interface TiptapEditorProps {
  value: string
  onChange: (html: string) => void
}

export function TiptapEditor({ value, onChange }: TiptapEditorProps) {
  const [color, setColor] = useState('#166534')
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, bulletList: false, orderedList: false }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Ketik pesan di sini atau tarik variable dari samping...' }),
    ],
    content: value || '',
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'min-h-[280px] p-5 focus:outline-none bg-white rounded-b-xl text-sm leading-relaxed border border-input',
      },
    },
  })

  if (!editor) return <div className="min-h-[280px] border rounded-xl bg-muted animate-pulse" />

  return (
    <div className="border border-input rounded-xl overflow-hidden bg-white">
      <div className="flex flex-wrap items-center gap-1 p-3 border-b bg-muted/50">
        <Button size="sm" variant={editor.isActive('bold') ? 'default' : 'ghost'} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="w-4 h-4" />
        </Button>
        <Button size="sm" variant={editor.isActive('italic') ? 'default' : 'ghost'} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="w-4 h-4" />
        </Button>
        <Button size="sm" variant={editor.isActive('underline') ? 'default' : 'ghost'} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="w-4 h-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 mx-2" />

        <div className="flex items-center gap-2">
          <label className="w-8 h-8 rounded-full border border-input overflow-hidden cursor-pointer">
            <input
              type="color"
              value={color}
              onChange={(e) => {
                setColor(e.target.value)
                editor.chain().focus().setColor(e.target.value).run()
              }}
              className="h-full w-full opacity-0 cursor-pointer"
              title="Pilih warna teks"
            />
          </label>
          <div className="text-xs text-muted-foreground">Warna teks</div>
        </div>

        <Button size="sm" variant="ghost" onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef3c7' }).run()}>
          <Highlighter className="w-4 h-4 text-amber-400" />
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            const url = window.prompt('Masukkan URL:')
            if (url) editor.chain().focus().setLink({ href: url }).run()
          }}
        >
          <LinkIcon className="w-4 h-4" />
        </Button>
      </div>

      <EditorContent editor={editor} />
    </div>
  )
}