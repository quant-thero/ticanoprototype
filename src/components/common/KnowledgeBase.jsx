import React, { useEffect, useState } from 'react';
import { BookOpen, Search, Plus, Archive, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getKnowledgeBase, createKbArticle, updateKbArticle, archiveKbArticle,
} from '../../services/supabaseApi';
import { KB_CATEGORIES } from '../../utils/constants';
import { Modal, EmptyState } from './UI';

/**
 * §8, Knowledge Base.
 *
 * editable = true → Admin: full CRUD
 * editable = false → PM/SM: read-only, can copy resolution into clipboard
 */
export default function KnowledgeBase({ editable = false, currentUser }) {
  const [articles, setArticles] = useState([]);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('all');
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = () => {
    getKnowledgeBase({
      q: q || undefined,
      category: category === 'all' ? undefined : category,
    }).then(({ data }) => setArticles(data)).catch((err) => { console.error('[KnowledgeBase]', err); toast.error('Could not load knowledge base articles'); });
  };

  useEffect(load, [q, category]);

  const handleArchive = (id) => {
    if (!confirm('Archive this article?')) return;
    archiveKbArticle(id).then(() => {
      toast.success('Article archived');
      load();
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-ticano-dark-card rounded-xl border border-gray-100 dark:border-gray-700 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <BookOpen className="text-ticano-red" size={20} />
          <h3 className="font-semibold text-ticano-charcoal dark:text-white">Knowledge Base</h3>
          <span className="text-sm text-gray-500">{articles.length} articles</span>
          <div className="ml-auto flex gap-2 items-center">
            <div className="relative">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search articles…"
                className="pl-7 pr-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm w-48"
              />
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
            >
              <option value="all">All categories</option>
              {KB_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {editable && (
              <button
                onClick={() => { setEditing(null); setShowEditor(true); }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-ticano-red text-white text-sm hover:bg-ticano-red-dark"
              >
                <Plus size={14} /> New Article
              </button>
            )}
          </div>
        </div>
      </div>

      {articles.length === 0 ? (
        <EmptyState title="No articles" message="Try changing the search or category." />
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {articles.map((a) => (
            <div key={a.id} className="bg-white dark:bg-ticano-dark-card rounded-xl border border-gray-100 dark:border-gray-700 p-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h4 className="font-semibold text-ticano-charcoal dark:text-white">{a.title}</h4>
                {editable && (
                  <div className="flex gap-1">
                    <button onClick={() => { setEditing(a); setShowEditor(true); }} className="p-1 text-gray-400 hover:text-ticano-red"><Edit2 size={14} /></button>
                    <button onClick={() => handleArchive(a.id)} className="p-1 text-gray-400 hover:text-orange-600"><Archive size={14} /></button>
                  </div>
                )}
              </div>
              <span className="inline-block text-xs bg-ticano-red-light text-ticano-red-dark px-2 py-0.5 rounded mb-2">{a.category}</span>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{a.body}</p>
              <p className="text-xs text-gray-400 mt-3">Updated {new Date(a.updatedAt).toLocaleDateString()} · {a.author}</p>
              {!editable && (
                <button
                  onClick={() => { navigator.clipboard?.writeText(a.body); toast.success('Resolution copied'); }}
                  className="mt-2 text-xs text-ticano-red hover:underline"
                >
                  Copy resolution
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {editable && (
        <KbEditorModal
          isOpen={showEditor}
          onClose={() => setShowEditor(false)}
          article={editing}
          currentUser={currentUser}
          onSaved={() => { setShowEditor(false); load(); }}
        />
      )}
    </div>
  );
}

function KbEditorModal({ isOpen, onClose, article, currentUser, onSaved }) {
  const [form, setForm] = useState({ title: '', category: KB_CATEGORIES[0], body: '' });

  useEffect(() => {
    if (article) setForm({ title: article.title, category: article.category, body: article.body });
    else setForm({ title: '', category: KB_CATEGORIES[0], body: '' });
  }, [article, isOpen]);

  const save = () => {
    if (!form.title.trim() || !form.body.trim()) return toast.error('Title and body required');
    const data = { ...form, author: currentUser?.name || 'Admin' };
    const promise = article ? updateKbArticle(article.id, data) : createKbArticle(data);
    promise.then(() => {
      toast.success(article ? 'Article updated' : 'Article created');
      onSaved();
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={article ? 'Edit Article' : 'New Article'}>
      <div className="space-y-3">
        <div>
          <label className="text-xs uppercase tracking-wide text-gray-500">Title</label>
          <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm" />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-gray-500">Category</label>
          <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm">
            {KB_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-gray-500">Body</label>
          <textarea rows={8} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm resize-none" />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-sm">Cancel</button>
        <button onClick={save} className="px-4 py-2 rounded-lg bg-ticano-red text-white text-sm">Save</button>
      </div>
    </Modal>
  );
}
