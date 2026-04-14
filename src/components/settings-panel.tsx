"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useSettings } from "@/lib/settings-context";
import { Settings2 } from "lucide-react";

export function SettingsPanel() {
  const { options, setOptions, resetOptions } = useSettings();

  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" size="sm" />}>
        <Settings2 className="mr-2 h-4 w-4" />
        Ustawienia
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Ustawienia generowania</SheetTitle>
          <SheetDescription>
            Parametry domyślne dla zapytań do Ollama. Zapisują się automatycznie w
            przeglądarce.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Temperature</Label>
              <span className="text-sm text-[#898989] font-medium">{options.temperature}</span>
            </div>
            <Slider
              value={[options.temperature]}
              onValueChange={(v) => setOptions({ temperature: Array.isArray(v) ? v[0] : v })}
              min={0}
              max={2}
              step={0.1}
            />
            <p className="text-xs text-[#898989]">
              Niższa wartość = bardziej przewidywalne odpowiedzi.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Top P</Label>
              <span className="text-sm text-[#898989] font-medium">{options.top_p}</span>
            </div>
            <Slider
              value={[options.top_p]}
              onValueChange={(v) => setOptions({ top_p: Array.isArray(v) ? v[0] : v })}
              min={0}
              max={1}
              step={0.05}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Top K</Label>
              <span className="text-sm text-[#898989] font-medium">{options.top_k}</span>
            </div>
            <Slider
              value={[options.top_k]}
              onValueChange={(v) => setOptions({ top_k: Array.isArray(v) ? v[0] : v })}
              min={1}
              max={100}
              step={1}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="num_ctx">Context size</Label>
              <Input
                id="num_ctx"
                type="number"
                value={options.num_ctx}
                onChange={(e) =>
                  setOptions({ num_ctx: parseInt(e.target.value || "0", 10) })
                }
                min={1}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seed">Seed</Label>
              <Input
                id="seed"
                type="number"
                value={options.seed}
                onChange={(e) =>
                  setOptions({ seed: parseInt(e.target.value || "0", 10) })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="system">System prompt</Label>
            <Textarea
              id="system"
              value={options.system || ""}
              onChange={(e) => setOptions({ system: e.target.value })}
              placeholder="Wpisz domyślny system prompt..."
              rows={4}
            />
            <p className="text-xs text-[#898989]">
              Zostanie dołączony do każdej rozmowy (o ile model go wspiera).
            </p>
          </div>
        </div>
        <SheetFooter className="flex-row gap-2">
          <Button variant="outline" onClick={resetOptions} className="flex-1">
            Resetuj
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
