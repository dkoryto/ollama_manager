"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Trash2,
  Download,
  MessageSquare,
  Info,
  RefreshCw,
  Cpu,
  Activity,
  Search,
  LayoutGrid,
  List,
  MoreHorizontal,
  ServerOff,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

type Model = {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    format?: string;
    family?: string;
    families?: string[];
    parameter_size?: string;
    quantization_level?: string;
  };
};

type ModelDetails = {
  license?: string;
  modelfile?: string;
  parameters?: string;
  template?: string;
  system?: string;
  details?: Model["details"];
  error?: string;
};

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function useModels() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [ollamaVersion, setOllamaVersion] = useState<string>("");
  const [runningModels, setRunningModels] = useState<string[]>([]);

  async function fetchModels() {
    setLoading(true);
    try {
      const [tagsRes, psRes, verRes] = await Promise.all([
        fetch("/api/tags"),
        fetch("/api/ps"),
        fetch("/api/version"),
      ]);
      const tagsData = await tagsRes.json();
      const psData = await psRes.json();
      const verData = await verRes.json();
      setModels(tagsData.models || []);
      setRunningModels((psData.models || []).map((m: { name: string }) => m.name));
      setOllamaVersion(verData.version || "");
    } catch {
      setModels([]);
      setRunningModels([]);
      setOllamaVersion("");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchModels();
  }, []);

  return { models, loading, ollamaVersion, runningModels, refresh: fetchModels };
}

export default function Home() {
  const { models, loading, ollamaVersion, runningModels, refresh } = useModels();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "size" | "date">("name");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [familyFilter, setFamilyFilter] = useState<string>("all");
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [modelDetails, setModelDetails] = useState<ModelDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [pullOpen, setPullOpen] = useState(false);
  const [pullName, setPullName] = useState("");
  const [pulling, setPulling] = useState(false);
  const [pullLog, setPullLog] = useState("");

  async function handleDelete(name: string) {
    if (!confirm(`Czy na pewno chcesz usunąć model "${name}"?`)) return;
    try {
      const res = await fetch("/api/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Delete failed");
      toast.success(`Model "${name}" został usunięty`);
      await refresh();
    } catch {
      toast.error("Błąd usuwania modelu");
    }
  }

  async function handlePull() {
    if (!pullName.trim()) return;
    setPulling(true);
    setPullLog("");
    try {
      const res = await fetch("/api/pull", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: pullName.trim() }),
      });
      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      while (!done) {
        const { value, done: d } = await reader.read();
        done = d;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n").filter(Boolean);
          for (const line of lines) {
            try {
              const obj = JSON.parse(line);
              const msg = obj.status || obj.error || JSON.stringify(obj);
              setPullLog((prev) => prev + msg + "\n");
            } catch {
              setPullLog((prev) => prev + line + "\n");
            }
          }
        }
      }
      toast.success("Pobieranie zakończone");
      await refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Błąd";
      setPullLog((prev) => prev + "Błąd: " + msg + "\n");
      toast.error("Błąd pobierania modelu");
    } finally {
      setPulling(false);
    }
  }

  async function openDetails(model: Model) {
    setSelectedModel(model);
    setDetailsOpen(true);
    setDetailsLoading(true);
    setModelDetails(null);
    try {
      const res = await fetch(`/api/models/${encodeURIComponent(model.name)}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setModelDetails({ error: data.error || "Błąd pobierania szczegółów" });
      } else {
        setModelDetails(data);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Błąd";
      setModelDetails({ error: msg || "Błąd" });
    } finally {
      setDetailsLoading(false);
    }
  }

  const families = useMemo(() => {
    const set = new Set<string>();
    models.forEach((m) => {
      if (m.details?.family) set.add(m.details.family);
      m.details?.families?.forEach((f) => set.add(f));
    });
    return Array.from(set).sort();
  }, [models]);

  const filteredModels = useMemo(() => {
    let list = models;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((m) => m.name.toLowerCase().includes(q));
    }
    if (familyFilter !== "all") {
      list = list.filter(
        (m) =>
          m.details?.family === familyFilter ||
          m.details?.families?.includes(familyFilter)
      );
    }
    list = [...list].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "size") return b.size - a.size;
      return new Date(b.modified_at).getTime() - new Date(a.modified_at).getTime();
    });
    return list;
  }, [models, search, familyFilter, sortBy]);

  const isConnected = !!ollamaVersion;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Modele lokalne</h1>
          <p className="text-sm text-muted-foreground">
            Zarządzaj i testuj modele dostępne przez Ollama
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isConnected ? (
            <Badge variant="secondary">Ollama {ollamaVersion}</Badge>
          ) : (
            <Badge variant="destructive" className="gap-1">
              <ServerOff className="h-3 w-3" />
              Brak połączenia
            </Badge>
          )}
          {runningModels.length > 0 && (
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100 gap-1">
              <Activity className="h-3 w-3" />
              {runningModels.length} załadowanych
            </Badge>
          )}
          <Button variant="outline" onClick={() => setPullOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Pobierz model
          </Button>
          <Button variant="outline" onClick={refresh} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Odśwież
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj modelu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={familyFilter} onValueChange={(v) => v && setFamilyFilter(v)}>
            <SelectTrigger className="w-[180px]">
              <Cpu className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Rodzina" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie rodziny</SelectItem>
              {families.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => v && setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sortuj" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Nazwa</SelectItem>
              <SelectItem value="size">Rozmiar (malejąco)</SelectItem>
              <SelectItem value="date">Data modyfikacji</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center rounded-md border">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="rounded-none rounded-l-md"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="rounded-none rounded-r-md"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className={viewMode === "grid" ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Grid View */}
      {!loading && viewMode === "grid" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredModels.map((model) => (
            <Card key={model.digest} className="group flex flex-col transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="break-all text-base font-semibold flex items-center gap-2">
                      {model.name}
                      {runningModels.includes(model.name) && (
                        <Activity className="h-4 w-4 text-green-600" />
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {new Date(model.modified_at).toLocaleString("pl-PL")}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openDetails(model)}>
                        <Info className="mr-2 h-4 w-4" />
                        Szczegóły
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/chat?model=${encodeURIComponent(model.name)}`}>
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Chat
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDelete(model.name)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Usuń
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="secondary">{formatBytes(model.size)}</Badge>
                  {model.details?.parameter_size && (
                    <Badge variant="outline">{model.details.parameter_size}</Badge>
                  )}
                  {model.details?.quantization_level && (
                    <Badge variant="outline">{model.details.quantization_level}</Badge>
                  )}
                  {model.details?.family && (
                    <Badge variant="outline">{model.details.family}</Badge>
                  )}
                  {runningModels.includes(model.name) && (
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100">
                      Załadowany
                    </Badge>
                  )}
                </div>
              </CardContent>
              <div className="px-6 pb-4">
                <Button
                  className="w-full"
                  variant="secondary"
                  render={
                    <Link href={`/chat?model=${encodeURIComponent(model.name)}`} />
                  }
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Wybierz do chatu
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* List View */}
      {!loading && viewMode === "list" && (
        <div className="rounded-md border">
          <div className="grid grid-cols-12 gap-4 border-b bg-muted/50 px-4 py-2 text-sm font-medium text-muted-foreground">
            <div className="col-span-4">Nazwa</div>
            <div className="col-span-2">Rozmiar</div>
            <div className="col-span-2">Parametry</div>
            <div className="col-span-2">Rodzina</div>
            <div className="col-span-2 text-right">Akcje</div>
          </div>
          {filteredModels.map((model) => (
            <div
              key={model.digest}
              className="grid grid-cols-12 items-center gap-4 border-b px-4 py-3 text-sm last:border-b-0 hover:bg-muted/30 transition-colors"
            >
              <div className="col-span-4 flex items-center gap-2">
                <span className="font-medium break-all">{model.name}</span>
                {runningModels.includes(model.name) && (
                  <Activity className="h-4 w-4 text-green-600" />
                )}
              </div>
              <div className="col-span-2 text-muted-foreground">{formatBytes(model.size)}</div>
              <div className="col-span-2">
                {model.details?.parameter_size ? (
                  <Badge variant="outline">{model.details.parameter_size}</Badge>
                ) : (
                  "—"
                )}
              </div>
              <div className="col-span-2">
                {model.details?.family ? (
                  <Badge variant="outline">{model.details.family}</Badge>
                ) : (
                  "—"
                )}
              </div>
              <div className="col-span-2 flex justify-end gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetails(model)}>
                  <Info className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  render={<Link href={`/chat?model=${encodeURIComponent(model.name)}`} />}
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => handleDelete(model.name)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredModels.length === 0 && (
        <div className="mt-10 flex flex-col items-center justify-center rounded-lg border border-dashed p-10 text-center">
          <div className="rounded-full bg-muted p-3">
            <Cpu className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-sm font-medium">Brak modeli</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">
            {search || familyFilter !== "all"
              ? "Spróbuj zmienić filtry wyszukiwania."
              : "Upewnij się, że Ollama działa i jest dostępna pod zdefiniowanym adresem."}
          </p>
          {!search && familyFilter === "all" && (
            <Button className="mt-4" variant="outline" onClick={() => setPullOpen(true)}>
              <Download className="mr-2 h-4 w-4" />
              Pobierz pierwszy model
            </Button>
          )}
        </div>
      )}

      {/* Pull Dialog */}
      <Dialog open={pullOpen} onOpenChange={setPullOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Pobierz model z Ollama</DialogTitle>
            <DialogDescription>
              Wpisz nazwę modelu (np. llama3.2, qwen2.5, gemma2).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="model-name">Nazwa modelu</Label>
              <Input
                id="model-name"
                value={pullName}
                onChange={(e) => setPullName(e.target.value)}
                placeholder="llama3.2"
                disabled={pulling}
              />
            </div>
            <ScrollArea className="h-40 rounded-md border bg-black p-3 text-xs text-green-400">
              <pre className="whitespace-pre-wrap">
                {pullLog || "Oczekiwanie na start..."}
              </pre>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button onClick={handlePull} disabled={pulling || !pullName.trim()}>
              {pulling ? "Pobieranie..." : "Rozpocznij"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Szczegóły modelu</DialogTitle>
            <DialogDescription>{selectedModel?.name}</DialogDescription>
          </DialogHeader>
          {detailsLoading ? (
            <div className="py-6 text-sm text-muted-foreground">Ładowanie szczegółów...</div>
          ) : (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4 text-sm">
                {modelDetails?.error && (
                  <div className="text-destructive">{modelDetails.error}</div>
                )}
                {modelDetails?.license && (
                  <div>
                    <div className="font-medium text-muted-foreground">Licencja</div>
                    <pre className="mt-1 max-h-32 overflow-auto rounded bg-muted p-2 text-xs">
                      {modelDetails.license}
                    </pre>
                  </div>
                )}
                {modelDetails?.modelfile && (
                  <div>
                    <div className="font-medium text-muted-foreground">Modelfile</div>
                    <pre className="mt-1 max-h-32 overflow-auto rounded bg-muted p-2 text-xs">
                      {modelDetails.modelfile}
                    </pre>
                  </div>
                )}
                {modelDetails?.parameters && (
                  <div>
                    <div className="font-medium text-muted-foreground">Parametry</div>
                    <pre className="mt-1 max-h-32 overflow-auto rounded bg-muted p-2 text-xs">
                      {modelDetails.parameters}
                    </pre>
                  </div>
                )}
                {modelDetails?.system && (
                  <div>
                    <div className="font-medium text-muted-foreground">System prompt</div>
                    <pre className="mt-1 max-h-32 overflow-auto rounded bg-muted p-2 text-xs">
                      {modelDetails.system}
                    </pre>
                  </div>
                )}
                {modelDetails?.template && (
                  <div>
                    <div className="font-medium text-muted-foreground">Szablon</div>
                    <pre className="mt-1 max-h-32 overflow-auto rounded bg-muted p-2 text-xs">
                      {modelDetails.template}
                    </pre>
                  </div>
                )}
                {!modelDetails?.error &&
                  !modelDetails?.license &&
                  !modelDetails?.modelfile &&
                  !modelDetails?.parameters &&
                  !modelDetails?.system &&
                  !modelDetails?.template && (
                    <div className="text-muted-foreground">Brak dodatkowych szczegółów.</div>
                  )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
