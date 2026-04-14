"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ChangelogPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-heading text-3xl font-semibold tracking-tight text-[#242424]">
        Changelog
      </h1>
      <p className="mt-1 text-base text-[#898989]">
        Historia zmian i nowych funkcji w Ollama Manager.
      </p>

      <div className="mt-8 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-[#242424]">v1.2.0</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm text-[#242424]">
              <li>Multi-model loading – możliwość załadowania kilku modeli jednocześnie z listy głównej.</li>
              <li>Real loading progress – pasek postępu oparty na faktycznym stanie /api/ps zamiast sztucznego timera.</li>
              <li>Ostrzeżenia RAM/VRAM przed załadowaniem modelu.</li>
              <li>Poprawione wyładowywanie modeli – model jest trzymany w pamięci do momentu ręcznego unloadu (keep_alive: -1).</li>
              <li>Multi-model chat – wysyłanie tego samego promptu do wielu załadowanych modeli równolegle.</li>
              <li>Monitorowanie temperatury CPU i zużycia RAM na stronie System.</li>
              <li>Rozszerzone okno wyników benchmarków (h-64).</li>
              <li>Nowa podstrona changelogu w stopce.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-[#242424]">v1.1.0</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm text-[#242424]">
              <li>Pełne wsparcie językowe PL/EN z przełącznikiem w nawigacji.</li>
              <li>Strona testów benchmarkowych z 14 presetami i eksportem wyników.</li>
              <li>Monitorowanie VRAM przez endpoint /api/gpu.</li>
              <li>Design system w stylu Cal.com (czcionka Cal Sans, monochromatyczna paleta).</li>
              <li>Toggle szerokości okna chatu (wąskie / pełna szerokość).</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-[#242424]">v1.0.0</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm text-[#242424]">
              <li>Pierwsza wersja aplikacji: przeglądarka modeli, chat, podstawowe testy, ustawienia globalne generowania.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
