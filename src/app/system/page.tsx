"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSettings } from "@/lib/settings-context";
import { useI18n } from "@/lib/i18n-context";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Cpu,
  Database,
  RefreshCw,
  Server,
  Settings2,
  Thermometer,
} from "lucide-react";
import { toast } from "sonner";

type OllamaVersion = {
  version: string;
};

type RunningModel = {
  name: string;
  model: string;
  size: number;
  digest: string;
  details?: Record<string, unknown>;
  expires_at: string;
  size_vram?: number;
};

type InstalledModel = {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
  details?: Record<string, unknown>;
};

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default function SystemPage() {
  const { t } = useI18n();
  const settings = useSettings();
  const [version, setVersion] = useState<OllamaVersion | null>(null);
  const [versionError, setVersionError] = useState<string>("");
  const [running, setRunning] = useState<RunningModel[]>([]);
  const [installed, setInstalled] = useState<InstalledModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [gpu, setGpu] = useState<{ totalMb: number; usedMb: number; freeMb: number; source: string } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setVersionError("");
    try {
      const [vRes, psRes, tagsRes] = await Promise.allSettled([
        fetch("/api/version"),
        fetch("/api/ps"),
        fetch("/api/tags"),
      ]);

      if (vRes.status === "fulfilled") {
        const vData = await vRes.value.json();
        if (vRes.value.ok) {
          setVersion(vData);
        } else {
          setVersionError(vData.error || "Unknown error");
          setVersion(null);
        }
      } else {
        setVersionError(vRes.reason?.message || t.system.inactive);
        setVersion(null);
      }

      if (psRes.status === "fulfilled") {
        const psData = await psRes.value.json();
        setRunning(psData.models || []);
      } else {
        setRunning([]);
      }

      if (tagsRes.status === "fulfilled") {
        const tagsData = await tagsRes.value.json();
        setInstalled(tagsData.models || []);
      } else {
        setInstalled([]);
      }

      try {
        const gpuRes = await fetch("/api/gpu");
        const gpuData = await gpuRes.json();
        setGpu(gpuData);
      } catch {
        setGpu(null);
      }
    } catch {
      toast.error("Error fetching system data");
    } finally {
      setLoading(false);
    }
  }, [t.system.inactive]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchData, 10000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchData]);

  const totalInstalledSize = useMemo(
    () => installed.reduce((sum, m) => sum + (m.size || 0), 0),
    [installed]
  );

  const totalRunningSize = useMemo(
    () => running.reduce((sum, m) => sum + (m.size || 0), 0),
    [running]
  );

  const totalVramSize = useMemo(
    () => running.reduce((sum, m) => sum + (m.size_vram || 0), 0),
    [running]
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-[#242424]">
            {t.system.title}
          </h1>
          <p className="mt-1 text-base text-[#898989]">
            {t.system.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-[#242424]">
            <Switch
              id="auto-refresh"
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            />
            <label htmlFor="auto-refresh" className="cursor-pointer">
              Auto-odświeżanie
            </label>
          </div>
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Odśwież
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-[#242424]">{t.system.connectionStatus}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          ) : versionError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Brak połączenia</AlertTitle>
              <AlertDescription>
                {versionError}. Sprawdź czy Ollama działa i czy adres{" "}
                <code className="rounded bg-red-100 px-1 py-0.5">OLLAMA_HOST</code>{" "}
                jest poprawny.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-[#f5f5f5] p-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <span className="font-semibold text-[#242424]">{t.system.active}</span>
              </div>
              {version && (
                <Badge variant="secondary">{t.system.version}: {version.version}</Badge>
              )}
              <Badge variant="outline">
                Host: {process.env.NEXT_PUBLIC_OLLAMA_HOST || "http://host.docker.internal:11434"}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t.system.installedModels}
          value={installed.length.toString()}
          sub={formatBytes(totalInstalledSize) + " na dysku"}
          icon={<Database className="h-4 w-4 text-[#898989]" />}
          loading={loading}
        />
        <StatCard
          title={t.system.loadedModels}
          value={running.length.toString()}
          sub={formatBytes(totalRunningSize) + " w pamięci"}
          icon={<Activity className="h-4 w-4 text-[#898989]" />}
          loading={loading}
        />
        <StatCard
          title={t.system.vramUsed}
          value={formatBytes(totalVramSize)}
          sub={gpu && gpu.source !== "none" ? `${formatBytes(gpu.freeMb * 1024 * 1024)} ${t.system.vramAvailable}` : "Suma size_vram"}
          icon={<Cpu className="h-4 w-4 text-[#898989]" />}
          loading={loading}
        />
        <StatCard
          title={t.system.contextSize}
          value={settings.options.num_ctx.toLocaleString("pl-PL")}
          sub="Globalne ustawienie num_ctx"
          icon={<Server className="h-4 w-4 text-[#898989]" />}
          loading={loading}
        />
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-[#242424]">{t.system.loadedDetails}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : running.length === 0 ? (
            <div className="text-sm text-[#898989]">
              {t.system.noLoaded}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-[8px] border border-[rgba(34,42,53,0.08)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nazwa</TableHead>
                    <TableHead>Rozmiar</TableHead>
                    <TableHead>VRAM</TableHead>
                    <TableHead>Wygaśnięcie</TableHead>
                    <TableHead>Digest</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {running.map((m) => (
                    <TableRow key={m.digest}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell>{formatBytes(m.size)}</TableCell>
                      <TableCell>{m.size_vram ? formatBytes(m.size_vram) : "—"}</TableCell>
                      <TableCell>
                        {m.expires_at
                          ? new Date(m.expires_at).toLocaleString("pl-PL")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-[#898989]">
                        {m.digest.slice(0, 16)}…
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold text-[#242424]">{t.system.globalSettings}</CardTitle>
          <Settings2 className="h-4 w-4 text-[#898989]" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SettingTile
              icon={<Thermometer className="h-4 w-4" />}
              label="Temperature"
              value={settings.options.temperature}
            />
            <SettingTile label="Top P" value={settings.options.top_p} />
            <SettingTile label="Top K" value={settings.options.top_k} />
            <SettingTile label="Seed" value={settings.options.seed || "—"} />
            <SettingTile
              label={t.system.contextSize}
              value={settings.options.num_ctx.toLocaleString("pl-PL")}
            />
            <SettingTile
              label="System prompt"
              value={settings.options.system || "—"}
              truncate
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  sub,
  icon,
  loading,
}: {
  title: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-semibold text-[#242424]">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? (
          <>
            <Skeleton className="mb-2 h-7 w-20" />
            <Skeleton className="h-4 w-32" />
          </>
        ) : (
          <>
            <div className="text-2xl font-bold text-[#242424]">{value}</div>
            <p className="text-xs text-[#898989]">{sub}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SettingTile({
  icon,
  label,
  value,
  truncate,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string | number;
  truncate?: boolean;
}) {
  return (
    <div className="rounded-[8px] border border-[rgba(34,42,53,0.08)] bg-white p-3 shadow-soft">
      <div className="mb-1 flex items-center gap-2 text-xs text-[#898989]">
        {icon}
        {label}
      </div>
      <div className={`text-lg font-semibold text-[#242424] ${truncate ? "truncate" : ""}`}>{value}</div>
    </div>
  );
}
