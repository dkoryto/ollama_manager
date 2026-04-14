"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettings } from "@/lib/settings-context";
import { useI18n } from "@/lib/i18n-context";
import { benchmarks } from "@/lib/benchmarks";
import { generateId } from "@/lib/generate-id";
import {
  Play,
  Save,
  Download,
  Star,
  Trash2,
  BookOpen,
  Brain,
  Code2,
  Sparkles,
  Languages,
  FlaskConical,
  History,
  Activity,
  Loader2,
  CheckCircle2,
  ListChecks,
} from "lucide-react";
import { toast } from "sonner";

const LS_SELECTED_MODEL = "ollama-test-selected-model";
const LS_RUNNING_STATE = "ollama-test-running-state";

const RUNNING_INIT = "init";
const RUNNING_GENERATE = "generate";
const RUNNING_ERROR = "error";

type RunningStatus =
  | typeof RUNNING_INIT
  | typeof RUNNING_GENERATE
  | typeof RUNNING_ERROR;

type ModelItem = {
  name: string;
};

type TestResult = {
  id: string;
  model: string;
  benchmarkId: string;
  benchmarkName: string;
  prompt: string;
  response: string;
  rating: number;
  note: string;
  durationMs: number;
  timestamp: string;
};

type PersistedRunningState = {
  runningId: string | null;
  runningResponse: string;
  runningTime: number;
  runningProgress: number;
  runningStatus: RunningStatus;
  rating: number;
  note: string;
  interrupted?: boolean;
};

const categoryIcons: Record<string, React.ReactNode> = {
  Rozumienie: <BookOpen className="h-4 w-4" />,
  Logika: <Brain className="h-4 w-4" />,
  Kod: <Code2 className="h-4 w-4" />,
  Kreatywność: <Sparkles className="h-4 w-4" />,
  Język: <Languages className="h-4 w-4" />,
};

function getResults(): TestResult[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("ollama-test-results") || "[]");
  } catch {
    return [];
  }
}

function saveResult(result: TestResult) {
  const all = getResults();
  all.push(result);
  localStorage.setItem("ollama-test-results", JSON.stringify(all));
}

function deleteResult(id: string) {
  const all = getResults().filter((r) => r.id !== id);
  localStorage.setItem("ollama-test-results", JSON.stringify(all));
}

function clearAllResults() {
  if (!confirm("Czy na pewno chcesz wyczyścić całą historię wyników?")) return;
  localStorage.setItem("ollama-test-results", "[]");
}

function getTimestamp() {
  return Date.now();
}

function saveRunningState(state: PersistedRunningState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_RUNNING_STATE, JSON.stringify(state));
}

function getRunningState(): PersistedRunningState | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(LS_RUNNING_STATE) || "null");
  } catch {
    return null;
  }
}

function clearRunningState() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LS_RUNNING_STATE);
}

export default function TestsPage() {
  const settings = useSettings();
  const { t } = useI18n();
  const [models, setModels] = useState<ModelItem[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [loadedModels, setLoadedModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(LS_SELECTED_MODEL) || "";
  });
  const [results, setResults] = useState<TestResult[]>(() => {
    if (typeof window === "undefined") return [];
    return getResults();
  });
  const [runningId, setRunningId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const s = getRunningState();
    return s?.runningId || null;
  });
  const [runningResponse, setRunningResponse] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    const s = getRunningState();
    if (s?.interrupted) {
      return (
        (s.runningResponse ? s.runningResponse + "\n\n" : "") +
        "[Test został przerwany przez odświeżenie strony. Zapisz wynik lub uruchom test ponownie.]"
      );
    }
    return s?.runningResponse || "";
  });
  const [runningTime, setRunningTime] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const s = getRunningState();
    return s?.runningTime || 0;
  });
  const [runningProgress, setRunningProgress] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const s = getRunningState();
    return s?.runningProgress || 0;
  });
  const [runningStatus, setRunningStatus] = useState<RunningStatus | null>(() => {
    if (typeof window === "undefined") return null;
    const s = getRunningState();
    if (s?.interrupted) return RUNNING_ERROR;
    return s?.runningStatus || null;
  });
  const [rating, setRating] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const s = getRunningState();
    return s?.rating || 0;
  });
  const [note, setNote] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    const s = getRunningState();
    return s?.note || "";
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modelLoading, setModelLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);

  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const firstTokenTimeRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    Promise.all([
      fetch("/api/tags").then((res) => res.json()),
      fetch("/api/ps").then((res) => res.json()),
    ])
      .then(([tagsData, psData]) => {
        const list = (tagsData.models || []).map((m: { name: string }) => ({
          name: m.name,
        }));
        setModels(list);
        setLoadedModels((psData.models || []).map((m: { name: string }) => m.name));
        setModelsLoading(false);
      })
      .catch(() => {
        setModels([]);
        setLoadedModels([]);
        setModelsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && selectedModel) {
      localStorage.setItem(LS_SELECTED_MODEL, selectedModel);
    }
  }, [selectedModel]);

  useEffect(() => {
    function handleBeforeUnload() {
      if (runningId) {
        saveRunningState({
          runningId,
          runningResponse,
          runningTime,
          runningProgress,
          runningStatus: runningStatus || RUNNING_INIT,
          rating,
          note,
          interrupted: true,
        });
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [runningId, runningResponse, runningTime, runningProgress, runningStatus, rating, note]);

  useEffect(() => {
    if (!runningId) {
      clearRunningState();
      return;
    }
    saveRunningState({
      runningId,
      runningResponse,
      runningTime,
      runningProgress,
      runningStatus: runningStatus || RUNNING_INIT,
      rating,
      note,
      interrupted: false,
    });
  }, [runningId, runningResponse, runningTime, runningProgress, runningStatus, rating, note]);

  const groupedBenchmarks = useMemo(() => {
    const map: Record<string, typeof benchmarks> = {};
    benchmarks.forEach((b) => {
      if (!map[b.category]) map[b.category] = [];
      map[b.category].push(b);
    });
    return map;
  }, []);

  function clearProgressTimer() {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }

  function startProgressTimer() {
    clearProgressTimer();
    startTimeRef.current = getTimestamp();
    firstTokenTimeRef.current = null;
    progressTimerRef.current = setInterval(() => {
      const elapsed = getTimestamp() - startTimeRef.current;
      setRunningTime(Math.round(elapsed));
      if (!firstTokenTimeRef.current) {
        const p = Math.min((elapsed / 20000) * 40, 40) + Math.min(((elapsed - 20000) / 30000) * 15, 15);
        setRunningProgress(Math.min(p, 55));
      } else {
        const sinceFirst = getTimestamp() - firstTokenTimeRef.current;
        const p = 40 + Math.min((sinceFirst / 30000) * 55, 55);
        setRunningProgress(Math.min(p, 95));
      }
    }, 500);
  }

  async function loadModel() {
    if (!selectedModel) {
      toast.error(t.tests.chooseModelFirst);
      return;
    }
    setModelLoading(true);
    setLoadProgress(0);
    const timer = setInterval(() => {
      setLoadProgress((p) => Math.min(p + 5, 90));
    }, 500);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel,
          prompt: "Say hello",
          stream: false,
          keep_alive: "5m",
        }),
      });
      clearInterval(timer);
      setLoadProgress(100);
      if (!res.ok) {
        const text = await res.text();
        toast.error(t.tests.loadError + ": " + text);
      } else {
        toast.success(t.tests.loadSuccess + ": " + selectedModel);
        const psRes = await fetch("/api/ps");
        const psData = await psRes.json();
        setLoadedModels((psData.models || []).map((m: { name: string }) => m.name));
      }
    } catch (e: unknown) {
      clearInterval(timer);
      const msg = e instanceof Error ? e.message : "Error";
      toast.error(t.tests.loadError + ": " + msg);
    } finally {
      setTimeout(() => {
        setModelLoading(false);
        setLoadProgress(0);
      }, 600);
    }
  }

  async function unloadModel() {
    if (!selectedModel) return;
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel,
          prompt: "",
          stream: false,
          keep_alive: 0,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        toast.error(t.tests.loadError + ": " + text);
      } else {
        toast.success(t.tests.unloadSuccess + ": " + selectedModel);
        const psRes = await fetch("/api/ps");
        const psData = await psRes.json();
        setLoadedModels((psData.models || []).map((m: { name: string }) => m.name));
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error";
      toast.error(t.tests.loadError + ": " + msg);
    }
  }

  async function runBenchmark(benchmark: (typeof benchmarks)[0]) {
    if (!selectedModel) {
      toast.error(t.tests.chooseModelFirst);
      return;
    }
    setRunningId(benchmark.id);
    setRunningResponse("");
    setRunningTime(0);
    setRunningProgress(0);
    setRunningStatus(RUNNING_INIT);
    setRating(0);
    setNote("");
    startProgressTimer();

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel,
          prompt: benchmark.prompt,
          stream: true,
          system: settings.options.system || undefined,
          options: {
            temperature: settings.options.temperature,
            top_p: settings.options.top_p,
            top_k: settings.options.top_k,
            num_ctx: settings.options.num_ctx,
            seed: settings.options.seed || undefined,
          },
        }),
      });
      if (!res.ok || !res.body) {
        const text = await res.text();
        setRunningResponse("Error: " + text);
        setRunningStatus(RUNNING_ERROR);
        clearProgressTimer();
        setRunningId(null);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;
      let text = "";

      while (!done) {
        const { value, done: d } = await reader.read();
        done = d;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const obj = JSON.parse(line);
              if (obj.response) {
                if (!firstTokenTimeRef.current) {
                  firstTokenTimeRef.current = getTimestamp();
                  setRunningStatus(RUNNING_GENERATE);
                }
                text += obj.response;
                setRunningResponse(text);
              }
              if (obj.done) {
                done = true;
                break;
              }
            } catch {
              // empty
            }
          }
        }
      }
      clearProgressTimer();
      setRunningProgress(100);
      setRunningStatus(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error";
      setRunningResponse("Error: " + msg);
      setRunningStatus(RUNNING_ERROR);
      clearProgressTimer();
      setRunningId(null);
    }
  }

  async function runSelected() {
    if (selectedIds.length === 0) {
      toast.error(t.tests.selectAtLeastOne);
      return;
    }
    const toRun = benchmarks.filter((b) => selectedIds.includes(b.id));
    for (const b of toRun) {
      await runBenchmark(b);
      if (runningStatus === RUNNING_ERROR) break;
    }
    setSelectedIds([]);
  }

  function submitResult(benchmark: (typeof benchmarks)[0]) {
    const result: TestResult = {
      id: generateId(),
      model: selectedModel,
      benchmarkId: benchmark.id,
      benchmarkName: benchmark.name,
      prompt: benchmark.prompt,
      response: runningResponse,
      rating,
      note,
      durationMs: runningTime,
      timestamp: new Date().toISOString(),
    };
    saveResult(result);
    setResults(getResults());
    setRunningId(null);
    setRunningResponse("");
    setRunningTime(0);
    setRunningProgress(0);
    setRunningStatus(null);
    setRating(0);
    setNote("");
    clearRunningState();
    toast.success(t.tests.saveSuccess);
  }

  function cancelRunning() {
    clearProgressTimer();
    setRunningId(null);
    setRunningResponse("");
    setRunningTime(0);
    setRunningProgress(0);
    setRunningStatus(null);
    setRating(0);
    setNote("");
    clearRunningState();
  }

  function exportResults() {
    const blob = new Blob([JSON.stringify(results, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ollama-test-results-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(t.tests.exportSuccess);
  }

  const modelResults = useMemo(
    () => results.filter((r) => !selectedModel || r.model === selectedModel),
    [results, selectedModel]
  );

  const avgDuration = useMemo(() => {
    if (modelResults.length === 0) return 0;
    return Math.round(
      modelResults.reduce((sum, r) => sum + r.durationMs, 0) / modelResults.length
    );
  }, [modelResults]);

  const statusText = useMemo(() => {
    if (!runningId) return "";
    if (runningStatus === RUNNING_INIT) return t.tests.initStatus;
    if (runningStatus === RUNNING_GENERATE) return t.tests.generateStatus;
    if (runningStatus === RUNNING_ERROR) return t.tests.errorStatus;
    return t.tests.doneStatus;
  }, [runningId, runningStatus, t]);

  const isModelLoaded = selectedModel && loadedModels.includes(selectedModel);

  function toggleBenchmark(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function selectAll() {
    setSelectedIds(benchmarks.map((b) => b.id));
  }

  function deselectAll() {
    setSelectedIds([]);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-[#242424]">
            {t.tests.title}
          </h1>
          <p className="mt-1 text-base text-[#898989]">{t.tests.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {modelsLoading ? (
            <Skeleton className="h-9 w-[200px]" />
          ) : (
            <Select
              value={selectedModel || undefined}
              onValueChange={(v) => v && setSelectedModel(v)}
              disabled={models.length === 0}
            >
              <SelectTrigger className="w-[260px]">
                <SelectValue placeholder={t.tests.selectModel} />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m.name} value={m.name}>
                    <span className="flex items-center gap-2">
                      {m.name}
                      {loadedModels.includes(m.name) && (
                        <Activity className="h-3 w-3 text-green-600" />
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={!selectedModel || modelLoading}
            onClick={loadModel}
          >
            {modelLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : isModelLoaded ? (
              <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
            ) : (
              <Activity className="mr-2 h-4 w-4" />
            )}
            {modelLoading ? t.tests.loading : isModelLoaded ? t.tests.loaded : t.tests.loadModel}
          </Button>
          {isModelLoaded && (
            <Button variant="ghost" size="sm" className="text-red-600" onClick={unloadModel}>
              {t.tests.unloadModel || "Wyładuj"}
            </Button>
          )}
          {modelLoading && (
            <div className="w-32 space-y-1">
              <div className="flex justify-between text-xs text-[#898989]">
                <span>Loading</span>
                <span>{loadProgress}%</span>
              </div>
              <Progress value={loadProgress} />
            </div>
          )}
          <Button variant="outline" size="sm" onClick={exportResults}>
            <Download className="mr-2 h-4 w-4" />
            {t.tests.export}
          </Button>
        </div>
      </div>

      <div className="mb-5 rounded-[12px] border border-[rgba(34,42,53,0.08)] bg-white p-4 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="default"
              disabled={selectedIds.length === 0 || !selectedModel || runningId !== null}
              onClick={runSelected}
            >
              <ListChecks className="mr-2 h-4 w-4" />
              {t.tests.runSelected} ({selectedIds.length})
            </Button>
            <Button size="sm" variant="ghost" onClick={selectAll}>
              {t.tests.selectAll}
            </Button>
            <Button size="sm" variant="ghost" onClick={deselectAll}>
              {t.tests.deselectAll}
            </Button>
          </div>
          {selectedModel && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[#898989]">{t.tests.selectModel}:</span>
              <span className="font-medium text-[#242424]">{selectedModel}</span>
              {isModelLoaded && (
                <Badge className="bg-green-600 text-white">{t.tests.loaded}</Badge>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {Object.entries(groupedBenchmarks).map(([category, list]) => (
            <div key={category}>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-[#242424]">
                {categoryIcons[category] || <FlaskConical className="h-4 w-4" />}
                {category}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {list.map((b) => (
                  <Card
                    key={b.id}
                    className={`transition-all hover:shadow-card-hover ${
                      runningId === b.id ? "border-[#242424] ring-1 ring-[#242424]" : ""
                    }`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-sm font-semibold text-[#242424]">{b.name}</CardTitle>
                        <Checkbox
                          checked={selectedIds.includes(b.id)}
                          onCheckedChange={() => toggleBenchmark(b.id)}
                          aria-label={`Select ${b.name}`}
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="mb-3 line-clamp-3 text-xs text-[#898989]">{b.prompt}</p>
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={!selectedModel || runningId !== null}
                        onClick={() => runBenchmark(b)}
                      >
                        <Play className="mr-2 h-4 w-4" />
                        {runningId === b.id ? t.tests.running : t.tests.runTest}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          {runningId && (
            <Card className="border-[#242424] ring-1 ring-[#242424]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-[#242424]">{t.tests.resultTitle}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ScrollArea className="h-40 rounded-[8px] border border-[rgba(34,42,53,0.08)] bg-[#fafafa] p-2 text-xs">
                  <pre className="whitespace-pre-wrap text-[#242424]">
                    {runningResponse || t.tests.waiting}
                  </pre>
                </ScrollArea>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-[#898989]">
                    <span>{runningTime > 0 ? `${t.tests.time}: ${runningTime} ms` : `${t.tests.time}: ${t.tests.noTime}`}</span>
                    <span>{runningProgress.toFixed(0)}%</span>
                  </div>
                  <Progress value={runningProgress} />
                  <div className="text-xs text-[#898989]">{statusText}</div>
                </div>
                {runningStatus === RUNNING_ERROR && (
                  <Button size="sm" variant="outline" className="w-full" onClick={cancelRunning}>
                    {t.tests.close}
                  </Button>
                )}
                {!runningResponse.startsWith("Error:") && runningResponse && runningStatus !== RUNNING_ERROR && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs">{t.tests.rate}</Label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Tooltip key={star}>
                            <TooltipTrigger
                              render={
                                <button
                                  onClick={() => setRating(star)}
                                  className={`rounded p-1 transition-colors ${
                                    rating >= star
                                      ? "text-amber-500"
                                      : "text-[#e5e5e5] hover:text-[#898989]"
                                  }`}
                                >
                                  <Star className="h-4 w-4 fill-current" />
                                </button>
                              }
                            />
                            <TooltipContent>{star}/5</TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t.tests.note}</Label>
                      <input
                        className="w-full rounded-[6px] border border-[rgba(34,42,53,0.08)] bg-white px-2 py-1 text-xs text-[#242424]"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder={t.tests.notePlaceholder}
                      />
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={rating === 0}
                      onClick={() =>
                        submitResult(benchmarks.find((b) => b.id === runningId)!)
                      }
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {t.tests.saveResult}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-[#242424] flex items-center gap-2">
                <History className="h-4 w-4" />
                {t.tests.historyTitle}
                {selectedModel && (
                  <span className="text-xs font-normal text-[#898989]">
                    ({modelResults.length})
                  </span>
                )}
              </CardTitle>
              {results.length > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-red-600" onClick={() => { clearAllResults(); setResults(getResults()); }}>
                  {t.tests.clearHistory}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {selectedModel && avgDuration > 0 && (
                <div className="mb-3 rounded-[8px] bg-[#f5f5f5] px-3 py-2 text-xs text-[#242424]">
                  {t.tests.avgTime} <strong>{selectedModel}</strong>:{" "}
                  <span className="font-semibold">{avgDuration} ms</span>
                </div>
              )}
              <ScrollArea className="h-[calc(100vh-24rem)]">
                <div className="space-y-3">
                  {modelResults.length === 0 && (
                    <div className="text-xs text-[#898989]">{t.tests.noResults}</div>
                  )}
                  {modelResults
                    .slice()
                    .reverse()
                    .map((r) => (
                      <div key={r.id} className="rounded-[8px] border border-[rgba(34,42,53,0.08)] bg-white p-3 text-xs shadow-soft">
                        <div className="mb-1 flex items-center justify-between">
                          <Badge variant="secondary">{r.benchmarkName}</Badge>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-red-600"
                            onClick={() => {
                              deleteResult(r.id);
                              setResults(getResults());
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="mb-1 text-[#898989]">
                          Model: <span className="font-medium text-[#242424]">{r.model}</span> •{" "}
                          {t.tests.time}: {r.durationMs}ms
                        </div>
                        <div className="mb-1 line-clamp-3 text-[#242424]/80">
                          {r.response}
                        </div>
                        {r.rating > 0 && (
                          <div className="flex items-center gap-1 text-amber-500">
                            <Star className="h-3 w-3 fill-current" />
                            {r.rating}/5
                          </div>
                        )}
                        {r.note && (
                          <div className="mt-1 italic text-[#898989]">„{r.note}”</div>
                        )}
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
