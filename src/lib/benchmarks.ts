export type Benchmark = {
  id: string;
  name: string;
  category: string;
  prompt: string;
  expectedKeywords?: string[];
};

export const benchmarks: Benchmark[] = [
  {
    id: "summarize",
    name: "Podsumowanie tekstu",
    category: "Rozumienie",
    prompt:
      "W 2-3 zdaniach podsumuj następujący tekst: 'Sztuczna inteligencja to dziedzina informatyki zajmująca się tworzeniem systemów zdolnych do wykonywania zadań wymagających ludzkiej inteligencji, takich jak rozumienie języka naturalnego, rozpoznawanie obrazów czy podejmowanie decyzji.'",
  },
  {
    id: "reasoning",
    name: "Wnioskowanie logiczne",
    category: "Logika",
    prompt:
      "Jacek jest starszy od Anny. Anna jest starsza od Tomka. Czy Jacek jest starszy od Tomka? Odpowiedz krótko i wyjaśnij dlaczego.",
    expectedKeywords: ["tak", "starszy"],
  },
  {
    id: "code",
    name: "Generowanie kodu",
    category: "Kod",
    prompt:
      "Napisz funkcję w JavaScript, która zwraca największą liczbę z tablicy. Nie używaj Math.max.",
    expectedKeywords: ["function", "return", "for", "if"],
  },
  {
    id: "creative",
    name: "Kreatywność",
    category: "Kreatywność",
    prompt:
      "Wymyśl krótkie, oryginalne hasło reklamowe dla nowej marki ekologicznej kawy.",
  },
  {
    id: "translation",
    name: "Tłumaczenie",
    category: "Język",
    prompt:
      "Przetłumacz na język angielski: 'Dobrze widzi się tylko sercem. Najważniejsze jest niewidoczne dla oczu.'",
    expectedKeywords: ["heart", "eyes", "essential", "invisible"],
  },
  {
    id: "math",
    name: "Matematyka",
    category: "Logika",
    prompt: "Ile to 15 * 24? Pokaż krok po kroku obliczenia.",
    expectedKeywords: ["360"],
  },
  {
    id: "grammar",
    name: "Gramatyka i stylistyka",
    category: "Język",
    prompt:
      "Znajdź i popraw błędy w zdaniu: 'Meżczyzna poszedł do sklepu, żeby kupić jabłka i gruszek.'",
    expectedKeywords: ["mężczyzna", "gruszki"],
  },
  {
    id: "facts",
    name: "Wiedza ogólna",
    category: "Rozumienie",
    prompt: "Wymień trzy główne składniki fotosyntezy i krótko opisz ich rolę.",
    expectedKeywords: ["woda", "dwutlenek węgla", "światło"],
  },
  {
    id: "sql",
    name: "SQL",
    category: "Kod",
    prompt:
      "Napisz zapytanie SQL, które zwraca listę użytkowników posortowaną malejąco po dacie rejestracji.",
    expectedKeywords: ["SELECT", "FROM", "ORDER BY", "DESC"],
  },
  {
    id: "ethics",
    name: "Etyka AI",
    category: "Rozumienie",
    prompt:
      "Krótko wyjaśnij, dlaczego ważne jest, aby modele AI szanowały prywatność użytkowników.",
    expectedKeywords: ["dane", "prywatność", "zaufanie"],
  },
  {
    id: "poetry",
    name: "Poezja",
    category: "Kreatywność",
    prompt: "Napisz krótki, czterowierszowy wiersz o deszczu w mieście.",
  },
  {
    id: "json",
    name: "Formatowanie JSON",
    category: "Kod",
    prompt:
      "Popraw i sformatuj poniższy JSON: {name: 'Anna', age: 30, hobbies: ['reading', 'cycling']}",
    expectedKeywords: ['"name"', '"age"', '"hobbies"'],
  },
  {
    id: "units",
    name: "Konwersja jednostek",
    category: "Logika",
    prompt: "Ile stopni Fahrenheita to 25 stopni Celsjusza? Pokaż wzór.",
    expectedKeywords: ["77"],
  },
  {
    id: "analogy",
    name: "Analogie",
    category: "Logika",
    prompt: "Uzupełnij analogię: Pióro jest do pisania, jak nożyczki są do ...",
    expectedKeywords: ["cięcia", "krojenia"],
  },
];
