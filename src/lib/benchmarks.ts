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
];
