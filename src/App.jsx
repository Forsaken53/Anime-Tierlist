import React, { useState, useEffect } from "react";

// --- Tier-Konstanten (God-Tier oben, Unrated unten)
const TIER_COLUMNS = ["GOD", "S", "A", "B", "C", "D"];

// Status-Farben
const STATUS_COLORS = {
  PLANNED: { bg: "bg-zinc-500/80", label: "PLANNED" },
  WATCHING: { bg: "bg-blue-600/80", label: "WATCHING" },
  COMPLETED: { bg: "bg-green-600/80", label: "COMPLETED" },
  DROPPED: { bg: "bg-red-600/80", label: "DROPPED" },
};

// --- Hauptkomponente
export default function App() {
  const [items, setItems] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [newStatus, setNewStatus] = useState("PLANNED");
  const [searchResults, setSearchResults] = useState([]);
  const [editItem, setEditItem] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("anime-list");
    if (saved) setItems(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("anime-list", JSON.stringify(items));
  }, [items]);

  // Anime hinzufügen
  const addItem = (title, status, coverUrl) => {
    if (!title.trim()) return;
    const newItem = {
      id: Date.now(),
      title,
      status,
      tier: "Unrated",
      coverUrl: coverUrl || null,
    };
    setItems((prev) => [...prev, newItem]);
    setNewTitle("");
    setSearchResults([]);
  };

  // Item löschen
  const deleteItem = (id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  // Tier ändern per Drag & Drop
  const onDropTier = (tier, e) => {
    const id = parseInt(e.dataTransfer.getData("text/plain"), 10);
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, tier } : it))
    );
  };

  // Bearbeiten speichern
  const saveEdit = (updated) => {
    setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
    setEditItem(null);
  };

  // --- Suche (AniList API)
  const searchAnime = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        query: `
          query ($search: String) {
            Page(perPage: 5) {
              media(search: $search, type: ANIME) {
                id
                title { romaji }
                coverImage { large }
              }
            }
          }
        `,
        variables: { search: query },
      }),
    });
    const data = await res.json();
    setSearchResults(
      data?.data?.Page?.media?.map((m) => ({
        title: m.title.romaji,
        coverUrl: m.coverImage.large,
      })) || []
    );
  };

  // Items nach Tier gruppieren
  const byTier = {
    GOD: items.filter((it) => it.tier === "GOD"),
    S: items.filter((it) => it.tier === "S"),
    A: items.filter((it) => it.tier === "A"),
    B: items.filter((it) => it.tier === "B"),
    C: items.filter((it) => it.tier === "C"),
    D: items.filter((it) => it.tier === "D"),
    Unrated: items.filter((it) => it.tier === "Unrated"),
  };
// --- Shine-Animation (CSS als Inline-Style für God/S/A)
const shineStyle = {
  backgroundSize: "200% 200%",
  animation: "shine 6s linear infinite",
};
const shineKeyframes = `
@keyframes shine {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
`;
document.head.insertAdjacentHTML("beforeend", `<style>${shineKeyframes}</style>`);

// --- Card component (compact für Tier-Ansicht)
function AnimeCard({ item, onDelete, onEdit, compact = false }) {
  const statusInfo = STATUS_COLORS[item.status] || {};
  if (compact) {
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
        {item.status && (
          <span
            className={`absolute top-1 left-1 px-1.5 py-0.5 text-[9px] font-bold text-white rounded ${statusInfo.bg}`}
          >
            {statusInfo.label}
          </span>
        )}
        {/* Delete Button */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
          className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded-md border border-red-300/70 dark:border-red-800/70 bg-white/70 dark:bg-zinc-900/70 backdrop-blur"
        >
          ×
        </button>
      </div>
    );
  }

  return null; // große Ansicht brauchen wir nicht
}

// --- TierRow-Komponente
function TierRow({ label, items, onDrop, onDelete, onEdit }) {
  const isTier = TIER_COLUMNS.includes(label);
  let colorClasses = "border-zinc-300/60 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/40";
  let styleExtra = {};

  if (isTier) {
    switch (label) {
      case "GOD":
        colorClasses = "border-yellow-400 bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500";
        styleExtra = shineStyle;
        break;
      case "S":
        colorClasses = "border-emerald-400 bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-500";
        styleExtra = { ...shineStyle, opacity: 0.8 };
        break;
      case "A":
        colorClasses = "border-sky-400 bg-gradient-to-r from-sky-300 via-sky-400 to-sky-500";
        styleExtra = { ...shineStyle, opacity: 0.5 };
        break;
      case "B":
        colorClasses = "border-violet-300/60 dark:border-violet-900 bg-violet-50/40 dark:bg-violet-950/10";
        break;
      case "C":
        colorClasses = "border-amber-300/60 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/10";
        break;
      case "D":
        colorClasses = "border-rose-300/60 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/10";
        break;
    }
  }

  return (
    <div className={`w-full rounded-2xl border p-3`} style={styleExtra}>
      <div className="flex items-start gap-3">
        {/* Tier Label */}
        <div className="select-none shrink-0 w-24 md:w-32 h-20 md:h-24 rounded-xl flex items-center justify-center font-bold text-lg text-white border border-black/10 shadow">
          {label}
        </div>

        {/* Drop-Zone */}
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
  // ---------- RENDER ----------
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 text-zinc-900 dark:text-zinc-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Anime Tierlist – GOD ✨</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              GOD → S → A → B → C → D → Unrated. Ziehe Cover zwischen den Reihen. Doppelklick öffnet Bearbeiten.
            </p>
          </div>
        </header>

        {/* ADD BAR (ohne Score) */}
        <AddBar
          newTitle={newTitle}
          setNewTitle={setNewTitle}
          newStatus={newStatus}
          setNewStatus={setNewStatus}
          addItem={addItem}
          searchResults={searchResults}
          setSearchResults={setSearchResults}
          searchAnime={searchAnime}
        />

        {/* Tier-Board */}
        <div className="mt-6 flex flex-col gap-4">
          {TIER_COLUMNS.map((tier) => (
            <TierRow
              key={tier}
              label={tier}
              items={byTier[tier]}
              onDrop={(e) => onDropTier(tier, e)}
              onDelete={deleteItem}
              onEdit={setEditItem}
            />
          ))}

          {/* Unrated ganz unten */}
          <TierRow
            label="Unrated"
            items={byTier.Unrated}
            onDrop={(e) => onDropTier("Unrated", e)}
            onDelete={deleteItem}
            onEdit={setEditItem}
          />
        </div>

        {/* Edit Dialog */}
        {editItem && (
          <EditDialog
            item={editItem}
            onClose={() => setEditItem(null)}
            onSave={saveEdit}
          />
        )}
      </div>
    </div>
  );
}

// ---------- ADD BAR (ohne Score, mit AniList-Autocomplete) ----------
function AddBar({
  newTitle, setNewTitle,
  newStatus, setNewStatus,
  addItem,
  searchResults, setSearchResults,
  searchAnime
}) {
  const [coverUrl, setCoverUrl] = useState("");
  const [openSuggest, setOpenSuggest] = useState(false);
  const [debounce, setDebounce] = useState(null);
  const [selIndex, setSelIndex] = useState(-1);
  const [loading, setLoading] = useState(false);

  function onChangeTitle(e) {
    const v = e.target.value;
    setNewTitle(v);
    setSelIndex(-1);
    if (debounce) clearTimeout(debounce);
    const id = setTimeout(async () => {
      if (v.trim().length < 2) {
        setSearchResults([]);
        setOpenSuggest(false);
        return;
      }
      setLoading(true);
      await searchAnime(v);
      setOpenSuggest(true);
      setLoading(false);
    }, 350);
    setDebounce(id);
  }

  function chooseSuggestion(s) {
    setNewTitle(s.title);
    setCoverUrl(s.coverUrl || "");
    setOpenSuggest(false);
  }

  function onKeyDown(e) {
    if (!openSuggest) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelIndex((i) => Math.min(i + 1, searchResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (selIndex >= 0 && searchResults[selIndex]) {
        e.preventDefault();
        chooseSuggestion(searchResults[selIndex]);
      }
    } else if (e.key === "Escape") {
      setOpenSuggest(false);
    }
  }

  function submit(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    addItem(newTitle, newStatus, coverUrl);
    setCoverUrl("");
    setOpenSuggest(false);
  }

  return (
    <form onSubmit={submit} className="relative bg-white/70 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3">
      <div className="relative flex-1">
        <input
          value={newTitle}
          onChange={onChangeTitle}
          onKeyDown={onKeyDown}
          placeholder="Anime-Titel (AniList-Suche)…"
          className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900"
        />
        {openSuggest && (
          <div className="absolute z-10 mt-1 w-full max-h-72 overflow-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg">
            {loading && <div className="px-3 py-2 text-sm text-zinc-500">Suche…</div>}
            {!loading && searchResults.length === 0 && (
              <div className="px-3 py-2 text-sm text-zinc-500">Keine Treffer</div>
            )}
            {searchResults.map((s, i) => (
              <button
                type="button"
                key={s.title + i}
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
        value={newStatus}
        onChange={(e) => setNewStatus(e.target.value)}
        className="md:w-44 px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900"
      >
        <option value="PLANNED">PLANNED</option>
        <option value="WATCHING">WATCHING</option>
        <option value="COMPLETED">COMPLETED</option>
        <option value="DROPPED">DROPPED</option>
      </select>

      <button className="px-4 py-2 rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-semibold hover:opacity-90">
        Hinzufügen
      </button>
    </form>
  );
}

// ---------- EDIT DIALOG (ohne Score) ----------
function EditDialog({ item, onClose, onSave }) {
  const [title, setTitle] = useState(item.title);
  const [status, setStatus] = useState(item.status);
  const [coverUrl, setCoverUrl] = useState(item.coverUrl || "");

  function save() {
    onSave({ ...item, title, status, coverUrl });
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 w-full max-w-xl shadow-xl">
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
                <option value="PLANNED">PLANNED</option>
                <option value="WATCHING">WATCHING</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="DROPPED">DROPPED</option>
              </select>
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={onClose} className="px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700">Abbrechen</button>
            <button
              onClick={save}
              className="px-4 py-2 rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-semibold hover:opacity-90"
            >
              Speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------- TierRow KORREKTUR (überschreibt die vorherige Definition aus Teil 2) -------- */
function TierRow({ label, items, onDrop, onDelete, onEdit }) {
  const isTier = TIER_COLUMNS.includes(label);

  // Farb-/Gradient-Logik inkl. Shine
  let containerClasses = "border-zinc-300/60 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/40";
  let labelClasses = "bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700";
  let extraStyle = {};

  if (isTier) {
    switch (label) {
      case "GOD":
        containerClasses = "border-yellow-400 bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500";
        labelClasses = "bg-gradient-to-r from-yellow-400 to-amber-500 border-yellow-300 text-black";
        extraStyle = { backgroundSize: "200% 200%", animation: "shine 6s linear infinite" };
        break;
      case "S":
        containerClasses = "border-emerald-400 bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-500";
        labelClasses = "bg-gradient-to-r from-emerald-400 to-teal-500 border-emerald-300 text-black";
        extraStyle = { backgroundSize: "200% 200%", animation: "shine 8s linear infinite", opacity: 0.9 };
        break;
      case "A":
        containerClasses = "border-sky-400 bg-gradient-to-r from-sky-300 via-sky-400 to-sky-500";
        labelClasses = "bg-gradient-to-r from-sky-400 to-blue-500 border-sky-300 text-black";
        extraStyle = { backgroundSize: "200% 200%", animation: "shine 10s linear infinite", opacity: 0.8 };
        break;
      case "B":
        containerClasses = "border-violet-300/60 dark:border-violet-900 bg-violet-50/40 dark:bg-violet-950/10";
        labelClasses = "bg-violet-100 dark:bg-violet-900/30 border-violet-300";
        break;
      case "C":
        containerClasses = "border-amber-300/60 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/10";
        labelClasses = "bg-amber-100 dark:bg-amber-900/30 border-amber-300";
        break;
      case "D":
        containerClasses = "border-rose-300/60 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/10";
        labelClasses = "bg-rose-100 dark:bg-rose-900/30 border-rose-300";
        break;
    }
  }

  return (
    <div className={`w-full rounded-2xl border p-3 ${containerClasses}`} style={extraStyle}>
      <div className="flex items-start gap-3">
        {/* Linkes Tier-Label */}
        <div className={`select-none shrink-0 w-24 md:w-32 h-20 md:h-24 rounded-xl flex items-center justify-center font-bold text-lg text-black ${labelClasses}`}>
          {label}
        </div>

        {/* Drop-Zone */}
        <div
          className="flex-1 min-h-24 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-3 flex flex-wrap gap-3"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
        >
          {items.length === 0 ? (
            <div className="text-xs text-zinc-700 dark:text-zinc-400">Ziehen & ablegen…</div>
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
