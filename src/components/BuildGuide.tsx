import { BookOpen } from 'lucide-react';
import { tr, useLang, type Text } from '../lib/i18n';

/** Short step-by-step guide to choosing parts, shown above the builder. Steps follow the slot order. */
const STEPS: { title: Text; body: Text }[] = [
  {
    title: { el: 'Προϋπολογισμός και χρήση', en: 'Budget and use' },
    body: {
      el: 'Αποφασίστε πόσα θέλετε να δώσετε και για τι θα χρησιμοποιηθεί ο υπολογιστής. Για gaming η κάρτα γραφικών παίρνει συνήθως το 35–45% του ποσού· για γραφείο και σπουδές αρκούν επεξεργαστής με ενσωματωμένα γραφικά και καλή μνήμη.',
      en: 'Decide how much to spend and what the PC is for. For gaming the graphics card usually takes 35–45% of the budget; for office and study, a CPU with integrated graphics and enough memory is plenty.',
    },
  },
  {
    title: { el: 'Επεξεργαστής και μητρική (μαζί)', en: 'Processor and motherboard (together)' },
    body: {
      el: 'Είναι ζευγάρι: το socket πρέπει να ταιριάζει (π.χ. AM5 με AM5, LGA1851 με LGA1851· AMD δεν μπαίνει σε Intel μητρική). Ξεκινήστε από τον επεξεργαστή και ο builder θα δείξει μόνο συμβατές μητρικές. Νέες πλατφόρμες (AM5, LGA1851) δίνουν δυνατότητα αναβάθμισης. Αν δεν θα πάρετε κάρτα γραφικών, ο επεξεργαστής χρειάζεται ενσωματωμένα γραφικά (iGPU). Προσέξτε αν έχει ψύκτρα στο κουτί.',
      en: 'They are a pair: the socket must match (e.g. AM5 with AM5, LGA1851 with LGA1851; an AMD CPU never fits an Intel board). Start with the processor and the builder will only show matching boards. Current platforms (AM5, LGA1851) leave room to upgrade. Without a graphics card, the CPU needs integrated graphics (iGPU). Check whether a cooler is included.',
    },
  },
  {
    title: { el: 'Μνήμη RAM', en: 'Memory (RAM)' },
    body: {
      el: 'Ο τύπος πρέπει να είναι αυτός της μητρικής (DDR4 ή DDR5) — δεν ταιριάζουν μεταξύ τους. Πάρτε kit 2 τεμαχίων (dual channel): 16GB για βασική χρήση, 32GB (2×16GB) για gaming. Για AM5, DDR5 6000MHz CL30 είναι η ιδανική επιλογή.',
      en: 'The type must match the board (DDR4 or DDR5) — they are not interchangeable. Get a 2-stick kit (dual channel): 16GB for basic use, 32GB (2×16GB) for gaming. On AM5, DDR5 6000MHz CL30 is the sweet spot.',
    },
  },
  {
    title: { el: 'Κάρτα γραφικών', en: 'Graphics card' },
    body: {
      el: 'Το πιο σημαντικό κομμάτι για gaming. Για 1080p αρκούν 8GB VRAM, για 1440p προτιμήστε 12–16GB. Κάθε κάρτα έχει διαφορετικό μήκος: ο builder κρατά μόνο κουτιά που τη χωράνε και ορίζει το ελάχιστο τροφοδοτικό που προτείνει ο κατασκευαστής.',
      en: 'The most important part for gaming. 8GB of VRAM is enough for 1080p; for 1440p prefer 12–16GB. Every card has its own length: the builder only keeps cases that fit it and sets the minimum power supply its maker recommends.',
    },
  },
  {
    title: { el: 'Ψύκτρα επεξεργαστή', en: 'CPU cooler' },
    body: {
      el: 'Η ψύκτρα του κουτιού αρκεί για επεξεργαστές 65W σε κανονική χρήση. Για ισχυρότερους ή για gaming, μια ψύκτρα αέρα (tower) είναι η καλύτερη σχέση τιμής/απόδοσης· υδρόψυξη AIO για τους πιο ισχυρούς. Πρέπει να υποστηρίζει το socket, και μια ψύκτρα αέρα πρέπει να χωράει σε ύψος στο κουτί.',
      en: 'A boxed cooler is fine for 65W CPUs in normal use. For stronger CPUs or gaming, a tower air cooler is the best value; AIO liquid coolers for the most powerful ones. It must support the socket, and an air cooler must fit the case in height.',
    },
  },
  {
    title: { el: 'Κουτί', en: 'Case' },
    body: {
      el: 'Πρέπει να χωράει τη μητρική (ATX, Micro ATX, Mini ITX), την κάρτα γραφικών σε μήκος και την ψύκτρα σε ύψος. Μεγάλη κάρτα σημαίνει Midi ή Full Tower. Προτιμήστε μπροστινό πάνελ με πλέγμα (mesh) για καλή ροή αέρα.',
      en: 'It must take the board size (ATX, Micro ATX, Mini ITX), the graphics card’s length and the cooler’s height. A big card means a Midi or Full Tower. Prefer a mesh front panel for good airflow.',
    },
  },
  {
    title: { el: 'Ανεμιστήρες', en: 'Fans' },
    body: {
      el: 'Πολλά κουτιά έχουν ήδη 1–3 ανεμιστήρες. Καλή βάση: 2–3 μπροστά που φέρνουν αέρα μέσα και 1 πίσω που τον βγάζει. Ο builder δείχνει πόσες θέσεις έχει το κουτί.',
      en: 'Many cases already come with 1–3 fans. A good setup: 2–3 in the front pulling air in and 1 at the back pushing it out. The builder shows how many positions the case has.',
    },
  },
  {
    title: { el: 'Τροφοδοτικό', en: 'Power supply' },
    body: {
      el: 'Το διαλέγουμε τελευταίο, όταν ξέρουμε τι θα τροφοδοτήσει. Ο builder δείχνει την ελάχιστη ισχύ· πάρτε λίγο περισσότερη για περιθώριο. Προτιμήστε 80 PLUS Gold από γνωστό κατασκευαστή — ένα φθηνό τροφοδοτικό μπορεί να καταστρέψει τα υπόλοιπα.',
      en: 'Pick it last, once you know what it has to power. The builder shows the minimum wattage; add some headroom. Prefer 80 PLUS Gold from a known brand — a cheap PSU can damage everything else.',
    },
  },
  {
    title: { el: 'Αποθήκευση (δεν υπάρχει ακόμα εδώ)', en: 'Storage (not on the site yet)' },
    body: {
      el: 'Μην ξεχάσετε έναν δίσκο: ένας NVMe SSD 1TB είναι η καλή βάση για κάθε σύνθεση.',
      en: "Don't forget a drive: a 1TB NVMe SSD is a good base for any build.",
    },
  },
];

export default function BuildGuide() {
  const lang = useLang();
  return (
    <details className="card group p-4" open>
      <summary className="tap flex cursor-pointer list-none items-center gap-2 text-sm font-semibold">
        <BookOpen className="h-4 w-4 text-accent" />
        {tr(lang, {
          el: 'Οδηγός: πώς διαλέγουμε εξαρτήματα, βήμα-βήμα',
          en: 'Guide: how to choose parts, step by step',
        })}
        <span className="ml-auto text-xs font-normal text-muted group-open:hidden">
          {tr(lang, { el: 'Άνοιγμα', en: 'Show' })}
        </span>
        <span className="ml-auto hidden text-xs font-normal text-muted group-open:inline">
          {tr(lang, { el: 'Κλείσιμο', en: 'Hide' })}
        </span>
      </summary>
      <ol className="mt-3 grid gap-3 sm:grid-cols-2">
        {STEPS.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent/10 text-xs font-semibold text-accent">
              {i + 1}
            </span>
            <div>
              <div className="text-sm font-semibold">{tr(lang, s.title)}</div>
              <p className="mt-0.5 text-sm text-muted">{tr(lang, s.body)}</p>
            </div>
          </li>
        ))}
      </ol>
    </details>
  );
}
