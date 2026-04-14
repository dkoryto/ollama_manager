"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
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
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useSettings } from "@/lib/settings-context";
import {
  type ChatSession,
  type ChatMessage,
  getChatSessions,
  saveChatSessions,
  createChatSession,
  updateChatSession,
  deleteChatSession,
  generateTitle,
} from "@/lib/chat-storage";
import {
  Bot,
  User,
  Send,
  Trash2,
  Star,
  Settings2,
  Plus,
  Menu,
  MessageSquare,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";

type ModelItem = {
  name: string;
};

type ChatOptions = {
  temperature: number;
  top_p: number;
  top_k: number;
  num_ctx: number;
  seed: number;
};

export default function ChatPage() {
  const globalSettings = useSettings();
  const [models, setModels] = useState<ModelItem[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(globalSettings.options.system || "");
  const [options, setOptions] = useState<ChatOptions>({
    temperature: globalSettings.options.temperature,
    top_p: globalSettings.options.top_p,
    top_k: globalSettings.options.top_k,
    num_ctx: globalSettings.options.num_ctx,
    seed: globalSettings.options.seed,
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeSession = sessions.find((s) => s.id === activeId) || null;

  // Load models and sessions
  useEffect(() => {
    fetch("/api/tags")
      .then((res) => res.json())
      .then((data) => {
        const list = (data.models || []).map((m: { name: string }) => ({ name: m.name }));
        setModels(list);
      })
      .catch(() => setModels([]));

    const stored = getChatSessions();
    setSessions(stored);

    // Load model from query param
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const m = params.get("model");
      if (m) {
        const session = createChatSession(m);
        const next = [session, ...stored];
        saveChatSessions(next);
        setSessions(next);
        setActiveId(session.id);
      } else if (stored.length > 0) {
        setActiveId(stored[0].id);
      }
    }
  }, []);

  // Sync global settings
  useEffect(() => {
    setOptions({
      temperature: globalSettings.options.temperature,
      top_p: globalSettings.options.top_p,
      top_k: globalSettings.options.top_k,
      num_ctx: globalSettings.options.num_ctx,
      seed: globalSettings.options.seed,
    });
    setSystemPrompt(globalSettings.options.system || "");
  }, [globalSettings.options]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [activeSession?.messages, streaming]);

  function handleNewChat(preselectedModel?: string) {
    const model = preselectedModel || activeSession?.model || (models[0]?.name ?? "");
    const session = createChatSession(model);
    const next = [session, ...sessions];
    saveChatSessions(next);
    setSessions(next);
    setActiveId(session.id);
    setMobileMenuOpen(false);
  }

  function handleDeleteSession(id: string) {
    deleteChatSession(id);
    const next = getChatSessions();
    setSessions(next);
    if (activeId === id) {
      setActiveId(next[0]?.id || null);
    }
  }

  function handleSaveRating(messageIndex: number, rating: number) {
    if (!activeSession) return;
    const messages = activeSession.messages.map((msg, idx) =>
      idx === messageIndex ? { ...msg, rating } : msg
    );
    updateChatSession(activeSession.id, { messages });
    setSessions(getChatSessions());
  }

  const avgRating = (() => {
    if (!activeSession) return null;
    const ratings = activeSession.messages
      .filter((m) => m.role === "assistant" && typeof m.rating === "number")
      .map((m) => m.rating as number);
    if (ratings.length === 0) return null;
    return (ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(1);
  })();

  async function handleSend() {
    if (!input.trim() || !activeSession || streaming) return;
    const userMsg = input.trim();
    setInput("");

    const newMessages: ChatMessage[] = [
      ...activeSession.messages,
      { role: "user", content: userMsg },
      { role: "assistant", content: "" },
    ];

    const title = activeSession.title === "Nowy chat" ? generateTitle(newMessages) : activeSession.title;
    updateChatSession(activeSession.id, { messages: newMessages, title });
    setSessions(getChatSessions());

    setStreaming(true);
    const apiMessages = activeSession.messages.map((m) => ({ role: m.role, content: m.content }));
    apiMessages.push({ role: "user", content: userMsg });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: activeSession.model,
          messages: apiMessages,
          stream: true,
          system: systemPrompt || undefined,
          options: {
            temperature: options.temperature,
            top_p: options.top_p,
            top_k: options.top_k,
            num_ctx: options.num_ctx,
            seed: options.seed || undefined,
          },
        }),
      });
      if (!res.ok || !res.body) {
        const text = await res.text();
        const finalMessages: ChatMessage[] = [...newMessages];
        finalMessages[finalMessages.length - 1].content = "Błąd: " + text;
        updateChatSession(activeSession.id, { messages: finalMessages });
        setSessions(getChatSessions());
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;
      let assistantContent = "";

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
              if (obj.message?.content) {
                assistantContent += obj.message.content;
                const current = getChatSessions().find((s) => s.id === activeSession.id);
                if (current) {
                  const msgs = [...current.messages];
                  msgs[msgs.length - 1] = { role: "assistant", content: assistantContent };
                  updateChatSession(activeSession.id, { messages: msgs });
                  setSessions(getChatSessions());
                }
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
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      const current = getChatSessions().find((s) => s.id === activeSession.id);
      if (current) {
        const msgs = [...current.messages];
        msgs[msgs.length - 1] = { role: "assistant", content: "Błąd: " + msg };
        updateChatSession(activeSession.id, { messages: msgs });
        setSessions(getChatSessions());
      }
    } finally {
      setStreaming(false);
    }
  }

  function SidebarContent() {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b p-3">
          <span className="text-sm font-medium">Konwersacje</span>
          <Button size="icon" variant="ghost" onClick={() => handleNewChat()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-auto p-2">
          {sessions.length === 0 && (
            <div className="px-2 py-6 text-center text-xs text-muted-foreground">
              Brak zapisanych chatów.
            </div>
          )}
          <div className="space-y-1">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => {
                  setActiveId(session.id);
                  setMobileMenuOpen(false);
                }}
                className={`group flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors ${
                  activeId === session.id
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted"
                }`}
              >
                <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{session.title}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {session.model}
                  </div>
                </div>
                <div
                  className="shrink-0 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSession(session.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-muted/30 md:flex">
        <SidebarContent />
      </aside>

      {/* Mobile menu */}
      <div className="absolute left-2 top-2 z-10 md:hidden">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger>
            <Button variant="outline" size="icon">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b bg-background px-4 py-3">
          <div className="flex items-center gap-2 md:ml-0 ml-12">
            <Bot className="h-5 w-5 text-muted-foreground" />
            <Select
              value={activeSession?.model || undefined}
              onValueChange={(v) => {
                if (activeSession && v) {
                  updateChatSession(activeSession.id, { model: v });
                  setSessions(getChatSessions());
                }
              }}
              disabled={models.length === 0 || streaming}
            >
              <SelectTrigger className="w-[220px]">
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
            {avgRating !== null && (
              <span className="hidden text-sm text-muted-foreground sm:inline">
                Średnia ocena: <strong>{avgRating}</strong>/5
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings((s) => !s)}
            >
              <Settings2 className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">
                {showSettings ? "Ukryj" : "Ustawienia"}
              </span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => activeSession && handleNewChat(activeSession.model)}
            >
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Nowy chat</span>
            </Button>
          </div>
        </div>

        {showSettings && (
          <div className="grid gap-4 border-b bg-background p-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Temperature: {options.temperature}</Label>
              <Slider
                value={[options.temperature]}
                onValueChange={(v) =>
                  setOptions((o) => ({ ...o, temperature: Array.isArray(v) ? v[0] : v }))
                }
                min={0}
                max={2}
                step={0.1}
              />
            </div>
            <div className="space-y-2">
              <Label>Top P: {options.top_p}</Label>
              <Slider
                value={[options.top_p]}
                onValueChange={(v) =>
                  setOptions((o) => ({ ...o, top_p: Array.isArray(v) ? v[0] : v }))
                }
                min={0}
                max={1}
                step={0.05}
              />
            </div>
            <div className="space-y-2">
              <Label>Top K: {options.top_k}</Label>
              <Slider
                value={[options.top_k]}
                onValueChange={(v) =>
                  setOptions((o) => ({ ...o, top_k: Array.isArray(v) ? v[0] : v }))
                }
                min={1}
                max={100}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chat-num_ctx">Context size</Label>
              <Input
                id="chat-num_ctx"
                type="number"
                value={options.num_ctx}
                onChange={(e) =>
                  setOptions((o) => ({
                    ...o,
                    num_ctx: parseInt(e.target.value || "0", 10),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chat-seed">Seed</Label>
              <Input
                id="chat-seed"
                type="number"
                value={options.seed}
                onChange={(e) =>
                  setOptions((o) => ({
                    ...o,
                    seed: parseInt(e.target.value || "0", 10),
                  }))
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-3">
              <Label htmlFor="chat-system">System prompt dla tego chatu</Label>
              <Textarea
                id="chat-system"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Zostaw pusty, aby użyć globalnego system promptu..."
                rows={2}
              />
            </div>
          </div>
        )}

        {!activeSession?.model && (
          <div className="mx-4 mt-4 rounded-md border bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            Wybierz model z listy, aby rozpocząć rozmowę.
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-hidden bg-muted/20">
          <ScrollArea className="h-full px-4 py-4">
            <div className="mx-auto max-w-3xl space-y-5">
              {!activeSession && (
                <div className="py-10 text-center text-muted-foreground">
                  Wybierz lub utwórz nowy chat.
                </div>
              )}
              {activeSession?.messages.length === 0 && (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Rozpocznij rozmowę wpisując wiadomość poniżej.
                </div>
              )}
              {activeSession?.messages.map((msg, idx) => (
                <div key={idx}>
                  <div
                    className={`flex gap-3 ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {msg.role === "assistant" && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                        <Bot className="h-4 w-4" />
                      </div>
                    )}
                    <div
                      className={`relative max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-card text-card-foreground border shadow-sm"
                      }`}
                    >
                      {msg.content || (
                        <span className="animate-pulse">…</span>
                      )}
                      {msg.role === "assistant" && msg.content && (
                        <CopyButton text={msg.content} />
                      )}
                    </div>
                    {msg.role === "user" && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  {msg.role === "assistant" && msg.content && !streaming && (
                    <div className="mt-1 flex gap-3 justify-start pl-11">
                      <div className="max-w-[85%] rounded-xl bg-card px-3 py-1.5 text-xs shadow-sm border">
                        <div className="mb-1 text-muted-foreground">Oceń odpowiedź:</div>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Tooltip key={star}>
                              <TooltipTrigger
                                render={
                                  <button
                                    onClick={() => handleSaveRating(idx, star)}
                                    className={`rounded p-1 transition-colors ${
                                      (msg.rating || 0) >= star
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
                    </div>
                  )}
                </div>
              ))}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>
        </div>

        {/* Input */}
        <div className="border-t bg-background p-4">
          <div className="mx-auto flex max-w-3xl gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Wpisz wiadomość... (Enter wyśle, Shift+Enter nowa linia)"
              disabled={streaming || !activeSession}
              rows={2}
              className="min-h-[64px] flex-1 resize-none"
            />
            <Button
              onClick={handleSend}
              disabled={streaming || !input.trim() || !activeSession}
              className="h-auto"
            >
              <Send className="mr-2 h-4 w-4" />
              Wyślij
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success("Skopiowano do schowka");
      }}
      className="absolute -bottom-2 -right-2 rounded-full border bg-background p-1 text-muted-foreground shadow-sm hover:text-foreground"
      title="Kopiuj"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}
