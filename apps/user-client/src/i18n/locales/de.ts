import type { en } from "./en";

export const de: typeof en = {
  appName: "QueuePass",
  language: {
    label: "Sprache",
    en: "Englisch",
    de: "Deutsch",
  },
  nav: {
    label: "Hauptnavigation",
    discoverEvents: "Veranstaltungen",
    myEvents: "Meine Events",
    myTickets: "Meine Tickets",
    account: "Konto",
    signIn: "Anmelden",
    openMenu: "Menü öffnen",
    closeMenu: "Menü schließen",
  },
  event: {
    free: "Kostenlos",
    soldOut: "Ausverkauft",
    ticketsLeft: "Noch {count} von {capacity} Tickets",
    by: "von {organizer}",
    cancelled: "Abgesagt",
  },
  landing: {
    tagline: "Ticketing ohne Warteschlange",
    headline: "Verkauf deine Veranstaltung aus. Lass alle ohne Schlange rein.",
    subline:
      "QueuePass gibt Veranstaltern in Minuten einen Shop und Gästen ein Ticket, das im Handy liegt.",
    discoverEvents: "Veranstaltungen entdecken",
    hostEvent: "Event veranstalten",
    forOrganizers: {
      title: "Für Veranstalter",
      publishFast:
        "Veranstaltung in Minuten online, ohne eigenen Shop und ohne Zahlungsanbindung.",
      soldOutSafely:
        "Die Kapazität hält bis zum letzten Ticket, auch wenn alle gleichzeitig kaufen.",
      scanAnywhere:
        "Einlass mit dem Handy, das du ohnehin dabei hast - auch ohne Netz vor Ort.",
    },
    forAttendees: {
      title: "Für Gäste",
      buyInSeconds:
        "In Sekunden gekauft, ohne Kontosuche und ohne auf eine E-Mail zu warten.",
      ticketInWallet:
        "Das Ticket liegt in Apple Wallet oder Google Wallet, immer griffbereit.",
      printIfYouLike:
        "Lieber auf Papier? Lade das PDF herunter und druck es aus.",
    },
    upcoming: {
      title: "Jetzt im Verkauf",
      showAll: "Alle Veranstaltungen ansehen",
    },
    closing: {
      title: "Deine nächste Veranstaltung beginnt hier",
      description:
        "Erstelle ein Veranstalterkonto und bring dein erstes Event noch heute online.",
      action: "Jetzt starten",
    },
  },
  events: {
    title: "Kommende Veranstaltungen",
    subtitle:
      "Such dir eine Veranstaltung aus und hol dir dein Ticket in Sekunden.",
    empty:
      "Aktuell ist keine Veranstaltung im Verkauf. Schau bald wieder vorbei.",
    noMatch: "Keine Veranstaltung passt zu deiner Suche.",
    loadFailed: "Die Veranstaltungen konnten nicht geladen werden.",
    searchLabel: "Suche",
    searchPlaceholder: "Titel oder Stadt",
  },
  eventDetail: {
    backToEvents: "Alle Veranstaltungen",
    when: "Wann",
    where: "Wo",
    price: "Preis",
    availability: "Verfügbarkeit",
    organizer: "Veranstalter",
    buy: "Ticket kaufen",
    buySoon: "Der Ticketverkauf startet in Kürze.",
    cancelledNotice: "Diese Veranstaltung wurde vom Veranstalter abgesagt.",
    overNotice: "Diese Veranstaltung ist vorbei.",
    loadFailed: "Diese Veranstaltung konnte nicht geladen werden.",
    notFound:
      "Diese Veranstaltung gibt es nicht oder sie ist nicht im Verkauf.",
  },
  checkout: {
    title: "Tickets kaufen",
    quantity: "Anzahl Tickets",
    quantityHint: "1 bis {max} pro Bestellung.",
    unitPrice: "Preis pro Ticket",
    total: "Gesamt",
    buy: "Jetzt kaufen",
    buying: "Kauf wird abgeschlossen…",
    failed: "Der Kauf konnte nicht abgeschlossen werden.",
    notEnoughLeft: "So viele Tickets sind nicht mehr verfügbar.",
    priceBelowMinimum:
      "Diese Tickets können zum aktuellen Preis nicht verkauft werden.",
    soldOut: "Diese Veranstaltung ist ausverkauft.",
    cancelled:
      "Diese Veranstaltung wurde abgesagt, es gibt keine Tickets mehr.",
    over: "Diese Veranstaltung ist vorbei, es gibt keine Tickets mehr.",
    back: "Zurück zur Veranstaltung",
    loadFailed: "Diese Veranstaltung konnte nicht geladen werden.",
  },
  orderStatus: {
    title: "Deine Bestellung",
    quantity: "Tickets",
    total: "Gesamt",
    paid: "Zahlung eingegangen",
    paidHint: "Deine Tickets sind bereit.",
    pending: "Wir warten auf deine Zahlung",
    pendingHint:
      "Diese Seite aktualisiert sich, sobald die Zahlung bestätigt ist.",
    checkoutLeft: "Du hast die Zahlungsseite verlassen",
    checkoutLeftHint:
      "Deine Tickets bleiben noch kurz reserviert, du kannst sie weiterhin bezahlen.",
    released: "Die Reservierung wurde aufgehoben",
    releasedHint:
      "Die Zahlung kam nicht rechtzeitig an, die Tickets sind wieder im Verkauf.",
    showTickets: "Meine Tickets anzeigen",
    payAgain: "Jetzt bezahlen",
    backToEvent: "Zurück zur Veranstaltung",
    loadFailed: "Diese Bestellung konnte nicht geladen werden.",
  },
  myTickets: {
    title: "Meine Tickets",
    description: "Zeig den QR-Code am Eingang vor.",
    pastTickets: "Vergangene Tickets",
    empty: "Du hast keine Tickets für anstehende Veranstaltungen.",
    loadFailed: "Deine Tickets konnten nicht geladen werden.",
    showTicket: "Ticket anzeigen",
    checkedIn: "Bereits gescannt",
    cancelled: "Abgesagt",
  },
  pastTickets: {
    title: "Vergangene Tickets",
    description: "Die Tickets der Veranstaltungen, auf denen du schon warst.",
    empty: "Noch keine deiner Veranstaltungen ist vorbei.",
    loadFailed: "Deine vergangenen Tickets konnten nicht geladen werden.",
    back: "Meine Tickets",
  },
  ticket: {
    backToTickets: "Meine Tickets",
    scanHint: "Lass diesen Code am Eingang scannen.",
    code: "Ticketcode",
    checkedInAt: "Gescannt am {when}",
    notCheckedIn: "Noch nicht gescannt",
    eventCancelled:
      "Diese Veranstaltung wurde abgesagt. Das Ticket ist nicht mehr gültig.",
    refundPending: "Deine {amount} sind auf dem Weg zurück zu dir.",
    refunded: "{amount} wurden dir am {when} erstattet.",
    refundFailed:
      "Die Erstattung von {amount} ist noch nicht durchgegangen. Wir kümmern uns darum.",
    print: "Drucken",
    download: "PDF herunterladen",
    appleWallet: "Zu Apple Wallet hinzufügen",
    googleWallet: "In Google Wallet speichern",
    walletUnavailable: "Ausgegraute Wallets sind noch nicht eingerichtet.",
    loadFailed: "Dieses Ticket konnte nicht geladen werden.",
    notFound: "Dieses Ticket gibt es nicht.",
  },
  scanner: {
    title: "Einlass",
    description: "Tickets für {event} scannen.",
    startCamera: "Kamera starten",
    stopCamera: "Kamera stoppen",
    nextTicket: "Nächstes Ticket",
    camera: {
      starting: "Kamera startet…",
      off: "Kamera ist aus.",
      checking: "Ticket wird geprüft…",
      denied:
        "Der Zugriff auf die Kamera wurde abgelehnt. Erlaube ihn für diese Seite in den Browser-Einstellungen und starte die Kamera erneut.",
      insecure: "Die Kamera funktioniert nur über https oder auf localhost.",
      unavailable: "Die Kamera konnte nicht gestartet werden.",
    },
    checkFailed:
      "Das Ticket konnte nicht geprüft werden. Versuche es erneut, sobald die Verbindung zurück ist.",
    outcome: {
      CHECKED_IN: "Eingelassen",
      ALREADY_CHECKED_IN: "Bereits verwendet",
      UNKNOWN_CODE: "Unbekanntes Ticket",
      WRONG_EVENT: "Ticket einer anderen Veranstaltung",
      CANCELLED: "Ticket storniert",
      EVENT_OVER: "Veranstaltung ist vorbei",
    },
    entranceClosed: {
      ENDED: "Diese Veranstaltung ist vorbei. Der Einlass ist geschlossen.",
      CANCELLED:
        "Diese Veranstaltung ist abgesagt. Der Einlass ist geschlossen.",
    },
    usedAt: "Verwendet {when}",
    holder: "Ticket von {name}",
    back: "Zurück zu meinen Events",
  },
  attendees: {
    title: "Teilnehmer",
    description: "Alle, die ein Ticket für {event} haben.",
    empty: "Es wurden noch keine Tickets verkauft.",
    loadFailed: "Die Teilnehmerliste konnte nicht geladen werden.",
    buyer: "Käufer",
    code: "Ticket",
    status: "Status",
    checkedIn: "Gescannt",
    notCheckedIn: "Nicht gescannt",
    checkIn: "Einlassen",
    undoCheckIn: "Zurücknehmen",
    summary: "{checkedIn} von {total} Tickets gescannt",
    searchLabel: "Suche",
    searchPlaceholder: "Name, E-Mail oder Ticketcode",
    noMatch: "Kein Teilnehmer passt zu deiner Suche.",
    actionFailed: "Das hat nicht geklappt. Bitte versuch es noch einmal.",
    toScanner: "Einlass",
    entranceClosed: {
      ENDED:
        "Diese Veranstaltung ist vorbei. Der Einlass ist geschlossen, die Liste bleibt zum Nachlesen.",
      CANCELLED:
        "Diese Veranstaltung ist abgesagt. Der Einlass ist geschlossen, die Liste bleibt zum Nachlesen.",
    },
    back: "Zurück zu meinen Events",
  },
  becomeOrganizer: {
    title: "Eigene Veranstaltungen anbieten",
    description:
      "Dein Konto kann auch Tickets verkaufen. Eine zweite Registrierung brauchst du nicht.",
    confirm: "Veranstalter werden",
    pending: "Wird eingerichtet…",
    failed: "Für dieses Konto konnte kein Veranstalterzugang vergeben werden.",
  },
  organizer: {
    title: "Meine Events",
    description:
      "Lege Veranstaltungen an, bring sie in den Verkauf und behalte den Absatz im Blick.",
    newEvent: "Neue Veranstaltung",
    pastEvents: "Vergangene Events",
    empty: "Du hast keine anstehenden Veranstaltungen.",
    loadFailed: "Deine Veranstaltungen konnten nicht geladen werden.",
    ticketsSold: "{sold} von {capacity} verkauft",
    status: {
      DRAFT: "Entwurf",
      PUBLISHED: "Im Verkauf",
      CANCELLED: "Abgesagt",
      ENDED: "Vorbei",
    },
    scan: "Einlass",
    attendees: "Teilnehmer",
    edit: "Bearbeiten",
    publish: "In den Verkauf",
    cancelEvent: "Absagen",
    cancelWarning:
      "{sold} von {capacity} Tickets sind verkauft. Beim Absagen werden alle Tickets ungültig und {amount} an die Käufer erstattet. Das lässt sich nicht rückgängig machen.",
    confirmCancel: "Absagen und erstatten",
    keepEvent: "Doch nicht absagen",
    cancelDone:
      "Abgesagt, {amount} an 1 Käufer erstattet. | Abgesagt, {amount} an {count} Käufer erstattet.",
    cancelRefundFailed:
      "1 Erstattung ist fehlgeschlagen und muss von Hand geklärt werden. | {count} Erstattungen sind fehlgeschlagen und müssen von Hand geklärt werden.",
    deleteEvent: "Löschen",
    actionFailed: "Das hat nicht geklappt. Bitte versuch es noch einmal.",
  },
  pastEvents: {
    title: "Vergangene Events",
    description:
      "Alles, was vorbei oder abgesagt ist, mit der Teilnehmerliste jeder Veranstaltung.",
    empty: "Noch keine deiner Veranstaltungen ist vorbei oder abgesagt.",
    loadFailed:
      "Deine vergangenen Veranstaltungen konnten nicht geladen werden.",
    back: "Meine Events",
  },
  accountSettings: {
    title: "Konto",
    description:
      "Deine Auszahlungsdaten. Wir nehmen die Zahlungen ein und geben deinen Anteil an dich weiter.",
    payoutTitle: "Auszahlungskonto",
    payoutDescription:
      "Wir überweisen deine Ticketerlöse abzüglich der Plattformgebühr auf diese IBAN.",
    loading: "Auszahlungsdaten werden geladen…",
    loadFailed: "Deine Auszahlungsdaten konnten nicht geladen werden.",
    missingIban:
      "Noch keine IBAN hinterlegt. Ohne sie können wir deine Erlöse nicht überweisen.",
    ibanLabel: "IBAN",
    ibanPlaceholder: "DE00 0000 0000 0000 0000 00",
    ibanHint:
      "Das Konto muss dir gehören. Leerzeichen sind erlaubt, wir speichern die IBAN ohne.",
    save: "Speichern",
    saving: "Wird gespeichert…",
    saved: "IBAN gespeichert.",
    ibanInvalid: "Das ist keine gültige IBAN. Bitte prüfe sie auf Tippfehler.",
    saveFailed: "Die IBAN konnte nicht gespeichert werden.",
  },
  eventForm: {
    createTitle: "Neue Veranstaltung",
    editTitle: "Veranstaltung bearbeiten",
    loading: "Veranstaltung wird geladen…",
    name: "Titel",
    description: "Beschreibung",
    location: "Ort",
    startsAt: "Beginn",
    endsAt: "Ende",
    price: "Preis in Euro",
    priceHint:
      "Trag 0 ein, wenn die Veranstaltung kostenlos ist, sonst mindestens 0,50 Euro.",
    capacity: "Kapazität",
    image: "Veranstaltungsbild",
    imageHint: "JPEG, PNG oder WebP.",
    chooseImage: "Bild hochladen",
    changeImage: "Bild ersetzen",
    uploading: "Wird hochgeladen…",
    imageReady: "Bild gespeichert.",
    uploadFailed: "Das Bild konnte nicht hochgeladen werden.",
    save: "Speichern",
    saving: "Wird gespeichert…",
    saveFailed: "Die Veranstaltung konnte nicht gespeichert werden.",
    endBeforeStart: "Die Veranstaltung muss nach ihrem Beginn enden.",
    startsInPast: "Die Veranstaltung muss in der Zukunft beginnen.",
    capacityBelowSold:
      "Die Kapazität darf nicht unter den bereits verkauften Tickets liegen.",
    priceBelowMinimum:
      "Ein kostenpflichtiges Ticket muss mindestens 0,50 Euro kosten.",
    back: "Zurück zu meinen Events",
  },
  login: {
    title: "Anmelden",
    description:
      "Melde dich an, um Tickets zu kaufen und deine Events zu verwalten.",
    email: "E-Mail",
    password: "Passwort",
    submit: "Anmelden",
    pending: "Anmeldung läuft…",
    failed: "E-Mail oder Passwort ist falsch.",
    backofficeAccount:
      "Backoffice-Konten haben keine eigenen Tickets und keine eigenen Events. Melde dich mit deinem persönlichen Konto an.",
    noAccount: "Noch kein Konto?",
    toRegister: "Konto erstellen",
  },
  register: {
    title: "Konto erstellen",
    description:
      "Registriere dich, um Tickets zu kaufen oder eigene zu verkaufen.",
    name: "Name",
    email: "E-Mail",
    password: "Passwort",
    passwordHint: "Mindestens 8 Zeichen.",
    roleLabel: "Ich möchte",
    roleAttendee: "Veranstaltungen besuchen",
    roleAttendeeHint: "Tickets kaufen und im Wallet behalten.",
    roleOrganizer: "Veranstaltungen anbieten",
    roleOrganizerHint:
      "Events veröffentlichen, Tickets verkaufen und Gäste einlassen.",
    submit: "Konto erstellen",
    pending: "Konto wird erstellt…",
    failed: "Das Konto konnte nicht erstellt werden.",
    emailTaken: "Diese E-Mail ist bereits registriert.",
    passwordTooShort: "Das Passwort braucht mindestens 8 Zeichen.",
    organizerFailed:
      "Das Konto wurde erstellt, aber der Veranstalterzugang konnte nicht vergeben werden.",
    hasAccount: "Schon registriert?",
    toLogin: "Anmelden",
  },
  session: {
    signOut: "Abmelden",
  },
};
