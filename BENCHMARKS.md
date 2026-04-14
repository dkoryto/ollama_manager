# Testy benchmarkowe w Ollama Manager

Szczegółowy opis systemu benchmarkowego dostępnego pod adresem `/tests`.

---

## Cel

Testy benchmarkowe pozwalają na **obiektywne porównanie jakości modeli LLM** uruchamianych lokalnie przez Ollamę. Zamiast polegać wyłącznie na subiektywnej ocenie w czacie, możesz:

1. Uruchomić ten sam zestaw promptów na różnych modelach.
2. Zmierzyć czas generowania odpowiedzi (`durationMs`).
3. Oceńić wyniki w skali 1–5 gwiazdek.
4. Dodać notatki wyjaśniające dlaczego dana odpowiedź była dobra lub słaba.
5. Wyeksportować raport do JSON i porównać modele poza aplikacją.

---

## Jak to działa?

### Architektura testu

```
Użytkownik wybiera model → klika "Uruchom test" na karcie benchmarku
         ↓
Frontend wysyła POST /api/generate z promptem + bieżącymi ustawieniami globalnymi
         ↓
Ollama zwraca strumieniową odpowiedź (NDJSON)
         ↓
Frontend mierzy czas od pierwszego do ostatniego chunka
         ↓
Użytkownik ocenia wynik gwiazdkami, dodaje notatkę i zapisuje wynik
         ↓
Wynik trafia do localStorage z kluczem "ollama-test-results"
```

### Format zapisywanego wyniku

```typescript
interface TestResult {
  id: string;              // UUID
  model: string;           // np. "llama3.2"
  benchmarkId: string;     // np. "reasoning"
  benchmarkName: string;   // "Wnioskowanie logiczne"
  prompt: string;          // Pełny prompt wysłany do modelu
  response: string;        // Pełna odpowiedź modelu
  rating: number;          // 1–5
  note: string;            // Opcjonalna notatka użytkownika
  durationMs: number;      // Czas generowania w ms
  timestamp: string;       // ISO 8601
}
```

---

## Dostępne benchmarki

### 1. Podsumowanie tekstu (`summarize`)
- **Kategoria:** Rozumienie
- **Cel:** Sprawdzenie zdolności modelu do ekstrakcji kluczowych informacji i syntezy.
- **Prompt:** Krótki akapit o sztucznej inteligencji.
- **Co oceniamy:** Czy podsumowanie jest zwięzłe? Czy nie pomija najważniejszych faktów?

### 2. Wnioskowanie logiczne (`reasoning`)
- **Kategoria:** Logika
- **Cel:** Ocena łańcuchowego rozumowania (chain-of-thought).
- **Prompt:** Relacje wiekowe między trzema osobami.
- **Expected keywords:** `tak`, `starszy`
- **Co oceniamy:** Czy model poprawnie wyciągnął wniosek z przesłanek? Czy wyjaśnił dlaczego?

### 3. Generowanie kodu (`code`)
- **Kategoria:** Kod
- **Cel:** Sprawdzenie umiejętności programistycznych modelu.
- **Prompt:** Napisz funkcję JS zwracającą największą liczbę z tablicy bez użycia `Math.max`.
- **Expected keywords:** `function`, `return`, `for`, `if`
- **Co oceniamy:** Czy kod jest poprawny składniowo? Czy działa dla krawędziowych przypadków (pusta tablica, ujemne liczby)?

### 4. Kreatywność (`creative`)
- **Kategoria:** Kreatywność
- **Cel:** Sprawdzenie oryginalności i stylu językowego.
- **Prompt:** Wymyśl hasło reklamowe dla ekologicznej kawy.
- **Co oceniamy:** Czy hasło jest chwytliwe? Czy pasuje do briefu?

### 5. Tłumaczenie (`translation`)
- **Kategoria:** Język
- **Cel:** Ocena znajomości języka polskiego i angielskiego oraz umiejętności translatorskich.
- **Prompt:** Fragment z „Małego Księcia”.
- **Expected keywords:** `heart`, `eyes`, `essential`, `invisible`
- **Co oceniamy:** Czy tłumaczenie zachowuje poetyckość oryginału? Czy jest gramatycznie poprawne?

### 6. Matematyka (`math`)
- **Kategoria:** Logika
- **Cel:** Weryfikacja umiejętności liczenia krok po kroku.
- **Prompt:** `15 * 24` z prośbą o pokazanie obliczeń.
- **Expected keywords:** `360`
- **Co oceniamy:** Czy wynik końcowy jest poprawny? Czy model pokazał tok rozumowania?

---

## Metryki i sposób oceny

### Automatyczne metryki
| Metryka | Opis |
|---------|------|
| `durationMs` | Czas od wysłania żądania do zakończenia streamu. Mierzony w przeglądarce (`performance.now()`). Nie obejmuje RTT sieciowego do samej Ollamy, ale pozwala porównać szybkość modeli względem siebie. |
| `timestamp` | Dokładny moment wykonania testu (przydatny przy porównywaniu wersji modeli w czasie). |

### Ręczna ocena (1–5 gwiazdek)

Zalecana skala ocen:

| Ocena | Znaczenie |
|-------|-----------|
| ⭐ 1/5 | Odpowiedź całkowicie błędna, nie na temat lub zawiera szkodliwe błędy. |
| ⭐⭐ 2/5 | Poważne błędy merytoryczne, ale fragmenty odpowiedzi są sensowne. |
| ⭐⭐⭐ 3/5 | Odpowiedź poprawna ogólnie, ale niedokładna, powierzchowna lub ze słabym wyjaśnieniem. |
| ⭐⭐⭐⭐ 4/5 | Dobrej jakości odpowiedź, drobne niedociągnięcia stylistyczne lub brak jednego szczegółu. |
| ⭐⭐⭐⭐⭐ 5/5 | Doskonała odpowiedź: precyzyjna, kompletna, dobrze uzasadniona. |

### Notatki
Pole „Notatka” pozwala zapisać kontekst oceny, np.:
- „Model źle zrozumiał polecenie i zwrócił kod w Pythonie zamiast JS.”
- „Bardzo eleganckie tłumaczenie, zachowało melancholię oryginału.”
- „Poprawny wynik, ale brakowało kroków pośrednich.”

---

## Porównywanie modeli

### W aplikacji
Historia wyników na stronie `/tests` jest **filtrowana automatycznie do aktualnie wybranego modelu**. Aby porównać dwa modele:

1. Wybierz model A, uruchom interesujące Cię benchmarki i zapisz wyniki.
2. Wybierz model B, powtórz te same benchmarki i zapisz wyniki.
3. Przełączaj się między modelami w dropdownie – historia aktualizuje się dynamicznie.

### Eksport JSON
Kliknięcie **Eksport** pobiera plik `ollama-test-results-YYYY-MM-DD.json` zawierający **wszystkie** zapisane wyniki (nie tylko dla wybranego modelu). Możesz go zaimportować do Excela, Pythona (pandas) lub Jupyter Notebooka i stworzyć własne wykresy porównawcze.

### Przykładowa analiza w Pythonie
```python
import json, pandas as pd

with open('ollama-test-results-2026-04-13.json') as f:
    data = json.load(f)

df = pd.DataFrame(data)
summary = df.groupby('model').agg(
    avg_rating=('rating', 'mean'),
    avg_duration=('durationMs', 'mean'),
    tests_count=('id', 'count')
).round(2)

print(summary)
```

---

## Dodawanie własnych benchmarków

Benchmarki zdefiniowane są w pliku `src/lib/benchmarks.ts`. Aby dodać własny test, wystarczy rozszerzyć tablicę `benchmarks` o obiekt:

```typescript
{
  id: "moj-test",
  name: "Mój własny benchmark",
  category: "Moja kategoria",
  prompt: "Tutaj wpisz prompt...",
  expectedKeywords?: ["słowo-klucz-1", "słowo-klucz-2"]
}
```

> **Uwaga:** `expectedKeywords` nie są automatycznie sprawdzane przez aplikację. Służą one jako podpowiedź dla osoby oceniającej wynik ręcznie.

Po modyfikacji pliku wymagany jest rebuild aplikacji (lub odświeżenie strony w trybie deweloperskim).

---

## Ograniczenia i zalecenia

1. **Powtarzalność** – wyniki mogą różnić się między uruchomieniami nawet dla tego samego modelu (szczególnie przy `temperature > 0`). Dla testów porównawczych zaleca się ustawienie `temperature = 0` i ustalonego `seed` w globalnych ustawieniach.
2. **Context size** – niektóre benchmarki (np. podsumowanie długiego tekstu) mogą wymagać zwiększenia `num_ctx` w ustawieniach.
3. **Szybkość a jakość** – mniejsze modele (np. 1B–3B) generują odpowiedzi szybciej, ale często kosztem dokładności. Benchmarki pomagają znaleźć złoty środek dla Twojego use case'u.
4. **Lokalność danych** – wszystkie wyniki testów przechowywane są wyłącznie w przeglądarce użytkownika (`localStorage`). Wyczyszczenie danych przeglądarki spowoduje utratę historii.

---

## Plany rozwoju (roadmap)

Potencjalne usprawnienia systemu benchmarkowego:

- [ ] **Automatyczne scoringi** – sprawdzanie obecności `expectedKeywords` i wyliczanie wstępnego wyniku.
- [ ] **Side-by-side comparison** – widok podzielony pozwalający wyświetlić odpowiedzi dwóch modeli obok siebie.
- [ ] **Wykresy w aplikacji** – wykres słupkowy średnich ocen i czasów per model.
- [ ] **Własne benchmarki z UI** – formularz do dodawania promptów bez edycji kodu źródłowego.
- [ ] **Import JSON** – możliwość wczytania wcześniej wyeksportowanego raportu na innym urządzeniu/przeglądarce.
