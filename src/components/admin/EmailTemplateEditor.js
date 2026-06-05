import React, { useEffect, useRef } from 'react';
import { Bold, Heading1, Heading2, Image, Italic, Link, List, ListOrdered, MousePointerClick, Underline } from 'lucide-react';

function toolbarButton(label, Icon, onClick) {
  return (
    <button
      key={label}
      type="button"
      onClick={onClick}
      title={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 transition-colors hover:border-amber-500 hover:text-amber-600 dark:border-neutral-700 dark:text-neutral-300 dark:hover:text-amber-400"
    >
      <Icon size={16} />
    </button>
  );
}

export default function EmailTemplateEditor({ value, onChange, placeholders = [] }) {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const sync = () => onChange(editorRef.current?.innerHTML || '');

  const command = (name, arg = null) => {
    editorRef.current?.focus();
    document.execCommand(name, false, arg);
    sync();
  };

  const addLink = () => {
    const url = window.prompt('Link URL');
    if (url) command('createLink', url);
  };

  const addButton = () => {
    const label = window.prompt('Button label', 'Order Online for Pickup');
    const url = window.prompt('Button URL or placeholder', '{{online_order_url}}');
    if (!label || !url) return;
    command('insertHTML', `<a href="${url}" style="display:inline-block;background:#b45309;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:8px;font-size:14px;">${label}</a>`);
  };

  const addImage = () => {
    const url = window.prompt('Image URL');
    if (url) command('insertImage', url);
  };

  const insertPlaceholder = (placeholder) => {
    if (!placeholder) return;
    command('insertText', `{{${placeholder}}}`);
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 p-3 dark:border-neutral-800">
        {toolbarButton('Heading 1', Heading1, () => command('formatBlock', 'h1'))}
        {toolbarButton('Heading 2', Heading2, () => command('formatBlock', 'h2'))}
        {toolbarButton('Bold', Bold, () => command('bold'))}
        {toolbarButton('Italic', Italic, () => command('italic'))}
        {toolbarButton('Underline', Underline, () => command('underline'))}
        {toolbarButton('Bulleted List', List, () => command('insertUnorderedList'))}
        {toolbarButton('Numbered List', ListOrdered, () => command('insertOrderedList'))}
        {toolbarButton('Link', Link, addLink)}
        {toolbarButton('Button', MousePointerClick, addButton)}
        {toolbarButton('Image', Image, addImage)}
        <select
          className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200"
          defaultValue=""
          onChange={(event) => {
            insertPlaceholder(event.target.value);
            event.target.value = '';
          }}
        >
          <option value="">Insert placeholder</option>
          {placeholders.map((item) => (
            <option key={item} value={item}>{`{{${item}}}`}</option>
          ))}
        </select>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={sync}
        className="min-h-[420px] overflow-auto p-4 text-sm leading-6 text-neutral-800 outline-none dark:text-neutral-100 [&_a]:text-amber-600 [&_a]:underline [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-semibold [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6"
      />
    </div>
  );
}
