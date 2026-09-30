// Text of the About, Contact and Privacy pages, in Greek and English (rendered by InfoPage.tsx).
// Paragraphs may contain [links](https://…) and **bold**; everything else is plain text.

import type { Text } from '../lib/i18n';
import { CONTACT_EMAIL, OWNER_LOCATION, OWNER_NAME, PRIVACY_UPDATED, REPO_URL } from '../lib/site';

export interface InfoSection {
  heading: Text;
  paragraphs?: Text[];
  bullets?: Text[];
}

export interface InfoPageContent {
  sections: InfoSection[];
  /** Small print under the last section, e.g. "Last updated". */
  footnote?: Text;
}

const mail = `[${CONTACT_EMAIL}](mailto:${CONTACT_EMAIL})`;
const updated = PRIVACY_UPDATED.split('-').reverse().join('/');

export const ABOUT: InfoPageContent = {
  sections: [
    {
      heading: { el: 'Τι είναι το BuildDraft.gr', en: 'What BuildDraft.gr is' },
      paragraphs: [
        {
          el: 'Το BuildDraft.gr συγκεντρώνει τις τιμές εξαρτημάτων υπολογιστή από ελληνικά καταστήματα και sites σύγκρισης τιμών. Για κάθε προϊόν δείχνει τη χαμηλότερη τιμή, την τιμή με τα μεταφορικά όπου είναι γνωστή, τις προσφορές και την εξέλιξη της τιμής στον χρόνο.',
          en: 'BuildDraft.gr collects the prices of computer parts from Greek shops and price-comparison sites. For each product it shows the lowest price, the price including shipping where it is known, current sales and how the price has changed over time.',
        },
        {
          el: 'Περιλαμβάνει και εργαλείο συναρμολόγησης υπολογιστή, που ελέγχει τη συμβατότητα των εξαρτημάτων με βάση τα χαρακτηριστικά που δηλώνουν τα καταστήματα.',
          en: 'It also includes a PC builder that checks whether parts fit together, based on the specifications the shops list.',
        },
      ],
    },
    {
      heading: { el: 'Από πού έρχονται οι τιμές', en: 'Where the prices come from' },
      paragraphs: [
        {
          el: 'Οι τιμές συλλέγονται από τις δημόσιες σελίδες των παρακάτω sites:',
          en: 'Prices are collected from the public pages of these sites:',
        },
      ],
      bullets: [
        {
          el: '[Skroutz](https://www.skroutz.gr) — σύγκριση τιμών',
          en: '[Skroutz](https://www.skroutz.gr) — price comparison',
        },
        {
          el: '[BestPrice](https://www.bestprice.gr) — σύγκριση τιμών',
          en: '[BestPrice](https://www.bestprice.gr) — price comparison',
        },
        { el: '[Snif](https://www.snif.gr) — σύγκριση τιμών', en: '[Snif](https://www.snif.gr) — price comparison' },
        { el: '[Shopflix](https://shopflix.gr) — marketplace', en: '[Shopflix](https://shopflix.gr) — marketplace' },
        { el: '[e-shop.gr](https://www.e-shop.gr) — κατάστημα', en: '[e-shop.gr](https://www.e-shop.gr) — shop' },
      ],
    },
    {
      heading: { el: 'Κάθε πόσο ενημερώνονται', en: 'How often they update' },
      paragraphs: [
        {
          el: 'Οι τιμές ενημερώνονται αυτόματα **κάθε 6 ώρες**. Το ιστορικό τιμών συμπληρώνεται καθημερινά, και τα χαρακτηριστικά που χρειάζεται η συναρμολόγηση (π.χ. μήκος κάρτας γραφικών) προστίθενται σταδιακά.',
          en: 'Prices update automatically **every 6 hours**. Price history is extended daily, and the specifications the PC builder needs (such as graphics card length) are added gradually.',
        },
        {
          el: 'Οι τιμές είναι ενδεικτικές και μπορεί να έχουν αλλάξει από την τελευταία ενημέρωση. Πριν από κάθε αγορά, ελέγξτε την τιμή και τη διαθεσιμότητα στο κατάστημα.',
          en: 'Prices are indicative and may have changed since the last update. Before buying, check the price and availability in the shop.',
        },
      ],
    },
    {
      heading: { el: 'Ανεξαρτησία', en: 'Independence' },
      paragraphs: [
        {
          el: 'Το BuildDraft.gr **δεν συνδέεται** με τα Skroutz, BestPrice, Snif, Shopflix και e-shop.gr, ούτε με κάποιον κατασκευαστή ή κατάστημα, και δεν χρηματοδοτείται από αυτούς. Οι σύνδεσμοι προς τα καταστήματα δεν είναι διαφημιστικοί (affiliate). Τα εμπορικά σήματα ανήκουν στους κατόχους τους.',
          en: 'BuildDraft.gr is **not affiliated** with Skroutz, BestPrice, Snif, Shopflix or e-shop.gr, nor with any manufacturer or shop, and is not funded by them. Links to shops are not affiliate links. Trademarks belong to their owners.',
        },
      ],
    },
    {
      heading: { el: 'Ποιος το φτιάχνει', en: 'Who makes it' },
      paragraphs: [
        {
          el: `Το BuildDraft.gr είναι μη κερδοσκοπικό έργο του ${OWNER_NAME}. Ο κώδικας είναι διαθέσιμος στο [GitHub](${REPO_URL}) με την άδεια PolyForm Noncommercial 1.0.0.`,
          en: `BuildDraft.gr is a non-profit project by ${OWNER_NAME}. The code is available on [GitHub](${REPO_URL}) under the PolyForm Noncommercial 1.0.0 license.`,
        },
      ],
    },
  ],
};

export const CONTACT: InfoPageContent = {
  sections: [
    {
      heading: { el: 'Email', en: 'Email' },
      paragraphs: [
        {
          el: `Για ερωτήσεις, διορθώσεις ή προτάσεις, στείλτε email στο ${mail}.`,
          en: `For questions, corrections or suggestions, email ${mail}.`,
        },
      ],
    },
    {
      heading: { el: 'Τι μπορείτε να μας στείλετε', en: 'What you can write about' },
      bullets: [
        {
          el: 'Λάθος τιμή ή προϊόν σε λάθος κατηγορία (στείλτε τον σύνδεσμο του προϊόντος).',
          en: 'A wrong price or a product in the wrong category (include the product link).',
        },
        { el: 'Προτάσεις για νέες λειτουργίες ή καταστήματα.', en: 'Ideas for new features or shops.' },
        {
          el: 'Αιτήματα για τα προσωπικά σας δεδομένα (δείτε την Πολιτική απορρήτου).',
          en: 'Requests about your personal data (see the Privacy policy).',
        },
        {
          el: 'Αιτήματα καταστημάτων ή κατόχων εμπορικών σημάτων.',
          en: 'Requests from shops or trademark owners.',
        },
      ],
    },
    {
      heading: { el: 'Σφάλματα στο site', en: 'Bugs on the site' },
      paragraphs: [
        {
          el: `Τεχνικά προβλήματα μπορείτε να τα αναφέρετε και στο [GitHub](${REPO_URL}/issues).`,
          en: `You can also report technical problems on [GitHub](${REPO_URL}/issues).`,
        },
      ],
    },
  ],
};

export const PRIVACY: InfoPageContent = {
  sections: [
    {
      heading: { el: 'Υπεύθυνος επεξεργασίας', en: 'Data controller' },
      paragraphs: [
        {
          el: `Υπεύθυνος για την επεξεργασία δεδομένων στο BuildDraft.gr είναι ο ${OWNER_NAME} (${OWNER_LOCATION.el}). Επικοινωνία: ${mail}.`,
          en: `The data controller for BuildDraft.gr is ${OWNER_NAME} (${OWNER_LOCATION.en}). Contact: ${mail}.`,
        },
      ],
    },
    {
      heading: { el: 'Τι δεδομένα συλλέγονται', en: 'What data is collected' },
      paragraphs: [
        {
          el: 'Το BuildDraft.gr **δεν έχει λογαριασμούς, φόρμες ή cookies** και δεν συλλέγει στοιχεία όπως όνομα, email ή τοποθεσία. Δεν χρησιμοποιούνται cookies παρακολούθησης ή διαφήμισης.',
          en: 'BuildDraft.gr **has no accounts, forms or cookies** and does not collect details such as your name, email or location. No tracking or advertising cookies are used.',
        },
        {
          el: 'Κατά την επίσκεψη, ορισμένα τεχνικά στοιχεία επεξεργάζονται από τρίτους που είναι απαραίτητοι για τη λειτουργία του site:',
          en: 'When you visit, some technical data is processed by third parties the site needs in order to work:',
        },
      ],
      bullets: [
        {
          el: '**Φιλοξενία (Vercel Inc.)**: ο διακομιστής καταγράφει τη διεύθυνση IP, τον τύπο του browser, την ώρα και τη σελίδα που ζητήθηκε, για την παράδοση της σελίδας και την ασφάλεια. Η Vercel μπορεί να επεξεργάζεται δεδομένα εκτός ΕΕ, με τις εγγυήσεις του EU-US Data Privacy Framework ή των τυποποιημένων συμβατικών ρητρών. Νομική βάση: έννομο συμφέρον (άρθρο 6 παρ. 1 στ΄ ΓΚΠΔ).',
          en: '**Hosting (Vercel Inc.)**: the server logs your IP address, browser type, time and requested page to deliver the page and keep it secure. Vercel may process data outside the EU under the EU-US Data Privacy Framework or standard contractual clauses. Legal basis: legitimate interest (Art. 6(1)(f) GDPR).',
        },
        {
          el: '**Γραμματοσειρά (Google Fonts)**: η γραμματοσειρά Inter φορτώνεται από διακομιστές της Google, που βλέπουν τη διεύθυνση IP σας. Νομική βάση: έννομο συμφέρον (εμφάνιση του site).',
          en: '**Font (Google Fonts)**: the Inter font is loaded from Google servers, which see your IP address. Legal basis: legitimate interest (displaying the site).',
        },
      ],
    },
    {
      heading: { el: 'Τι αποθηκεύεται στον browser σας', en: 'What is stored in your browser' },
      paragraphs: [
        {
          el: 'Το site αποθηκεύει τις επιλογές σας στον browser (localStorage), ώστε να τις θυμάται την επόμενη φορά. Τα στοιχεία αυτά **μένουν στη συσκευή σας** και δεν στέλνονται πουθενά:',
          en: 'The site keeps your choices in your browser (localStorage) so it remembers them next time. They **stay on your device** and are not sent anywhere:',
        },
      ],
      bullets: [
        { el: '`theme`: φωτεινό ή σκοτεινό θέμα.', en: '`theme`: light or dark theme.' },
        { el: '`lang`: ελληνικά ή αγγλικά.', en: '`lang`: Greek or English.' },
        {
          el: '`pcBuild`: τα εξαρτήματα που έχετε διαλέξει στη Συναρμολόγηση PC.',
          en: '`pcBuild`: the parts you picked in the PC Builder.',
        },
      ],
    },
    {
      heading: { el: 'Στατιστικά επισκεψιμότητας', en: 'Visitor statistics' },
      paragraphs: [
        {
          el: 'Προς το παρόν δεν χρησιμοποιούνται εργαλεία στατιστικών (analytics). Αν προστεθούν, αυτή η ενότητα θα ενημερωθεί με το εργαλείο, τα δεδομένα που συλλέγει, τη νομική βάση και τον τρόπο συγκατάθεσης, πριν ενεργοποιηθούν.',
          en: 'No analytics tools are used at the moment. If they are added, this section will be updated with the tool, the data it collects, the legal basis and how consent works, before they are switched on.',
        },
      ],
    },
    {
      heading: { el: 'Σύνδεσμοι προς καταστήματα', en: 'Links to shops' },
      paragraphs: [
        {
          el: 'Οι σύνδεσμοι οδηγούν σε sites τρίτων (Skroutz, BestPrice, Snif, Shopflix, e-shop.gr), που έχουν τις δικές τους πολιτικές απορρήτου και cookies.',
          en: 'Links lead to third-party sites (Skroutz, BestPrice, Snif, Shopflix, e-shop.gr), which have their own privacy and cookie policies.',
        },
      ],
    },
    {
      heading: { el: 'Τα δικαιώματά σας', en: 'Your rights' },
      paragraphs: [
        {
          el: 'Σύμφωνα με τον Γενικό Κανονισμό Προστασίας Δεδομένων (ΓΚΠΔ), έχετε δικαίωμα:',
          en: 'Under the General Data Protection Regulation (GDPR) you have the right to:',
        },
      ],
      bullets: [
        { el: 'πρόσβασης στα δεδομένα σας και διόρθωσής τους,', en: 'access and correct your data,' },
        { el: 'διαγραφής ή περιορισμού της επεξεργασίας,', en: 'have it erased or its processing restricted,' },
        {
          el: 'εναντίωσης στην επεξεργασία που βασίζεται σε έννομο συμφέρον,',
          en: 'object to processing based on legitimate interest,',
        },
        { el: 'φορητότητας των δεδομένων,', en: 'data portability,' },
        {
          el: 'υποβολής καταγγελίας στην [Αρχή Προστασίας Δεδομένων Προσωπικού Χαρακτήρα](https://www.dpa.gr).',
          en: 'lodge a complaint with the Greek [Data Protection Authority](https://www.dpa.gr).',
        },
      ],
    },
    {
      heading: { el: 'Άσκηση δικαιωμάτων', en: 'Using your rights' },
      paragraphs: [
        {
          el: `Επειδή το BuildDraft.gr δεν κρατά προσωπικά σας δεδομένα, τα περισσότερα αιτήματα αφορούν τα αρχεία καταγραφής της φιλοξενίας. Στείλτε το αίτημά σας στο ${mail} και θα απαντήσουμε μέσα σε έναν μήνα. Τα στοιχεία που είναι αποθηκευμένα στον browser σας τα διαγράφετε μόνοι σας, καθαρίζοντας τα δεδομένα του site από τις ρυθμίσεις του browser.`,
          en: `Because BuildDraft.gr keeps no personal data about you, most requests concern the hosting logs. Send your request to ${mail} and we will reply within one month. You can delete what is stored in your browser yourself by clearing the site's data in your browser settings.`,
        },
      ],
    },
    {
      heading: { el: 'Αλλαγές στην πολιτική', en: 'Changes to this policy' },
      paragraphs: [
        {
          el: 'Αν η πολιτική αλλάξει, η νέα εκδοχή θα δημοσιεύεται εδώ με νέα ημερομηνία.',
          en: 'If this policy changes, the new version will be published here with a new date.',
        },
      ],
    },
  ],
  footnote: { el: `Τελευταία ενημέρωση: ${updated}`, en: `Last updated: ${updated}` },
};
