'use client';

import React, { useEffect, useMemo, useState } from 'react';

// shadcn/ui components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

// --- Sources we can toggle between ---
type Source = 'postgres' | 'mongo-embedded' | 'mongo-referencing';

// Wire up the endpoints we expect your backend to expose:
//   GET    /<prefix>/stores?page=1&limit=10            -> { page, limit, total?, stores: [ { id, name, url, offercount } ] }
//   POST   /<prefix>/stores                            -> { id, name, url }
//   PUT    /<prefix>/stores/:id                        -> { id, name, url }
//   DELETE /<prefix>/stores/:id                        -> { ok: true }
// This UI will also accept responses that use `products` or `data` instead of `stores` for compatibility.

type StoreRow = {
  id: string;
  name: string;
  url: string;
  offercount?: string | number;
};

type ListResponse = {
  page?: number;
  limit?: number;
  total?: number;
  stores?: StoreRow[];
  products?: StoreRow[]; // compatibility with your example
  data?: StoreRow[]; // generic fallback
};

function pickRows(json: any): StoreRow[] {
  if (!json) return [];
  if (Array.isArray(json.stores)) return json.stores;
  if (Array.isArray(json.products)) return json.products; // example payload
  if (Array.isArray(json.data)) return json.data;
  if (Array.isArray(json.items)) return json.items;
  return [];
}

function useStores(prefix: string, page: number, limit: number) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<StoreRow[]>([]);
  const [total, setTotal] = useState<number | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const url = `${prefix}/stores?page=${page}&limit=${limit}`;
    setLoading(true);
    setError(null);
    fetch(url, { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        const json: ListResponse = await r.json();
        if (cancelled) return;
        setRows(pickRows(json));
        setTotal(json.total);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message || 'Fetch error');
        setRows([]);
        setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [prefix, page, limit]);

  return { loading, error, rows, total };
}

export default function Page() {
  // Force dark mode globally
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.add('dark');
    }
  }, []);
  // Persist selected source in localStorage (so it survives reloads)
  const [source, setSource] = useState<Source>(() => {
    if (typeof window === 'undefined') return 'postgres';
    const saved = window.localStorage.getItem('db_source') as Source | null;
    return saved ?? 'postgres';
  });
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('db_source', source);
    }
  }, [source]);

  const apiPrefix =
    source === 'postgres'
      ? '/postgres'
      : source === 'mongo-embedded'
      ? '/mongo-embedded'
      : '/mongo-referencing';

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { loading, error, rows, total } = useStores(apiPrefix, page, limit);

  const totalPages = useMemo(() => {
    if (typeof total === 'number' && total >= 0)
      return Math.max(1, Math.ceil(total / limit));
    // fallback when API doesn't return total: show next if we got a full page
    return undefined;
  }, [total, limit]);

  const canPrev = page > 1;
  const canNext = totalPages ? page < totalPages : rows.length === limit; // optimistic fallback

  // Create / Edit modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function resetForm() {
    setFormName('');
    setFormUrl('');
    setMsg(null);
  }

  async function refetch() {
    // trigger useEffect by toggling page if possible, else reassign same state
    setPage((p) => p);
  }

  async function onCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim() || !formUrl.trim()) {
      setMsg('Bitte Name und URL ausfüllen.');
      return;
    }
    try {
      setBusy(true);
      setMsg(null);
      const r = await fetch(`${apiPrefix}/stores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName.trim(), url: formUrl.trim() }),
      });
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      setCreateOpen(false);
      resetForm();
      await refetch();
    } catch (e: any) {
      setMsg(e?.message || 'Fehler beim Erstellen');
    } finally {
      setBusy(false);
    }
  }

  function openEdit(row: StoreRow) {
    setEditId(row.id);
    setFormName(row.name);
    setFormUrl(row.url);
    setMsg(null);
    setEditOpen(true);
  }

  async function onEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    if (!formName.trim() || !formUrl.trim()) {
      setMsg('Bitte Name und URL ausfüllen.');
      return;
    }
    try {
      setBusy(true);
      setMsg(null);
      const r = await fetch(`${apiPrefix}/stores/${encodeURIComponent(editId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName.trim(), url: formUrl.trim() }),
      });
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      setEditOpen(false);
      setEditId(null);
      resetForm();
      await refetch();
    } catch (e: any) {
      setMsg(e?.message || 'Fehler beim Aktualisieren');
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm('Diesen Store wirklich löschen?')) return;
    try {
      setBusy(true);
      const r = await fetch(`${apiPrefix}/stores/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      await refetch();
    } catch (e) {
      alert((e as any)?.message || 'Fehler beim Löschen');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground p-6 max-w-5xl mx-auto space-y-6">
      <header className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">Stores</h1>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm">Quelle:</span>
          <ToggleGroup
            type="single"
            value={source}
            onValueChange={(v) => {
              if (!v) return;
              setSource(v as Source);
              setPage(1);
            }}
            className="border rounded-md p-1"
          >
            <ToggleGroupItem value="postgres" aria-label="Postgres">Postgres</ToggleGroupItem>
            <ToggleGroupItem value="mongo-embedded" aria-label="Mongo Embedded">Mongo (Embedded)</ToggleGroupItem>
            <ToggleGroupItem value="mongo-referencing" aria-label="Mongo Referencing">Mongo (Ref)</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="w-full sm:w-auto flex items-center gap-2">
          <Label className="text-sm" htmlFor="page-size">Page size</Label>
          <Select value={String(limit)} onValueChange={(v) => { setPage(1); setLimit(Number(v)); }}>
            <SelectTrigger id="page-size" className="w-28">
              <SelectValue placeholder="Size" />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100].map((n) => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setCreateOpen(true)} disabled={busy}>+ Neuer Store</Button>
        </div>
      </header>

      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => canPrev && setPage((p) => p - 1)} disabled={!canPrev}>Prev</Button>
        <span className="text-sm tabular-nums">Seite {page}{totalPages ? ` / ${totalPages}` : ''}</span>
        <Button variant="outline" onClick={() => canNext && setPage((p) => p + 1)} disabled={!canNext}>Next</Button>
      </div>

      <div className="overflow-auto rounded border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Store Name</TableHead>
              <TableHead>URL</TableHead>
              <TableHead className="text-right">Offers</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={4}>Lade…</TableCell>
              </TableRow>
            )}
            {error && !loading && (
              <TableRow>
                <TableCell colSpan={4} className="text-red-600">{error}</TableCell>
              </TableRow>
            )}
            {!loading && !error && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>Keine Daten</TableCell>
              </TableRow>
            )}
            {!loading && !error && rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="whitespace-nowrap">{row.name}</TableCell>
                <TableCell>
                  <a
                    href={row.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline-offset-2 hover:underline break-all"
                  >
                    {row.url}
                  </a>
                </TableCell>
                <TableCell className="text-right tabular-nums">{Number(row.offercount ?? 0)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => openEdit(row)}>Bearbeiten</Button>
                    <Button variant="destructive" size="sm" onClick={() => onDelete(row.id)}>Löschen</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => { if (!o) { setCreateOpen(false); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neuen Store erstellen</DialogTitle>
          </DialogHeader>
          <form onSubmit={onCreateSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="create-name">Name</Label>
              <Input id="create-name" value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="create-url">URL</Label>
              <Input id="create-url" value={formUrl} onChange={(e) => setFormUrl(e.target.value)} />
            </div>
            {msg && <p className="text-sm text-destructive">{msg}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }}>Abbrechen</Button>
              <Button type="submit" disabled={busy}>Erstellen</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => { if (!o) { setEditOpen(false); setEditId(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Store bearbeiten</DialogTitle>
          </DialogHeader>
          <form onSubmit={onEditSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="edit-name">Name</Label>
              <Input id="edit-name" value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-url">URL</Label>
              <Input id="edit-url" value={formUrl} onChange={(e) => setFormUrl(e.target.value)} />
            </div>
            {msg && <p className="text-sm text-destructive">{msg}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setEditOpen(false); setEditId(null); resetForm(); }}>Abbrechen</Button>
              <Button type="submit" disabled={busy}>Speichern</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <p className="text-xs text-gray-500">Quelle: <code>{apiPrefix}</code></p>
    </main>
  );
}
