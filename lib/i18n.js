export const DEFAULT_LANG = "el";
export const SUPPORTED_LANGS = ["el", "en"];

export const messages = {
  el: {
    nav: {
      services: "Υπηρεσίες",
      hours: "Ώρες",
      location: "Τοποθεσία",
      contact: "Επικοινωνία",
      settings: "Ρυθμίσεις",
      login: "Σύνδεση",
      profileOf: "Προφίλ του {username}",
      profileFallback: "Προφίλ",
    },
    common: {
      cancel: "Άκυρο",
      confirm: "Επιβεβαίωση",
      close: "Κλείσιμο",
      loading: "Φόρτωση...",
      error: "Κάτι πήγε στραβά.",
      back: "Πίσω",
      next: "Επόμενο",
      save: "Αποθήκευση",
      saving: "Αποθήκευση...",
      edit: "Επεξεργασία",
      logout: "Αποσύνδεση",
      selectDate: "Επιλέξτε ημερομηνία",
    },
    auth: {
      headings: {
        login: "Σύνδεση",
        signup: "Δημιουργία Λογαριασμού",
        forgot: "Επαναφορά Κωδικού",
        reset: "Επιβεβαίωση OTP",
        dob: "Συμπλήρωση Ημερομηνίας Γέννησης",
      },
      descriptions: {
        login: "Συνδεθείτε για να δείτε τις κρατήσεις σας.",
        signup: "Εγγραφείτε για να βλέπετε και να διαχειρίζεστε τα ραντεβού σας.",
        forgot: "Εισάγετε το κινητό σας και θα σας στείλουμε έναν κωδικό OTP.",
        reset: "Πληκτρολογήστε τον κωδικό OTP και ορίστε νέο κωδικό πρόσβασης.",
        dob: "Για να συνεχίσετε, πρέπει να αποθηκεύσετε ημερομηνία γέννησης (μία φορά).",
      },
      cta: {
        login: "Σύνδεση",
        signup: "Εγγραφή",
        forgot: "Αποστολή OTP",
        reset: "Επιβεβαίωση",
        dob: "Αποθήκευση",
      },
      fields: {
        username: "Όνομα χρήστη",
        phone: "Τηλέφωνο",
        password: "Κωδικός πρόσβασης",
        newPassword: "Νέος κωδικός",
        dob: "Ημερομηνία Γέννησης",
      },
      hints: {
        stepFlow: "1) Διάλεξε Χρονιά  2) Μήνα  3) Ημέρα",
      },
      messages: {
        systemUpdated:
          "Το σύστημα ανανεώθηκε πρόσφατα. Αν είχατε λογαριασμό, χρειάζεται να",
        signupAgain: "εγγραφείτε ξανά",
        otpSent: "Στείλαμε OTP στο κινητό σας. Ισχύει για 10 λεπτά.",
        passwordUpdated: "Ο κωδικός ενημερώθηκε. Συνδεθείτε με τον νέο κωδικό.",
      },
      links: {
        forgotPassword: "Ξεχάσατε τον κωδικό;",
        haveAccount: "Έχετε ήδη λογαριασμό;",
        noAccount: "Δεν έχετε λογαριασμό;",
        createAccount: "Δημιουργία λογαριασμού",
        signIn: "Συνδεθείτε",
        rememberPassword: "Θυμηθήκατε τον κωδικό;",
        createNewAccountArrow: "Δημιουργία νέου λογαριασμού →",
      },
      errors: {
        fillPhonePassword: "Συμπληρώστε κινητό και κωδικό.",
        fillSignupFields:
          "Συμπληρώστε όνομα, κωδικό, κινητό και ημερομηνία γέννησης.",
        invalidDob: "Η ημερομηνία γέννησης δεν είναι έγκυρη.",
        fillPhone: "Συμπληρώστε τον αριθμό κινητού.",
        fillOtp: "Συμπληρώστε τον κωδικό OTP.",
        fillNewPassword: "Συμπληρώστε τον νέο κωδικό.",
        fillDob: "Συμπληρώστε ημερομηνία γέννησης.",
        invalidCredentials:
          "Λάθος στοιχεία σύνδεσης. Αν δεν έχετε λογαριασμό, εγγραφείτε παρακάτω.",
      },
      actions: {
        closePassword: "Απόκρυψη κωδικού",
        showPassword: "Εμφάνιση κωδικού",
      },
    },
    booking: {
      step: {
        selectBarber: "Επιλέξτε κουρέα",
        selectDate: "Επιλέξτε ημερομηνία",
        selectTime: "Επιλέξτε ώρα",
        yourDetails: "Τα στοιχεία σας",
        editPrefix: "Αλλαγή ραντεβού — ",
      },
      buttons: {
        saving: "Αποθήκευση...",
        editLocked: "Αλλαγές επιτρέπονται έως 24 ώρες πριν",
        confirmChanges: "Επιβεβαίωση αλλαγών",
        creating: "Γίνεται κράτηση…",
        confirmAndBook: "Επιβεβαίωση και κράτηση",
        joinWaitlist: "Συμμετοχή στη λίστα αναμονής →",
      },
      labels: {
        pickTimeFor: "Επιλέξτε ώρα για",
        noSlots: "Δεν υπάρχουν διαθέσιμα",
        cantFindTime: "Δεν βρίσκεις την ώρα που θέλεις;",
        notifyRelease: "Θα σε ειδοποιήσουμε αν ελευθερωθεί ραντεβού για",
        selectedDate: "την ημερομηνία που επέλεξες",
        barber: "Κουρέας:",
        date: "Ημερομηνία:",
        time: "Ώρα:",
        service: "Υπηρεσία:",
        defaultService: "Κούρεμα",
        namePlaceholder: "Όνομα",
        loadingAvailability: "Φόρτωση διαθεσιμότητας",
        cannotRescheduleLocked:
          "Δεν μπορείτε να αλλάξετε το ραντεβού λιγότερο από 24 ώρες πριν. Επικοινωνήστε τηλεφωνικά.",
      },
      toasts: {
        waitlistSuccess: "✅ Προστέθηκες στη λίστα αναμονής!",
        waitlistError: "❌ Η εγγραφή στη λίστα απέτυχε. Προσπαθήστε ξανά.",
      },
      barberNames: {
        lemoUpper: "ΛΕΜΟ",
        forouUpper: "ΦΟΡΟΥ",
        koushisUpper: "ΚΟΥΣΙΗΣ",
        lemoUi: "Λεμο",
        forouUi: "Φορου",
        koushisUi: "Κουσιης",
      },
    },
    calendar: {
      prev: "Προηγούμενος",
      next: "Επόμενος",
      monthClosedWithOverrides: "Ο μήνας είναι κλειστός εκτός από συγκεκριμένες ημέρες.",
      monthClosed: "Οι κρατήσεις για αυτόν τον μήνα είναι προσωρινά απενεργοποιημένες.",
      unavailable: "Μη διαθέσιμο",
      available: "Διαθέσιμο",
      full: "Πλήρες",
      closed: "Κλειστό",
      cantFindTime: "Δεν βρίσκεις την ώρα που θέλεις;",
      waitlistPromptDate: "Ζήτα να ειδοποιηθείς εάν ανοίξει κάποιο ραντεβού για {date}.",
      waitlistPromptNoDate: "Διάλεξε ημερομηνία και δήλωσε τη διαθεσιμότητα που σε ενδιαφέρει.",
      joinWaitlist: "Συμμετοχή στη λίστα αναμονής →",
    },
    waitlist: {
      title: "Μπες στη λίστα αναμονής",
      date: "Ημερομηνία: {date}",
      close: "Κλείσιμο",
      preferredBarber: "Προτιμώμενος κουρέας",
      anyBarber: "Όποιος είναι διαθέσιμος",
      preferredTimes: "Προτιμώμενες ώρες",
      hideTimes: "Απόκρυψη ωρών",
      availableTimes: "Διαθέσιμες ώρες",
      loadingSlots: "Φόρτωση...",
      allTimesAvailable: "Όλες οι ώρες είναι διαθέσιμες σήμερα.",
      fullNamePlaceholder: "Ονοματεπώνυμο",
      phonePlaceholder: "Τηλέφωνο",
      submit: "Συμμετοχή",
      submitting: "Αποστολή...",
      errors: {
        loadSlots: "Αποτυχία φόρτωσης ωρών",
        fillAllFields: "Συμπληρώστε όλα τα πεδία.",
        selectDate: "Επιλέξτε ημερομηνία.",
        submitFailed: "Αποτυχία αποστολής.",
      },
      removeTime: "Αφαίρεση {slot}",
    },
    profile: {
      title: "Ο λογαριασμός μου",
      guest: "Επισκέπτης",
      dobLabel: "Ημερομηνία Γέννησης",
      editDobAria: "Επεξεργασία ημερομηνίας γέννησης",
      myAppointments: "Τα ραντεβού μου",
      loadingAppointments: "Φόρτωση ραντεβού…",
      noAppointments:
        "Δεν έχετε κλεισμένα ραντεβού ακόμα. Πατήστε “ΚΛΕΙΣΤΕ ΡΑΝΤΕΒΟΥ” για να προχωρήσετε!",
      messages: {
        dobUpdated: "Η ημερομηνία γέννησης ενημερώθηκε.",
        appointmentCancelled: "Το ραντεβού ακυρώθηκε.",
        confirmCancelTitle: "Επιβεβαίωση ακύρωσης",
        confirmRescheduleTitle: "Επιβεβαίωση αλλαγής",
        confirmCancelBody: "Θέλετε σίγουρα να ακυρώσετε αυτό το ραντεβού;",
        confirmRescheduleBody: "Θέλετε σίγουρα να συνεχίσετε με την αλλαγή του ραντεβού;",
      },
      errors: {
        validDate: "Συμπληρώστε έγκυρη ημερομηνία.",
        dateInvalid: "Η ημερομηνία δεν είναι έγκυρη.",
        dateFuture: "Η ημερομηνία γέννησης δεν μπορεί να είναι στο μέλλον.",
        saveDobFailed: "Αποτυχία αποθήκευσης ημερομηνίας γέννησης.",
        cancelFailed: "Η ακύρωση απέτυχε.",
      },
      types: {
        appointment: "Ραντεβού",
        break: "Διάλειμμα",
        lock: "Κλείδωμα",
      },
    },
    home: {
      bookNow: "ΚΛΕΙΣΤΕ ΡΑΝΤΕΒΟΥ",
      servicesPrices: "Υπηρεσίες & Τιμές",
      haircut: "Κούρεμα",
      bookArrow: "Κράτηση →",
      location: "Τοποθεσία",
      mapTitle: "Χάρτης",
      openGoogleMaps: "Άνοιγμα στο Google Maps",
      bookAppointment: "Κλείστε ραντεβού",
      walkinText:
        "Δεχόμαστε χωρίς ραντεβού όταν υπάρχει διαθεσιμότητα. Συνιστάται η κράτηση.",
      openingHours: "Ώρες Λειτουργίας",
      hoursTueFri: "Τρ–Παρ: 09:00–19:00",
      hoursSat: "Σαβ: 09:00–17:40",
      hoursSunMon: "Κυρ–Δευ: Κλειστά",
    },
    footer: {
      call: "Κλήση",
      callAria: "Κλήση {phone}",
    },
    success: {
      updated: "Το ραντεβού σου ενημερώθηκε επιτυχώς.",
      created: "Το ραντεβού σου καταχωρήθηκε επιτυχώς.",
      updatedTitle: "Το ραντεβού ενημερώθηκε",
      createdTitle: "Το ραντεβού δημιουργήθηκε",
      dismiss: "Κλείσιμο ειδοποίησης",
      dismissShort: "Κλείσιμο",
      backHome: "Επιστροφή στην αρχική",
      contactUs: "Επικοινωνία",
      loading: "Φόρτωση…",
    },
    errorPage: {
      title: "Σφάλμα",
      generic: "Κάτι πήγε στραβά.",
    },
    bookPages: {
      appointment: "Κλείσιμο ραντεβού",
      selectService: "Επιλέξτε υπηρεσία για συνέχεια.",
      redirecting: "Μεταφορά στην επιλογή ημερομηνίας…",
      loadingServices: "Φόρτωση υπηρεσιών…",
      selectDate: "Επιλέξτε ημερομηνία",
      serviceSelected: "Επιλεγμένη υπηρεσία: {service}",
      dateLabel: "Ημερομηνία",
      checkingAvailability: "Έλεγχος διαθεσιμότητας…",
      continue: "Συνέχεια",
      selectTime: "Επιλέξτε ώρα",
      serviceDateDuration:
        "Υπηρεσία: {service} • Ημερομηνία: {date} • Διάρκεια: 40′",
      loadingTimes: "Φόρτωση διαθέσιμων ωρών…",
      back: "Πίσω",
      yourDetails: "Τα στοιχεία σας",
      atTime: "{date} στις {time}",
      name: "Όνομα",
      phone: "Τηλέφωνο",
      dobOptional: "Ημερομηνία γέννησης (προαιρετικό)",
      reviewBooking: "Έλεγχος κράτησης",
      confirmBooking: "Επιβεβαίωση κράτησης",
      confirmAndBook: "Επιβεβαίωση και κράτηση",
      booking: "Γίνεται κράτηση…",
      failedCreate: "Αποτυχία δημιουργίας ραντεβού",
      loading: "Φόρτωση…",
      none: "(καμία)",
    },
  },
  en: {
    nav: {
      services: "Services",
      hours: "Hours",
      location: "Location",
      contact: "Contact",
      settings: "Settings",
      login: "Sign in",
      profileOf: "{username}'s profile",
      profileFallback: "Profile",
    },
    common: {
      cancel: "Cancel",
      confirm: "Confirm",
      close: "Close",
      loading: "Loading...",
      error: "Something went wrong.",
      back: "Back",
      next: "Next",
      save: "Save",
      saving: "Saving...",
      edit: "Edit",
      logout: "Log out",
      selectDate: "Select date",
    },
    auth: {
      headings: {
        login: "Sign in",
        signup: "Create Account",
        forgot: "Reset Password",
        reset: "Verify OTP",
        dob: "Complete Date of Birth",
      },
      descriptions: {
        login: "Sign in to view your appointments.",
        signup: "Create an account to view and manage your appointments.",
        forgot: "Enter your phone number and we'll send you an OTP code.",
        reset: "Enter the OTP code and set a new password.",
        dob: "To continue, you must save your date of birth (one time).",
      },
      cta: {
        login: "Sign in",
        signup: "Sign up",
        forgot: "Send OTP",
        reset: "Verify",
        dob: "Save",
      },
      fields: {
        username: "Username",
        phone: "Phone",
        password: "Password",
        newPassword: "New password",
        dob: "Date of Birth",
      },
      hints: {
        stepFlow: "1) Pick Year  2) Month  3) Day",
      },
      messages: {
        systemUpdated:
          "The system was recently upgraded. If you already had an account, you need to",
        signupAgain: "sign up again",
        otpSent: "We sent an OTP to your phone. It is valid for 10 minutes.",
        passwordUpdated: "Password updated. Sign in with your new password.",
      },
      links: {
        forgotPassword: "Forgot your password?",
        haveAccount: "Already have an account?",
        noAccount: "Don't have an account?",
        createAccount: "Create account",
        signIn: "Sign in",
        rememberPassword: "Remembered your password?",
        createNewAccountArrow: "Create new account →",
      },
      errors: {
        fillPhonePassword: "Please enter phone and password.",
        fillSignupFields:
          "Please enter name, password, phone and date of birth.",
        invalidDob: "Date of birth is not valid.",
        fillPhone: "Please enter phone number.",
        fillOtp: "Please enter OTP code.",
        fillNewPassword: "Please enter new password.",
        fillDob: "Please enter date of birth.",
        invalidCredentials:
          "Invalid credentials. If you don't have an account, please sign up below.",
      },
      actions: {
        closePassword: "Hide password",
        showPassword: "Show password",
      },
    },
    booking: {
      step: {
        selectBarber: "Select barber",
        selectDate: "Select date",
        selectTime: "Select time",
        yourDetails: "Your details",
        editPrefix: "Edit appointment — ",
      },
      buttons: {
        saving: "Saving...",
        editLocked: "Changes are allowed up to 24 hours before",
        confirmChanges: "Confirm changes",
        creating: "Booking...",
        confirmAndBook: "Confirm and book",
        joinWaitlist: "Join waiting list →",
      },
      labels: {
        pickTimeFor: "Select time for",
        noSlots: "No available slots",
        cantFindTime: "Can't find your preferred time?",
        notifyRelease: "We'll notify you if a slot opens up for",
        selectedDate: "your selected date",
        barber: "Barber:",
        date: "Date:",
        time: "Time:",
        service: "Service:",
        defaultService: "Haircut",
        namePlaceholder: "Name",
        loadingAvailability: "Loading availability",
        cannotRescheduleLocked:
          "You cannot reschedule less than 24 hours before. Please call us.",
      },
      toasts: {
        waitlistSuccess: "✅ You joined the waiting list!",
        waitlistError: "❌ Waiting list signup failed. Please try again.",
      },
      barberNames: {
        lemoUpper: "LEMO",
        forouUpper: "FOROU",
        koushisUpper: "KOUSHIS",
        lemoUi: "Lemo",
        forouUi: "Forou",
        koushisUi: "Koushis",
      },
    },
    calendar: {
      prev: "Previous",
      next: "Next",
      monthClosedWithOverrides: "This month is closed except specific dates.",
      monthClosed: "Bookings for this month are temporarily disabled.",
      unavailable: "Unavailable",
      available: "Available",
      full: "Full",
      closed: "Closed",
      cantFindTime: "Can't find your preferred time?",
      waitlistPromptDate: "Request notification if a slot opens on {date}.",
      waitlistPromptNoDate: "Pick a date and share your preferred availability.",
      joinWaitlist: "Join waiting list →",
    },
    waitlist: {
      title: "Join the waiting list",
      date: "Date: {date}",
      close: "Close",
      preferredBarber: "Preferred barber",
      anyBarber: "Any available barber",
      preferredTimes: "Preferred times",
      hideTimes: "Hide times",
      availableTimes: "Available times",
      loadingSlots: "Loading...",
      allTimesAvailable: "All times are available today.",
      fullNamePlaceholder: "Full name",
      phonePlaceholder: "Phone",
      submit: "Join",
      submitting: "Submitting...",
      errors: {
        loadSlots: "Failed to load times",
        fillAllFields: "Please fill in all fields.",
        selectDate: "Please select a date.",
        submitFailed: "Submission failed.",
      },
      removeTime: "Remove {slot}",
    },
    profile: {
      title: "My account",
      guest: "Guest",
      dobLabel: "Date of Birth",
      editDobAria: "Edit date of birth",
      myAppointments: "My appointments",
      loadingAppointments: "Loading appointments...",
      noAppointments:
        "You don't have any appointments yet. Tap “BOOK APPOINTMENT” to continue!",
      messages: {
        dobUpdated: "Date of birth updated.",
        appointmentCancelled: "Appointment cancelled.",
        confirmCancelTitle: "Confirm cancellation",
        confirmRescheduleTitle: "Confirm change",
        confirmCancelBody: "Are you sure you want to cancel this appointment?",
        confirmRescheduleBody: "Are you sure you want to continue with rescheduling?",
      },
      errors: {
        validDate: "Please enter a valid date.",
        dateInvalid: "Date is invalid.",
        dateFuture: "Date of birth cannot be in the future.",
        saveDobFailed: "Failed to save date of birth.",
        cancelFailed: "Cancellation failed.",
      },
      types: {
        appointment: "Appointment",
        break: "Break",
        lock: "Lock",
      },
    },
    home: {
      bookNow: "BOOK APPOINTMENT",
      servicesPrices: "Services & Prices",
      haircut: "Haircut",
      bookArrow: "Book →",
      location: "Location",
      mapTitle: "Map",
      openGoogleMaps: "Open in Google Maps",
      bookAppointment: "Book an appointment",
      walkinText:
        "Walk-ins are accepted when available. Booking is recommended.",
      openingHours: "Opening Hours",
      hoursTueFri: "Tue–Fri: 09:00–19:00",
      hoursSat: "Sat: 09:00–17:40",
      hoursSunMon: "Sun–Mon: Closed",
    },
    footer: {
      call: "Call",
      callAria: "Call {phone}",
    },
    success: {
      updated: "Your appointment was updated successfully.",
      created: "Your appointment was created successfully.",
      updatedTitle: "Appointment updated",
      createdTitle: "Appointment created",
      dismiss: "Dismiss notification",
      dismissShort: "Dismiss",
      backHome: "Back to home",
      contactUs: "Contact us",
      loading: "Loading…",
    },
    errorPage: {
      title: "Error",
      generic: "Something went wrong.",
    },
    bookPages: {
      appointment: "Book an appointment",
      selectService: "Select a service to continue.",
      redirecting: "Redirecting to date selection…",
      loadingServices: "Loading services…",
      selectDate: "Select a date",
      serviceSelected: "Service selected: {service}",
      dateLabel: "Date",
      checkingAvailability: "Checking availability…",
      continue: "Continue",
      selectTime: "Select time",
      serviceDateDuration: "Service: {service} • Date: {date} • Duration: 40′",
      loadingTimes: "Loading available times…",
      back: "Back",
      yourDetails: "Your details",
      atTime: "{date} at {time}",
      name: "Name",
      phone: "Phone",
      dobOptional: "Date of birth (optional)",
      reviewBooking: "Review booking",
      confirmBooking: "Confirm booking",
      confirmAndBook: "Confirm and book",
      booking: "Booking…",
      failedCreate: "Failed to create appointment",
      loading: "Loading…",
      none: "(none)",
    },
  },
};

function interpolate(template, params = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) => {
    return params[key] == null ? "" : String(params[key]);
  });
}

function getByPath(obj, path) {
  return String(path)
    .split(".")
    .reduce((acc, segment) => (acc && acc[segment] != null ? acc[segment] : undefined), obj);
}

export function translate(lang, key, params) {
  const safeLang = SUPPORTED_LANGS.includes(lang) ? lang : DEFAULT_LANG;
  const value = getByPath(messages[safeLang], key);
  const fallback = getByPath(messages[DEFAULT_LANG], key);
  const resolved = value != null ? value : fallback;
  if (resolved == null) return key;
  return typeof resolved === "string" ? interpolate(resolved, params) : resolved;
}

export function normalizeLang(value) {
  return SUPPORTED_LANGS.includes(value) ? value : DEFAULT_LANG;
}

export function mapCommonErrorMessage(rawMessage, t) {
  const msg = String(rawMessage || "").toLowerCase();
  if (!msg) return t("common.error");
  if (msg.includes("invalid credentials")) return t("auth.errors.invalidCredentials");
  if (msg.includes("user not found")) return t("common.error");
  if (msg.includes("already exists") || msg.includes("duplicate") || msg.includes("phone")) {
    return t("common.error");
  }
  if (msg.includes("dob is required") || msg.includes("missing dob")) return t("auth.errors.fillDob");
  if (
    msg.includes("failed to fetch") ||
    msg.includes("network") ||
    msg.includes("backend unavailable") ||
    msg.includes("timed out") ||
    msg.includes("request failed")
  ) {
    return t("common.error");
  }
  if (msg.includes("unauthorized")) return t("common.error");
  return rawMessage || t("common.error");
}
