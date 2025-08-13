import React, { useEffect, useMemo, useState } from "react";

// --- Tiny helpers -----------------------------------------------------------
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const STORAGE_KEY = "anime-tierlist-v1";

const TIER_COLUMNS = ["S", "A", "B", "C", "D"];
const STATUSES = ["PLANNED", "WATCHING", "COMPLETED", "DROPPED"];

// Text-Badge (deutsch) für den jeweiligen Status
function statusBadgeText(status) {
  switch (status) {
    case "PLANNED": return "GEPLANT";
    case "WATCHING": return "AM SCHAUEN";
    case "COMPLETED": return "FERTIG";
    case "DROPPED": return "ABGEBROCHEN";
    default: return "";
  }
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    console.warn("Failed to load data", e);
    return [];
  }
}

function saveData(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn("Failed to save data", e);
  }
}

// --- AniList search (GraphQL) ----------------------------------------------
async function anilistSearch(query) {
  if (!query || query.trim().length < 2) return [];
  const body = {
    query: `query ($q: String) {
      Page(perPage: 8) {
        media(search: $q, type: ANIME) {
          id
          title { romaji english native }
          seasonYear
          episodes
          genres
          coverImage { large color }
        }
      }
    }`,
    variables: { q: query.trim() }
  };
  try {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("AniList error " + res.status);
    const json = await res.json();
    const list = json?.data?.Page?.media || [];
    return list.map(m => ({
      anilistId: m.id,
      title: m.title?.english || m.title?.romaji || m.title?.native || "Unbekannt",
      year: m.seasonYear || null,
      episodes: m.episodes || null,
      genres: m.genres || [],
      coverUrl: m.coverImage?.large || "",
      color: m.coverImage?.color || null,
      altTitles: [m.title?.romaji, m.title?.native, m.title?.english].filter(Boolean)
    }));
  } catch (err) {
    console.warn("AniList search failed", err);
    return [];
  }
}

// --- Card component ---------------------------------------------------------
function AnimeCard({ item, onDelete, onEdit, compact = false }) {
  const badge = statusBadgeText(item.status);

  if (compact) {
    // Kompakte Kachel für die Tier-Reihen (nur Cover + kleine Badge)
    return (
      <div
        className="relative w-20 h-28 rounded-xl overflow-hidden border border-zinc-300/60 dark:border-zinc-800 bg-zinc-100/40 dark:bg-zinc-900 cursor-grab active:cursor-grabbing"
        draggable
        onDragStart={(e) => e.dataTransfer.setData("text/plain", item.id)}
        onDoubleClick={() => onEdit(item)}
        title={item.title}
      >
        {item.coverUrl ? (
          <img src={item.coverUrl} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-500">no cover</div>
        )}

        {/* Status-Badge */}
        {badge && (
          <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-semibold uppercase tracking-wide">
            {badge}
          </div>
        )}

        {/* Delete-Button klein */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
          className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded-md border border-red-300/70 dark:border-red-800/70 bg-white/70 dark:bg-zinc-900/70 backdrop-blur"
          title="Löschen"
        >
          ×
        </button>
      </div>
    );
  }

  // Große Karte (wird aktuell kaum verwendet, behalten wir für zukünftige Views)
  return (
    <div
      className="bg-white/80 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 shadow-sm hover:shadow-md transition cursor-grab active:cursor-grabbing"
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", item.id)}
      onDoubleClick={() => onEdit(item)}
      title="Doppelklick zum Bearbeiten; Ziehen, um das Tier zu ändern"
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          {item.coverUrl ? (
            <img
              src={item.coverUrl}
              alt="cover"
              className="w-12 h-16 object-cover rounded-xl border border-zinc-200 dark:border-zinc-800"
            />
          ) : (
            <div className="w-12 h-16 rounded-xl bg-zinc-200/80 dark:bg-zinc-800 flex items-center justify-center text-xs">
              no cover
            </div>
          )}
          {/* Status-Badge auf dem Bild */}
          {badge && (
            <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-semibold uppercase tracking-wide">
              {badge}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="font-semibold truncate">{item.title}</div>
          <div className="text-xs text-zinc-500">
            {item.year ? item.year + " • " : ""}
            {item.genres?.slice(0, 2)?.join(", ")}
          </div>
          <div className="text-[11px] mt-1">
            <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">{item.status}</span>
            {item.ratingNumeric != null && (
              <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800">★ {item.ratingNumeric.toFixed(1)}</span>
            )}
          </div>
        </div>
        <button
          onClick={() => onDelete(item.id)}
          className="text-xs px-2 py-1 rounded-lg border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          Löschen
        </button>
      </div>
    </div>
  );
}

// --- Edit Modal (very lightweight) -----------------------------------------
function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 w-full max-w-xl shadow-xl">
          {children}
        </div>
      </div>
    </div>
  );
}

// --- Main App ---------------------------------------------------------------
export default function App() {
  const [items, setItems] = useState(() => loadData());
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editItem, setEditItem] = useState(null);

  useEffect(() => saveData(items), [items]);

  function addItem({ title, status, tier, ratingNumeric, coverUrl }) {
    const now = new Date().toISOString();
    const newItem = {
      id: uid(),
      title: title.trim(),
      status: status || "COMPLETED",
      tier: tier || "Unrated",
      ratingNumeric: ratingNumeric ?? null,
      coverUrl: coverUrl?.trim() || "",
      addedAt: now,
      updatedAt: now,
    };
    setItems((prev) => [newItem, ...prev]);
  }

  function updateItem(id, patch) {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch, updatedAt: new Date().toISOString() } : it))
    );
  }

  function deleteItem(id) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  function onDropTier(tier, e) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    updateItem(id, { tier });
  }

  const filtered = useMemo(() => {
    return items.filter((it) => {
      const okQuery = !query || it.title.toLowerCase().includes(query.toLowerCase());
      const okStatus = !statusFilter || it.status === statusFilter;
      return okQuery && okStatus;
    });
  }, [items, query, statusFilter]);

  const byTier = useMemo(() => {
    const groups = { Unrated: [] };
    for (const t of TIER_COLUMNS) groups[t] = [];
    for (const it of filtered) {
      const key = it.tier && (TIER_COLUMNS.includes(it.tier) ? it.tier : "Unrated");
      groups[key].push(it);
    }
    return groups;
  }, [filtered]);

  // --- Simple export/import -------------------------------------------------
  function exportJson() {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "anime-tierlist-backup.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJson(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (Array.isArray(parsed)) setItems(parsed);
      } catch (err) {
        alert("Import fehlgeschlagen: keine gültige JSON-Datei.");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 text-zinc-900 dark:text-zinc-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Anime Tracker + Tierlist</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Ziehe Cover in die Zeilen S–D, Doppelklick zum Bearbeiten. Daten werden lokal gespeichert.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={exportJson} className="px-3 py-2 rounded-2xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800">Export</button>
            <label className="px-3 py-2 rounded-2xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
              Import
              <input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
            </label>
          </div>
        </header>

        {/* Add form */}
        <AddBar onAdd={addItem} />

        {/* Tierboard (Tiermaker-Style Rows) */}
        <div className="mt-6 flex flex-col gap-4">
          {/* Unrated row */}
          <TierRow
            label="Unrated"
            items={byTier.Unrated}
            onDrop={(e) => onDropTier("Unrated", e)}
            onDelete={deleteItem}
            onEdit={(it) => setEditItem(it)}
          />

          {TIER_COLUMNS.map((tier) => (
            <TierRow
              key={tier}
              label={tier}
              items={byTier[tier]}
              onDrop={(e) => onDropTier(tier, e)}
              onDelete={deleteItem}
              onEdit={(it) => setEditItem(it)}
            />
          ))}
        </div>

        <EditDialog
          item={editItem}
          onClose={() => setEditItem(null)}
          onSave={(id, patch) => {
            updateItem(id, patch);
            setEditItem(null);
          }}
        />
      </div>
    </div>
  );
}

// --- Tier Row (like Tiermaker) ----------------------------------------------
function TierRow({ label, items, onDrop, onDelete, onEdit }) {
  const isTier = TIER_COLUMNS.includes(label);
  const color = isTier
    ? {
        S: "border-emerald-300/60 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/10",
        A: "border-sky-300/60 dark:border-sky-900 bg-sky-50/40 dark:bg-sky-950/10",
        B: "border-violet-300/60 dark:border-violet-900 bg-violet-50/40 dark:bg-violet-950/10",
        C: "border-amber-300/60 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/10",
        D: "border-rose-300/60 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/10",
      }[label]
    : "border-zinc-300/60 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/40";

  return (
    <div className={`w-full rounded-2xl border ${color} p-3`}>
      <div className="flex items-start gap-3">
        {/* Left tier label */}
        <div className="select-none shrink-0 w-24 md:w-32 h-20 md:h-24 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center font-bold text-lg">
          {label}
        </div>
        {/* Droppable strip */}
        <div
          className="flex-1 min-h-24 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-3 flex flex-wrap gap-3"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
        >
          {items.length === 0 ? (
            <div className="text-xs text-zinc-500">Ziehen & ablegen…</div>
          ) : (
            items.map((it) => (
              <AnimeCard key={it.id} item={it} onDelete={onDelete} onEdit={onEdit} compact />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// --- Add bar ---------------------------------------------------------------
function AddBar({ onAdd }) {
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("COMPLETED");
  const [tier, setTier] = useState("Unrated");
  const [rating, setRating] = useState("");
  const [coverUrl, setCoverUrl] = useState("");

  // AniList search state
  const [suggestions, setSuggestions] = useState([]);
  const [openSuggest, setOpenSuggest] = useState(false);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [selIndex, setSelIndex] = useState(-1);
  const [debounceId, setDebounceId] = useState(null);

  function handleTitleChange(e) {
    const v = e.target.value;
    setTitle(v);
    setSelIndex(-1);
    if (debounceId) clearTimeout(debounceId);
    const id = setTimeout(async () => {
      if (v.trim().length < 2) { setSuggestions([]); setOpenSuggest(false); return; }
      setLoadingSuggest(true);
      const res = await anilistSearch(v);
      setSuggestions(res);
      setOpenSuggest(res.length > 0);
      setLoadingSuggest(false);
    }, 300);
    setDebounceId(id);
  }

  function chooseSuggestion(item) {
    setTitle(item.title);
    setCoverUrl(item.coverUrl || "");
    setOpenSuggest(false);
    // Optional: year/genres/episodes mitschreiben, wenn gewünscht
  }

  function onKeyDown(e) {
    if (!openSuggest) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (selIndex >= 0 && suggestions[selIndex]) {
        e.preventDefault();
        chooseSuggestion(suggestions[selIndex]);
      }
    } else if (e.key === "Escape") {
      setOpenSuggest(false);
    }
  }

  function submit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({ title, status, tier, ratingNumeric: rating ? Number(rating) : null, coverUrl });
    setTitle("");
    setRating("");
    setCoverUrl("");
    setSuggestions([]);
    setOpenSuggest(false);
  }

  return (
    <form onSubmit={submit} className="relative bg-white/70 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3">
      <div className="relative flex-1">
        <input
          value={title}
          onChange={handleTitleChange}
          onKeyDown={onKeyDown}
          placeholder="Anime-Titel (suche in AniList)"
          className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900"
        />
        {openSuggest && (
          <div className="absolute z-10 mt-1 w-full max-h-72 overflow-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg">
            {loadingSuggest && (
              <div className="px-3 py-2 text-sm text-zinc-500">Suche…</div>
            )}
            {!loadingSuggest && suggestions.length === 0 && (
              <div className="px-3 py-2 text-sm text-zinc-500">Keine Treffer</div>
            )}
            {suggestions.map((s, i) => (
              <button
                type="button"
                key={s.anilistId ?? s.id}
                onClick={() => chooseSuggestion(s)}
                className={`w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 ${i===selIndex? 'bg-zinc-100 dark:bg-zinc-800' : ''}`}
              >
                {s.coverUrl ? (
                  <img src={s.coverUrl} alt="c" className="w-8 h-12 object-cover rounded-md border border-zinc-200 dark:border-zinc-700" />
                ) : (
                  <div className="w-8 h-12 rounded-md bg-zinc-200 dark:bg-zinc-800" />
                )}
                <div className="min-w-0">
                  <div className="truncate font-medium">{s.title}</div>
                  <div className="text-xs text-zinc-500 truncate">{s.altTitles?.join(" / ")}</div>
                  <div className="text-[11px] text-zinc-500">{s.year ?? "—"} • {s.episodes ?? "—"} Episoden</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <input
        value={coverUrl}
        onChange={(e) => setCoverUrl(e.target.value)}
        placeholder="Cover-URL (optional)"
        className="md:w-64 px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900"
      />
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="md:w-44 px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <select
        value={tier}
        onChange={(e) => setTier(e.target.value)}
        className="md:w-36 px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900"
      >
        <option>Unrated</option>
        {TIER_COLUMNS.map((t) => (
          <option key={t}>{t}</option>
        ))}
      </select>
      <input
        type="number"
        step="0.1"
        min="0"
        max="10"
        value={rating}
        onChange={(e) => setRating(e.target.value)}
        placeholder="Score 0–10"
        className="md:w-32 px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900"
      />
      <button className="px-4 py-2 rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-semibold hover:opacity-90">
        Hinzufügen
      </button>
    </form>
  );
}

// --- Edit dialog -----------------------------------------------------------
function EditDialog({ item, onClose, onSave }) {
  const [title, setTitle] = useState(item?.title || "");
  const [status, setStatus] = useState(item?.status || "COMPLETED");
  const [tier, setTier] = useState(item?.tier || "Unrated");
  const [rating, setRating] = useState(item?.ratingNumeric ?? "");
  const [coverUrl, setCoverUrl] = useState(item?.coverUrl || "");

  useEffect(() => {
    if (item) {
      setTitle(item.title || "");
      setStatus(item.status || "COMPLETED");
      setTier(item.tier || "Unrated");
      setRating(item.ratingNumeric ?? "");
      setCoverUrl(item.coverUrl || "");
    }
  }, [item]);

  if (!item) return null;

  return (
    <Modal open={!!item} onClose={onClose}>
      <h3 className="text-lg font-semibold mb-3">Eintrag bearbeiten</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="text-sm">
          Titel
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900"
          />
        </label>
        <label className="text-sm">
          Cover-URL
          <input
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900"
          />
        </label>
        <label className="text-sm">
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Tier
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900"
          >
            <option>Unrated</option>
            {TIER_COLUMNS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="text-sm md:col-span-2">
          Score (0–10)
          <input
            type="number"
            step="0.1"
            min="0"
            max="10"
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900"
          />
        </label>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700">Abbrechen</button>
        <button
          onClick={() => onSave(item.id, {
            title,
            status,
            tier,
            ratingNumeric: rating === "" ? null : Number(rating),
            coverUrl
          })}
          className="px-4 py-2 rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-semibold hover:opacity-90"
        >
          Speichern
        </button>
      </div>
    </Modal>
  );
}
