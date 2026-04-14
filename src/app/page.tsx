"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
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
import { Checkbox } from "@/components/ui/checkbox";
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
  Loader2,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n-context";

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

  return { models, loading, ollamaVersion, runningModels, setRunningModels, refresh: fetchModels };
}

export default function Home() {
  const router = useRouter();
  const { t } = useI18n();
  const { models, loading, ollamaVersion, runningModels, setRunningModels, refresh } = useModels();
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
  const [pullProgress, setPullProgress] = useState(0);
  const [loadingModel, setLoadingModel] = useState<string | null>(null);
  const [loadProgress, setLoadProgress] = useState(0);
  const [selectedModelNames, setSelectedModelNames] = useState<string[]>([]);
  const [systemInfo, setSystemInfo] = useState<{
    memory?: { totalMb: number; freeMb: number } | null;
    gpu?: { totalMb: number; freeMb: number; source: string } | null;
  }>({});

  useEffect(() => {
    Promise.all([
      fetch("/api/system-info").then((r) => r.json()).catch(() => null),
      fetch("/api/gpu").then((r) => r.json()).catch(() => null),
    ]).then(([sys, gpu]) => {
      setSystemInfo({ memory: sys?.memory || null, gpu: gpu?.source !== "none" ? gpu : null });
    });
  }, []);

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

  function checkWarnings(model: Model) {
    const warnings: string[] = [];
    const sizeMb = model.size / (1024 * 1024);
    if (systemInfo.memory && systemInfo.memory.freeMb < sizeMb) {
      warnings.push(t.home.memoryWarning);
    }
    if (systemInfo.gpu && systemInfo.gpu.freeMb < sizeMb) {
      warnings.push(t.home.vramWarning);
    }
    warnings.forEach((w) => toast.warning(w));
  }

  async function handleLoadModel(name: string) {
    const model = models.find((m) => m.name === name);
    if (model) checkWarnings(model);
    setLoadingModel(name);
    setLoadProgress(0);
    const previouslyLoaded = new Set(runningModels);
    // real progress: poll /api/ps until model appears
    const start = Date.now();
    const poll = setInterval(async () => {
      try {
        const psRes = await fetch("/api/ps");
        const psData = await psRes.json();
        const loaded = (psData.models || []).map((m: { name: string }) => m.name);
        const elapsed = Date.now() - start;
        if (loaded.includes(name)) {
          clearInterval(poll);
          setLoadProgress(100);
          toast.success(t.home.loadSuccess + ": " + name);
          setRunningModels(loaded);
          const unloaded = Array.from(previouslyLoaded).filter((n) => n !== name && !loaded.includes(n));
          if (unloaded.length > 0) {
            toast.warning(`Ollama wyładowała modele: ${unloaded.join(", ")}. Sprawdź dostępną pamięć lub ustaw OLLAMA_MAX_LOADED_MODELS.`);
          }
          setTimeout(() => {
            setLoadingModel(null);
            setLoadProgress(0);
          }, 600);
        } else {
          setLoadProgress(Math.min((elapsed / 15000) * 90, 90));
        }
      } catch {
        // ignore
      }
    }, 800);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: name,
          prompt: "Say hello",
          stream: false,
          keep_alive: -1,
        }),
      });
      if (!res.ok) {
        clearInterval(poll);
        const text = await res.text();
        toast.error(t.home.loadError + ": " + text);
        setLoadingModel(null);
        setLoadProgress(0);
      }
    } catch (e: unknown) {
      clearInterval(poll);
      const msg = e instanceof Error ? e.message : "Error";
      toast.error(t.home.loadError + ": " + msg);
      setLoadingModel(null);
      setLoadProgress(0);
    }
  }

  async function handleUnloadModel(name: string) {
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: name,
          prompt: "hi",
          stream: false,
          keep_alive: 0,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        toast.error(t.home.loadError + ": " + text);
      } else {
        // wait a moment then refresh
        setTimeout(async () => {
          await refresh();
          toast.success(t.home.unloadSuccess + ": " + name);
        }, 800);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error";
      toast.error(t.home.loadError + ": " + msg);
    }
  }

  async function loadSelected() {
    if (selectedModelNames.length === 0) return;
    for (const name of selectedModelNames) {
      await handleLoadModel(name);
    }
    setSelectedModelNames([]);
  }

  async function handlePull() {
    if (!pullName.trim()) return;
    setPulling(true);
    setPullLog("");
    setPullProgress(0);
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
              if (typeof obj.completed === "number" && typeof obj.total === "number" && obj.total > 0) {
                setPullProgress(Math.round((obj.completed / obj.total) * 100));
              }
            } catch {
              setPullLog((prev) => prev + line + "\n");
            }
          }
        }
      }
      setPullProgress(100);
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

  function toggleModelSelect(name: string) {
    setSelectedModelNames((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-[#242424]">
            {t.home.title}
          </h1>
          <p className="mt-1 text-base text-[#898989]">{t.home.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isConnected ? (
            <Badge variant="secondary">{t.home.connected} {ollamaVersion}</Badge>
          ) : (
            <Badge variant="destructive" className="gap-1">
              <ServerOff className="h-3 w-3" />
              {t.home.disconnected}
            </Badge>
          )}
          {runningModels.length > 0 && (
            <Badge className="bg-[#242424] text-white gap-1">
              <Activity className="h-3 w-3" />
              {runningModels.length} {t.home.loaded}
            </Badge>
          )}
          <Button variant="outline" onClick={() => setPullOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t.home.pullModel}
          </Button>
          <Button variant="default" onClick={refresh} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {t.home.refresh}
          </Button>
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#898989]" />
          <Input
            placeholder={t.home.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={familyFilter} onValueChange={(v) => v && setFamilyFilter(v)}>
            <SelectTrigger className="w-[180px]">
              <Cpu className="mr-2 h-4 w-4 text-[#898989]" />
              <SelectValue placeholder={t.home.family} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.home.allFamilies}</SelectItem>
              {families.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => v && setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t.home.sort} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">{t.home.sortName}</SelectItem>
              <SelectItem value="size">{t.home.sortSize}</SelectItem>
              <SelectItem value="date">{t.home.sortDate}</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center rounded-[8px] border border-[rgba(34,42,53,0.08)] bg-white shadow-[rgba(34,42,53,0.08)_0px_0px_0px_1px]">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="rounded-none rounded-l-[8px]"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="rounded-none rounded-r-[8px]"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {selectedModelNames.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <Button size="sm" variant="default" onClick={loadSelected} disabled={loadingModel !== null}>
            <Cpu className="mr-2 h-4 w-4" />
            {t.home.loadAllSelected} ({selectedModelNames.length})
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedModelNames([])}>
            {t.tests.deselectAll}
          </Button>
        </div>
      )}

      <div className="mb-4 rounded-[8px] border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
        {t.home.ollamaMemoryNote}
      </div>

      {runningModels.length > 0 && (
        <div className="mb-4 rounded-[8px] border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {runningModels.length > 1
            ? `Załadowane modele: ${runningModels.join(", ")}.`
            : `Załadowany model: ${runningModels[0]}.`}{" "}
          Ollama może wyładować modele przy braku pamięci — sprawdź stronę System, aby skonfigurować OLLAMA_MAX_LOADED_MODELS.
        </div>
      )}

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

      {!loading && viewMode === "grid" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredModels.map((model) => {
            const isLoaded = runningModels.includes(model.name);
            const isSelected = selectedModelNames.includes(model.name);
            return (
              <Card
                key={model.digest}
                className={cn(
                  "group flex flex-col transition-all hover:shadow-card-hover",
                  isLoaded && "border-green-500 ring-1 ring-green-500"
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleModelSelect(model.name)}
                        aria-label={`Select ${model.name}`}
                      />
                      <div>
                        <CardTitle className="break-all text-base font-semibold flex items-center gap-2 text-[#242424]">
                          {model.name}
                          {isLoaded && <Activity className="h-4 w-4 text-green-600" />}
                        </CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {new Date(model.modified_at).toLocaleString("pl-PL")}
                        </CardDescription>
                      </div>
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
                          {t.home.details}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => router.push(`/chat?model=${encodeURIComponent(model.name)}`)}
                        >
                          <MessageSquare className="mr-2 h-4 w-4" />
                          {t.home.chat}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => handleDelete(model.name)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t.home.delete}
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
                    {isLoaded && (
                      <Badge className="bg-green-600 text-white">{t.home.loadedModel}</Badge>
                    )}
                  </div>
                </CardContent>
                <div className="px-6 pb-5 space-y-2">
                  <Button
                    className="w-full"
                    variant="secondary"
                    onClick={() => router.push(`/chat?model=${encodeURIComponent(model.name)}`)}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    {t.home.chooseChat}
                  </Button>
                  {loadingModel === model.name && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-[#898989]">
                        <span>{t.home.loadingModel}</span>
                        <span>{loadProgress.toFixed(0)}%</span>
                      </div>
                      <Progress value={loadProgress} />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      variant="outline"
                      size="sm"
                      disabled={loadingModel === model.name}
                      onClick={() => handleLoadModel(model.name)}
                    >
                      {loadingModel === model.name ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : isLoaded ? (
                        <Activity className="mr-2 h-4 w-4 text-green-600" />
                      ) : (
                        <Cpu className="mr-2 h-4 w-4" />
                      )}
                      {loadingModel === model.name
                        ? t.home.loadingModel
                        : isLoaded
                        ? t.home.loadedModel
                        : t.home.loadModel}
                    </Button>
                    {isLoaded && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600"
                        onClick={() => handleUnloadModel(model.name)}
                      >
                        {t.home.unloadModel}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {!loading && viewMode === "list" && (
        <div className="rounded-[8px] border border-[rgba(34,42,53,0.08)] bg-white shadow-card">
          <div className="grid grid-cols-12 gap-4 border-b border-[rgba(34,42,53,0.08)] bg-[#f5f5f5]/50 px-4 py-2 text-sm font-semibold text-[#898989]">
            <div className="col-span-4">{t.home.searchPlaceholder.replace("Szukaj ", "")}</div>
            <div className="col-span-2">Rozmiar</div>
            <div className="col-span-2">Parametry</div>
            <div className="col-span-2">Rodzina</div>
            <div className="col-span-2 text-right">Akcje</div>
          </div>
          {filteredModels.map((model) => (
            <div
              key={model.digest}
              className="grid grid-cols-12 items-center gap-4 border-b border-[rgba(34,42,53,0.08)] px-4 py-3 text-sm last:border-b-0 hover:bg-[#f5f5f5]/50 transition-colors"
            >
              <div className="col-span-4 flex items-center gap-2">
                <Checkbox
                  checked={selectedModelNames.includes(model.name)}
                  onCheckedChange={() => toggleModelSelect(model.name)}
                />
                <span
                  className={cn(
                    "font-medium break-all",
                    runningModels.includes(model.name) ? "text-green-700" : "text-[#242424]"
                  )}
                >
                  {model.name}
                </span>
                {runningModels.includes(model.name) && (
                  <Activity className="h-4 w-4 text-green-600" />
                )}
              </div>
              <div className="col-span-2 text-[#898989]">{formatBytes(model.size)}</div>
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
                  onClick={() => router.push(`/chat?model=${encodeURIComponent(model.name)}`)}
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={loadingModel === model.name}
                  onClick={() => handleLoadModel(model.name)}
                  title={t.home.loadModel}
                >
                  {loadingModel === model.name ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : runningModels.includes(model.name) ? (
                    <Activity className="h-4 w-4 text-green-600" />
                  ) : (
                    <Cpu className="h-4 w-4" />
                  )}
                </Button>
                {runningModels.includes(model.name) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-amber-600"
                    onClick={() => handleUnloadModel(model.name)}
                    title={t.home.unloadModel}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-600"
                  onClick={() => handleDelete(model.name)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filteredModels.length === 0 && (
        <div className="mt-12 flex flex-col items-center justify-center rounded-[12px] border border-dashed border-[rgba(34,42,53,0.15)] p-12 text-center">
          <div className="rounded-full bg-[#f5f5f5] p-4">
            <Cpu className="h-6 w-6 text-[#898989]" />
          </div>
          <h3 className="mt-4 font-heading text-base font-semibold text-[#242424]">{t.home.noModels}</h3>
          <p className="mt-1 text-sm text-[#898989] max-w-sm">
            {search || familyFilter !== "all" ? t.home.noModelsFilter : t.home.noModelsHint}
          </p>
          {!search && familyFilter === "all" && (
            <Button className="mt-5" variant="outline" onClick={() => setPullOpen(true)}>
              <Download className="mr-2 h-4 w-4" />
              {t.home.pullFirst}
            </Button>
          )}
        </div>
      )}

      <Dialog open={pullOpen} onOpenChange={setPullOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t.home.pullTitle}</DialogTitle>
            <DialogDescription>{t.home.pullDesc}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="model-name">{t.home.modelName}</Label>
              <Input
                id="model-name"
                value={pullName}
                onChange={(e) => setPullName(e.target.value)}
                placeholder="llama3.2"
                disabled={pulling}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {["llama3.2", "qwen2.5", "gemma2", "mistral", "phi4", "deepseek-r1:1.5b"].map((m) => (
                <Badge
                  key={m}
                  variant="outline"
                  className="cursor-pointer hover:bg-[#f5f5f5]"
                  onClick={() => setPullName(m)}
                >
                  {m}
                </Badge>
              ))}
            </div>
            {pulling && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-[#898989]">
                  <span>{t.home.pullProgress}</span>
                  <span>{pullProgress}%</span>
                </div>
                <Progress value={pullProgress} />
              </div>
            )}
            <ScrollArea className="h-40 rounded-[8px] border border-[rgba(34,42,53,0.08)] bg-black p-3 text-xs text-green-400">
              <pre className="whitespace-pre-wrap">
                {pullLog || "Oczekiwanie na start..."}
              </pre>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button onClick={handlePull} disabled={pulling || !pullName.trim()}>
              {pulling ? t.home.pullRunning : t.home.pullStart}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t.home.details}</DialogTitle>
            <DialogDescription>{selectedModel?.name}</DialogDescription>
          </DialogHeader>
          {detailsLoading ? (
            <div className="py-6 text-sm text-[#898989]">Loading details...</div>
          ) : (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4 text-sm">
                {modelDetails?.error && (
                  <div className="text-red-600">{modelDetails.error}</div>
                )}
                {modelDetails?.license && (
                  <div>
                    <div className="font-medium text-[#242424]">Licencja</div>
                    <pre className="mt-1 max-h-32 overflow-auto rounded-[8px] bg-[#f5f5f5] p-2 text-xs whitespace-pre-wrap break-all">
                      {modelDetails.license}
                    </pre>
                  </div>
                )}
                {modelDetails?.modelfile && (
                  <div>
                    <div className="font-medium text-[#242424]">Modelfile</div>
                    <pre className="mt-1 max-h-32 overflow-auto rounded-[8px] bg-[#f5f5f5] p-2 text-xs whitespace-pre-wrap break-all">
                      {modelDetails.modelfile}
                    </pre>
                  </div>
                )}
                {modelDetails?.parameters && (
                  <div>
                    <div className="font-medium text-[#242424]">Parametry</div>
                    <pre className="mt-1 max-h-32 overflow-auto rounded-[8px] bg-[#f5f5f5] p-2 text-xs whitespace-pre-wrap break-all">
                      {modelDetails.parameters}
                    </pre>
                  </div>
                )}
                {modelDetails?.system && (
                  <div>
                    <div className="font-medium text-[#242424]">System prompt</div>
                    <pre className="mt-1 max-h-32 overflow-auto rounded-[8px] bg-[#f5f5f5] p-2 text-xs whitespace-pre-wrap break-all">
                      {modelDetails.system}
                    </pre>
                  </div>
                )}
                {modelDetails?.template && (
                  <div>
                    <div className="font-medium text-[#242424]">Szablon</div>
                    <pre className="mt-1 max-h-32 overflow-auto rounded-[8px] bg-[#f5f5f5] p-2 text-xs whitespace-pre-wrap break-all">
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
                    <div className="text-[#898989]">Brak dodatkowych szczegółów.</div>
                  )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
