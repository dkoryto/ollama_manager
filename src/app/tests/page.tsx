"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { benchmarks } from "@/lib/benchmarks";
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
} from "lucide-react";
import { toast } from "sonner";

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

export default function TestsPage() {
  const settings = useSettings();
  const [models, setModels] = useState<ModelItem[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [results, setResults] = useState<TestResult[]>(() => {
    if (typeof window === "undefined") return [];
    return getResults();
  });
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runningResponse, setRunningResponse] = useState("");
  const [runningTime, setRunningTime] = useState(0);
  const [runningProgress, setRunningProgress] = useState(0);
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState("");

  useEffect(() => {
    fetch("/api/tags")
      .then((res) => res.json())
      .then((data) => {
        const list = (data.models || []).map((m: { name: string }) => ({ name: m.name }));
        setModels(list);
        setModelsLoading(false);
      })
      .catch(() => {
        setModels([]);
        setModelsLoading(false);
      });
  }, []);

  const groupedBenchmarks = useMemo(() => {
    const map: Record<string, typeof benchmarks> = {};
    benchmarks.forEach((b) => {
      if (!map[b.category]) map[b.category] = [];
      map[b.category].push(b);
    });
    return map;
  }, []);

  async function runBenchmark(benchmark: (typeof benchmarks)[0]) {
    if (!selectedModel) {
      toast.error("Wybierz model przed uruchomieniem testu");
      return;
    }
    setRunningId(benchmark.id);
    setRunningResponse("");
    setRunningTime(0);
    setRunningProgress(0);
    setRating(0);
    setNote("");
    const start = getTimestamp();

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
        setRunningResponse("Błąd: " + text);
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
                text += obj.response;
                setRunningResponse(text);
                const elapsed = getTimestamp() - start;
                setRunningTime(Math.round(elapsed));
                setRunningProgress(Math.min((elapsed / 30000) * 100, 95));
              }
              if (obj.done) {
                done = true;
                setRunningProgress(100);
                break;
              }
            } catch {
              // empty
            }
          }
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Błąd";
      setRunningResponse("Błąd: " + msg);
    }
  }

  function submitResult(benchmark: (typeof benchmarks)[0]) {
    const result: TestResult = {
      id: crypto.randomUUID(),
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
    setRating(0);
    setNote("");
    toast.success("Wynik zapisany");
  }

  function exportResults() {
    const blob = new Blob([JSON.stringify(results, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ollama-test-results-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Wyniki wyeksportowane");
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Testy benchmarkowe</h1>
          <p className="text-sm text-muted-foreground">
            Porównuj modele za pomocą presetowych zadań i zapisuj wyniki
          </p>
        </div>
        <div className="flex items-center gap-2">
          {modelsLoading ? (
            <Skeleton className="h-9 w-[200px]" />
          ) : (
            <Select
              value={selectedModel || undefined}
              onValueChange={(v) => v && setSelectedModel(v)}
              disabled={models.length === 0}
            >
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="Wybierz model" />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m.name} value={m.name}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" onClick={exportResults}>
            <Download className="mr-2 h-4 w-4" />
            Eksport
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {Object.entries(groupedBenchmarks).map(([category, list]) => (
            <div key={category}>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-medium">
                {categoryIcons[category] || <FlaskConical className="h-4 w-4" />}
                {category}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {list.map((b) => (
                  <Card
                    key={b.id}
                    className={`transition-shadow hover:shadow-sm ${
                      runningId === b.id ? "border-primary ring-1" : ""
                    }`}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">{b.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="mb-3 line-clamp-3 text-xs text-muted-foreground">
                        {b.prompt}
                      </p>
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={!selectedModel || runningId !== null}
                        onClick={() => runBenchmark(b)}
                      >
                        <Play className="mr-2 h-4 w-4" />
                        {runningId === b.id ? "Trwa test..." : "Uruchom test"}
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
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Wynik testu</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ScrollArea className="h-40 rounded-md border bg-muted/50 p-2 text-xs">
                  <pre className="whitespace-pre-wrap">
                    {runningResponse || "Oczekiwanie na odpowiedź..."}
                  </pre>
                </ScrollArea>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Czas: {runningTime} ms</span>
                    <span>{runningProgress.toFixed(0)}%</span>
                  </div>
                  <Progress value={runningProgress} className="h-2" />
                </div>
                {!runningResponse.startsWith("Błąd:") && runningResponse && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs">Ocena</Label>
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
                                      : "text-muted-foreground/30 hover:text-muted-foreground"
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
                      <Label className="text-xs">Notatka</Label>
                      <input
                        className="w-full rounded border bg-background px-2 py-1 text-xs"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Opcjonalna notatka..."
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
                      Zapisz wynik
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <History className="h-4 w-4" />
                Historia wyników
                {selectedModel && (
                  <span className="text-xs font-normal text-muted-foreground">
                    ({modelResults.length})
                  </span>
                )}
              </CardTitle>
              {results.length > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-destructive" onClick={() => { clearAllResults(); setResults(getResults()); }}>
                  Wyczyść
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {selectedModel && avgDuration > 0 && (
                <div className="mb-3 rounded-md bg-muted/50 px-3 py-2 text-xs">
                  Średni czas generowania dla <strong>{selectedModel}</strong>:{" "}
                  <span className="font-semibold">{avgDuration} ms</span>
                </div>
              )}
              <ScrollArea className="h-[calc(100vh-24rem)]">
                <div className="space-y-3">
                  {modelResults.length === 0 && (
                    <div className="text-xs text-muted-foreground">
                      Brak zapisanych wyników.
                    </div>
                  )}
                  {modelResults
                    .slice()
                    .reverse()
                    .map((r) => (
                      <div key={r.id} className="rounded-md border p-3 text-xs">
                        <div className="mb-1 flex items-center justify-between">
                          <Badge variant="secondary">{r.benchmarkName}</Badge>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-destructive"
                            onClick={() => {
                              deleteResult(r.id);
                              setResults(getResults());
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="mb-1 text-muted-foreground">
                          Model: <span className="font-medium">{r.model}</span> •{" "}
                          Czas: {r.durationMs}ms
                        </div>
                        <div className="mb-1 line-clamp-3 text-foreground/80">
                          {r.response}
                        </div>
                        {r.rating > 0 && (
                          <div className="flex items-center gap-1 text-amber-500">
                            <Star className="h-3 w-3 fill-current" />
                            {r.rating}/5
                          </div>
                        )}
                        {r.note && (
                          <div className="mt-1 italic text-muted-foreground">„{r.note}”</div>
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
