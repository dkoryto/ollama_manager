# Ollama Manager

Aplikacja webowa do zarządzania, testowania i oceniania lokalnych modeli LLM działających pod [Ollama](https://ollama.com). Zbudowana w oparciu o **Next.js 16**, **TypeScript**, **Tailwind CSS** i **shadcn/ui**. Działa w kontenerze Docker i komunikuje się z lokalną instancją Ollamy przez proxy API.

---

## Spis treści

1. [Architektura](#architektura)
2. [Funkcjonalności](#funkcjonalności)
3. [Wymagania](#wymagania)
4. [Instalacja i uruchomienie](#instalacja-i-uruchomienie)
5. [Konfiguracja](#konfiguracja)
6. [Struktura projektu](#struktura-projektu)
7. [API Routes](#api-routes)
8. [Testowanie modeli](#testowanie-modeli)
9. [Ocenianie odpowiedzi](#ocenianie-odpowiedzi)
10. [Rozwiązywanie problemów](#rozwiązywanie-problemów)

---

## Architektura

### Stack technologiczny
- **Framework:** Next.js 16 (App Router)
- **Język:** TypeScript (strict mode)
- **Stylizacja:** Tailwind CSS v4
- **Komponenty UI:** shadcn/ui (bazujące na Base UI / Radix)
- **Ikony:** lucide-react
- **Runtime:** Node.js 20 (Alpine w Dockerze)
- **Output:** `standalone` (optymalizowany pod Docker)

### Diagram komunikacji
```
┌─────────────────┐      ┌──────────────────────┐      ┌─────────────┐
│   Przeglądarka  │──────│  Next.js (port 3000) │──────│  Ollama API │
│                 │      │  /api/* (proxy)      │      │  (port 11434│
└─────────────────┘      └──────────────────────┘      └─────────────┘
         │                          │
         └──── localStorage ◄───────┘
               (ustawienia, oceny, wyniki testów)
```

Aplikacja nie łączy się bezpośrednio z Ollamą z przeglądarki. Wszystkie wywołania do API Ollamy przechodzą przez serwerowe **API Routes** Next.js, co eliminuje problemy z CORS i pozwala na centralne zarządzanie adresem endpointu.

---

## Funkcjonalności

### 1. Dashboard modeli (`/`)
- **Lista lokalnych modeli** pobierana z `/api/tags`.
- **Filtracja po rodzinie modeli** (np. `llama`, `qwen`, `gemma`).
- **Szczegóły modelu** – wywołanie `/api/show` zwraca:
  - licencję
  - pełny `modelfile`
  - parametry modelu
  - system prompt
  - szablon (template)
- **Status załadowania** – dzięki `/api/ps` widoczna jest zielona ikona i badge „Załadowany” przy modelach aktualnie trzymanych w pamięci GPU/CPU.
- **Pobieranie modelu** (`/api/pull`) z podglądem logów w czasie rzeczywistym (stream NDJSON).
- **Usuwanie modelu** (`/api/delete`) z potwierdzeniem.
- **Wybór modelu do chatu** – szybkie przekierowanie do zakładki Chat z preselekcją modelu.

### 2. Chat (`/chat`)
- **Streaming odpowiedzi** przez `/api/chat` zgodnie z formatem Ollama.
- **Wybór modelu** z dropdownu lub automatycznie z query parameter `?model=`.
- **Lokalne ustawienia generowania** – możliwość nadpisania globalnych parametrów (temperature, top_p, top_k, context size, seed, system prompt) dla konkretnej rozmowy.
- **Historia wiadomości** w interfejsie typu „bąbelkowego”.
- **Skróty klawiszowe:** `Enter` wysyła wiadomość, `Shift + Enter` dodaje nową linię.

### 3. Testy benchmarkowe (`/tests`)
- **6 wbudowanych benchmarków** podzielonych na kategorie:
  - *Rozumienie* – podsumowanie tekstu
  - *Logika* – wnioskowanie logiczne, matematyka
  - *Kod* – generowanie fragmentów kodu
  - *Kreatywność* – tworzenie haseł reklamowych
  - *Język* – tłumaczenia
- **Streaming odpowiedzi** z pomiarem czasu generowania (`durationMs`).
- **Ręczna ocena wyniku** w skali 1–5 gwiazdek z opcjonalną notatką.
- **Historia zapisanych wyników** filtrowana per model.
- **Eksport do JSON** – pobranie pełnego raportu z testów.

### 4. Globalne ustawienia (`SettingsPanel`)
Panel dostępny z głównego paska nawigacji. Pozwala ustawić domyślne parametry dla wszystkich zapytań do Ollamy:
| Parametr | Zakres | Opis |
|----------|--------|------|
| `temperature` | 0.0 – 2.0 | Kreatywność vs przewidywalność odpowiedzi |
| `top_p` | 0.0 – 1.0 | Nucleus sampling |
| `top_k` | 1 – 100 | Ograniczenie próbkowania do K najbardziej prawdopodobnych tokenów |
| `num_ctx` | ≥ 1 | Rozmiar okna kontekstowego |
| `seed` | liczba całkowita | Powtarzalność wyników (0 = brak seedu) |
| `system` | tekst | Domyślny system prompt dołączany do chatu |

Ustawienia zapisywane są automatycznie w `localStorage` przeglądarki.

---

## Wymagania

- **Docker** z obsługą `docker compose` (v2+)
- **Ollama** zainstalowana i uruchomiona na hoście (lub w dostępnej sieci)
- Domyślny adres Ollamy: `http://host.docker.internal:11434`

### Sprawdzenie dostępności Ollamy
```bash
curl http://localhost:11434/api/tags
```
Jeśli powyższe zwraca JSON z listą modeli, Ollama działa poprawnie.

---

## Instalacja i uruchomienie

### Szybki start (Docker)
```bash
# Budowa i uruchomienie
docker compose up -d --build

# Aplikacja dostępna pod:
open http://localhost:3000
```

### Zatrzymanie
```bash
docker compose down
```

### Logi na żywo
```bash
docker compose logs -f
```

### Deweloperskie uruchomienie (poza Dockerem)
```bash
npm install
npm run dev
```

---

## Konfiguracja

Zmienne środowiskowe definiowane w `docker-compose.yml`:

```yaml
environment:
  - OLLAMA_HOST=http://host.docker.internal:11434
```

### macOS / Windows
`host.docker.internal` działa natywnie. Jeśli Ollama nasłuchuje na innym porcie lub innym hoście, wystarczy zmienić wartość `OLLAMA_HOST` i przebudować kontener.

### Linux
Na niektórych dystrybucjach `host.docker.internal` nie jest domyślnie dostępne. Można:
1. Użyć adresu IP hosta, np. `OLLAMA_HOST=http://172.17.0.1:11434`
2. Lub dodać do `/etc/docker/daemon.json`:
```json
{
  "features": {
    "host-docker-internal": true
  }
}
```
i zrestartować Dockera.

---

## Struktura projektu

```
/
├── Dockerfile                  # Multi-stage build (deps → builder → runner)
├── docker-compose.yml          # Konfiguracja usługi app + OLLAMA_HOST
├── next.config.ts              # output: 'standalone'
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout z TooltipProvider i SettingsProvider
│   │   ├── page.tsx            # Dashboard modeli
│   │   ├── chat/
│   │   │   └── page.tsx        # Rozszerzony chat ze streamingiem i ocenami
│   │   ├── tests/
│   │   │   └── page.tsx        # Testy benchmarkowe
│   │   └── api/
│   │       ├── tags/route.ts   # GET /api/tags → proxy do Ollama
│   │       ├── ps/route.ts     # GET /api/ps  → lista załadowanych modeli
│   │       ├── chat/route.ts   # POST /api/chat
│   │       ├── generate/route.ts # POST /api/generate
│   │       ├── pull/route.ts   # POST /api/pull (stream)
│   │       ├── delete/route.ts # DELETE /api/delete
│   │       └── models/[name]/route.ts # POST /api/models/:name (show)
│   ├── components/
│   │   ├── ui/                 # Komponenty shadcn/ui
│   │   └── settings-panel.tsx  # Panel globalnych ustawień (Sheet)
│   └── lib/
│       ├── utils.ts            # Pomocnicze funkcje (cn)
│       ├── ollama.ts           # Klient HTTP do Ollamy (OLLAMA_HOST)
│       ├── settings-context.tsx # React Context + localStorage dla ustawień
│       └── benchmarks.ts       # Definicje presetowych benchmarków
```

---

## API Routes

Wszystkie endpointy proxyjują żądania do Ollamy z automatycznym dodaniem nagłówka `Content-Type: application/json`.

| Route | Metoda | Cel |
|-------|--------|-----|
| `/api/tags` | `GET` | Lista zainstalowanych modeli |
| `/api/ps` | `GET` | Lista aktualnie załadowanych modeli |
| `/api/chat` | `POST` | Chat completion (stream NDJSON) |
| `/api/generate` | `POST` | Text completion (stream NDJSON) |
| `/api/pull` | `POST` | Pobieranie modelu (stream NDJSON) |
| `/api/delete` | `DELETE` | Usuwanie modelu |
| `/api/models/[name]` | `POST` | Szczegóły modelu (`/api/show`) |

---

## Testowanie modeli

Strona `/tests` oferuje zestaw gotowych zadań. Po wybraniu modelu i kliknięciu **Uruchom test**, aplikacja wysyła prompt do `/api/generate` z bieżącymi ustawieniami globalnymi. Odpowiedź strumieniowana jest na żywo, a czas generowania mierzony jest lokalnie w przeglądarce.

Po zakończeniu generowania można:
- przyznać ocenę 1–5 gwiazdek,
- dodać krótką notatkę,
- zapisać wynik do lokalnej historii,
- wyeksportować wszystkie wyniki do pliku JSON.

### Przykładowy eksport JSON
```json
[
  {
    "id": "uuid",
    "model": "llama3.2",
    "benchmarkId": "reasoning",
    "benchmarkName": "Wnioskowanie logiczne",
    "prompt": "...",
    "response": "...",
    "rating": 5,
    "note": "Bardzo precyzyjna odpowiedź",
    "durationMs": 1240,
    "timestamp": "2026-04-13T22:00:00.000Z"
  }
]
```

---

## Ocenianie odpowiedzi

### W czacie (`/chat`)
Pod każdą zakończoną odpowiedzią asystenta wyświetlane są 5 gwiazdek. Kliknięcie gwiazdki zapisuje ocenę w `localStorage` wraz z nazwą modelu i indeksem wiadomości. Średnia ocena dla aktualnie wybranego modelu widoczna jest obok jego nazwy w dropdownie.

### W testach (`/tests`)
Ocena przypisywana jest do konkretnego benchmarku i zapisywana w historii wyników. Dzięki temu można porównywać jakość różnych modeli na tym samym zestawie zadań.

---

## Rozwiązywanie problemów

### Dashboard pokazuje „Brakuje modeli?”
- Sprawdź, czy Ollama działa: `curl http://localhost:11434/api/tags`
- Sprawdź logi kontenera: `docker compose logs -f`
- Upewnij się, że `OLLAMA_HOST` w `docker-compose.yml` wskazuje poprawny adres.

### Linux: `host.docker.internal` nie działa
Zastąp w `docker-compose.yml`:
```yaml
environment:
  - OLLAMA_HOST=http://172.17.0.1:11434
```
lub znajdź właściwy adres IP interfejsu `docker0` na hoście:
```bash
ip addr show docker0
```

### Streaming nie działa / odpowiedź pojawia się dopiero na końcu
Upewnij się, że Ollama obsługuje streaming dla danego endpointu. Aplikacja domyślnie wysyła `"stream": true` w body zarówno dla `/api/chat`, jak i `/api/generate`.

### Build TypeScript zwraca błędy
Projekt korzysta z `strict` TypeScript. Wszelkie modyfikacje kodu powinny zachować typowanie. Przed commitowaniem zaleca się:
```bash
npm run build
```

---

## Licencja

Projekt przygotowany jako wewnętrzne narzędzie do zarządzania lokalnymi modelami LLM. Kod źródłowy dostępny do dowolnej modyfikacji w ramach projektu.
