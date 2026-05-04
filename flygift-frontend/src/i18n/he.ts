/**
 * Hebrew dictionary — single source of truth for all UI strings.
 *
 *  ⚠️ BRAND RULE: the product name "FlyGift" must remain in Latin
 *  characters everywhere in the UI. Never translate it to "פלאיי-גיפט"
 *  or "מתנת טיסה". The hero tagline below is a separate descriptor.
 */
export const t = {
    // App identity
    appName: "FlyGift",
    tagline: "מתנת הטיסה",

    // Sidebar / nav
    nav: {
        dashboard: "דאשבורד",
        myGifts: "המתנות שלי",
        sendGift: "שליחת מתנה",
        history: "היסטוריה",
        flights: "טיסות",
        hotels: "מלונות",
        settings: "הגדרות",
        travel: "נסיעות",
        redeem: "מימוש קוד",
        profile: "הפרופיל שלי",
        notifications: "התראות",
        search: "חיפוש",
        account: "חשבון",
        back: "חזרה",
        signOut: "התנתקות",
    },

    // Dashboard
    dashboard: {
        welcomeBack: "ברוך שובך",
        totalBalance: "יתרה כוללת",
        across: (n: number) => `מפוזרת על ${n} מתנות פעילות`,
        viewLedger: "צפייה בפנקס היומן",
        quickActions: "פעולות מהירות",
        sendGift: "שלח מתנה",
        redeem: "מימוש",
        flights: "טיסות",
        hotels: "מלונות",
        activeGifts: "מתנות פעילות",
        viewAll: "הצג הכול",
        recentActivity: "פעילות אחרונה",
    },

    // Notifications
    notifications: {
        title: "התראות",
        empty: "אין התראות חדשות",
        emptyHint: "כשיגיעו עדכונים על המתנות והטיסות שלך, נראה אותם כאן.",
        close: "סגור",
    },

    // Transaction history
    transactions: {
        income: "הכנסות",
        expenses: "הוצאות",
        balance: "מאזן",
        searchPlaceholder: "חיפוש לפי מספר, תיאור או אסמכתא",
        empty: "לא נמצאו תנועות תואמות לחיפוש.",
        immutableLedger: "לדג'ר בלתי משתנה · הרשומות אינן ניתנות לעריכה",
        balanceAfter: "יתרה",
        // Categorization chips
        categoryAll: "הכול",
        categoryReceived: "מתנות שהתקבלו",
        categorySent: "מתנות שנשלחו",
        categoryFlight: "הזמנות טיסה",
        categoryHotel: "הזמנות מלון",
        categoryOther: "אחר",
    },

    // Auth
    auth: {
        signIn: "התחברות",
        signUp: "הרשמה",
        username: "שם משתמש",
        password: "סיסמה",
        signInCta: "כניסה למערכת",
        signingIn: "מתחבר…",
        noAccount: "אין לך חשבון?",
        createAccount: "יצירת חשבון",
        invalidCredentials: "שם משתמש או סיסמה לא נכונים.",
        welcome: "ברוכים הבאים ל-FlyGift",
        welcomeSub: "התחבר כדי לראות את היתרה והמתנות שלך.",
    },

    // Redeem
    redeem: {
        title: "מימוש קוד מתנה",
        subtitle: "הזן את קוד המתנה שלך כדי להוסיף את הסכום ליתרה.",
        codeLabel: "קוד מתנה",
        codePlaceholder: "לדוגמה: FG-A1B2-C3D4",
        cta: "ממש עכשיו",
        loading: "מאמת קוד…",
        successTitle: "המימוש הושלם בהצלחה",
        successBody: (amount: string) => `${amount} נוספו ליתרת הנסיעות שלך.`,
        invalid: "הקוד אינו תקף או נוצל בעבר.",
    },

    // Profile
    profile: {
        title: "הפרופיל שלי",
        section: {
            account: "פרטי חשבון",
            security: "אבטחה",
            notifications: "העדפות התראות",
            language: "שפה ואזור",
        },
        fullName: "שם מלא",
        email: "דוא\"ל",
        phone: "מספר טלפון",
        changePassword: "שינוי סיסמה",
        twoFactor: "אימות דו-שלבי",
        save: "שמור שינויים",
        signOut: "התנתק מהחשבון",
    },

    // Flights wizard (search → results → checkout → ticket)
    flights: {
        kicker: "גילוי · השוואה · המראה",
        heroTitle: "לאן נטוס בפעם הבאה?",
        from: "מאיפה",
        to: "לאן",
        depart: "תאריך יציאה",
        returnDate: "תאריך חזרה",
        oneWay: "כיוון אחד",
        roundTrip: "הלוך וחזור",
        passengers: "נוסעים",
        cabin: "מחלקה",
        cabinOptions: {
            Economy: "תיירים",
            PremiumEconomy: "תיירים פלוס",
            Business: "עסקים",
            First: "ראשונה",
        } as Record<string, string>,
        searchCta: "חיפוש טיסות",
        searching: "סורקים את השמיים…",
        bestPrice: "מחיר משתלם",
        nonstop: "ללא עצירות",
        oneStop: "עצירה אחת",
        nStops: (n: number) => `${n} עצירות`,
        belowMarket: (pct: number) => `מתחת למחיר השוק (-${pct}%)`,
        median: "מחיר חציוני",
        errors: {
            required: "שדה חובה",
            sameAirports: "בחר יעד שונה ממוצא הטיסה",
        },
        // Checkout
        finalReview: "אישור אחרון",
        confirmTrip: "אישור הטיסה",
        outboundLeg: "טיסת הלוך",
        returnLeg: "טיסת חזור",
        // Round-trip step indicator
        step1Outbound: "שלב 1: בחירת טיסה הלוך",
        step2Return: "שלב 2: בחירת טיסה חזור",
        outboundSelectedShort: (route: string, time: string) =>
            `הלוך נבחר · ${route} · ${time}`,
        changeOutbound: "החלף טיסת הלוך",
        // Filters (results sidebar)
        filters: {
            title: "סינון תוצאות",
            reset: "איפוס",
            stops: "מספר עצירות",
            stop0: "ללא עצירות",
            stop1: "עצירה אחת",
            stop2plus: "2+ עצירות",
            airlines: "חברות תעופה",
            priceRange: "טווח מחירים",
            departureTime: "שעת המראה",
            morning: "בוקר (05:00–12:00)",
            afternoon: "צהריים (12:00–18:00)",
            evening: "ערב/לילה (18:00–05:00)",
            noMatches: "אין טיסות התואמות לסינון. נסה להרחיב את הקריטריונים.",
            resultsCount: (n: number) =>
                n === 1 ? "תוצאה אחת" : `${n} תוצאות`,
            openFilters: "פתח סינון",
            closeFilters: "סגור סינון",
            applied: (n: number) => `${n} פילטרים פעילים`,
        },
        // Passenger details step (Stage 24 — collect passport data)
        passengerStep: {
            kicker: "פרטי נוסע",
            title: "מי טס?",
            subtitle: "השם חייב להופיע בדיוק כפי שמופיע בדרכון.",
            firstName: "שם פרטי (אנגלית)",
            firstNameSample: "ISRAEL",
            lastName: "שם משפחה (אנגלית)",
            lastNameSample: "ISRAELI",
            passportNumber: "מספר דרכון",
            passportSample: "12345678",
            passportExpiry: "תוקף הדרכון",
            birthDate: "תאריך לידה",
            continueCta: "המשך לתשלום",
            backCta: "חזרה לבחירת טיסה",
            errors: {
                latinOnly: "יש להזין אותיות אנגליות בלבד",
                passportFormat: "מספר דרכון לא תקין",
                passportExpired: "הדרכון פג תוקף",
                passportSoonExpire:
                    "הדרכון יפוג תוקפו בתוך פחות מ-6 חודשים — מומלץ לחדש",
                birthDateFuture: "תאריך לידה לא תקין",
                tooYoung: "הנוסע חייב להיות בן שנתיים לפחות",
            },
        },
        passenger: "נוסע",
        fullNameAsPassport: "שם מלא (כפי שמופיע בדרכון)",
        nameSample: "ישראל ישראלי",
        payment: "תשלום",
        baseFare: "מחיר בסיס",
        taxesFees: "מסים ואגרות",
        total: "סך הכול",
        giftCardBalance: "יתרת מתנה",
        cardCharge: "חיוב כרטיס",
        cardNumber: "מספר כרטיס אשראי",
        cardHint: "לבדיקה: 4242… יצליח, 4000… יידחה.",
        fullyCovered: "כיסוי מלא מיתרת המתנה שלך.",
        invalidCard: "הכנס מספר כרטיס תקין",
        backCta: "חזרה",
        payAmount: (amount: string) => `שלם ${amount}`,
        issuingTicket: "מנפיקים את הכרטיס…",
        // Ticket
        ticketIssued: "הכרטיס הונפק",
        bookingNo: (id: number) => `הזמנה #${id} · אישור נשלח אליך`,
        boardingPass: "כרטיס עלייה למטוס",
        flight: "טיסה",
        gate: "שער",
        seat: "מושב",
        depart2: "המראה",
        status: "סטטוס",
        confirmed: "מאושר",
        paidFromBalance: "שולם מיתרת המתנה",
        paidFromCard: "כרטיס אשראי",
        remainingBalance: "יתרה נותרת",
        addToWallet: "הוסף ל-Wallet",
        searchAnother: "חיפוש טיסה נוספת",
        downloadTicket: "הורדת הכרטיס (PDF)",
        // Passenger summary in checkout (read-only)
        passengerLabel: "נוסע",
        passportLabel: "דרכון",
        editPassenger: "ערוך פרטי נוסע",
    },

    // Travel hub / My Trips
    trips: {
        kicker: "מרכז הנסיעות",
        title: "הנסיעות שלי",
        availableBalance: "יתרה זמינה",
        across: (n: number) => `מפוזרת על ${n} מתנות פעילות`,
        premium: "פרימיום",
        upcomingPastSummary: (u: number, p: number) =>
            `${u} עתידיות · ${p} עברו`,
        tabs: {
            upcoming: (n: number) => `עתידיות (${n})`,
            past: (n: number) => `עברו (${n})`,
            ledger: "פנקס יומן",
        },
        searchPlaceholder: "חיפוש לפי מספר הזמנה או יעד",
        empty: (tab: "upcoming" | "past") =>
            tab === "upcoming"
                ? "אין נסיעות עתידיות התואמות לחיפוש."
                : "אין נסיעות עבר התואמות לחיפוש.",
    },

    // Billing (B2B)
    billing: {
        kicker: "חיוב",
        title: "חשבוניות וקבלות",
        subtitle: "חשבונית אחת לכל הפצה. לחץ להורדת קבלת PDF.",
        totalInvoiced: "סך החיוב",
        pending: "בהמתנה",
        failed: "נכשל",
        columns: {
            invoice: "חשבונית",
            batch: "אצווה",
            recipients: "נמענים",
            amount: "סכום",
            status: "סטטוס",
            action: "פעולה",
        },
        statuses: {
            Pending: "בהמתנה",
            Invoiced: "הונפקה",
            Failed: "נכשל",
        } as Record<string, string>,
        awaitingIssuance: "ממתין להנפקה…",
        queued: "בתור",
        issuedOn: (d: string) => `· הונפקה ב-${d}`,
    },

    // Share to Story (Instagram / Facebook)
    share: {
        cta: "שתף את השמחה",
        generatingTitle: "יוצרים את הסטורי שלך…",
        generatingHint: "מציירים פוסטר 9:16 פרימיום",
        save: "שמור",
        postToStory: "פרסם לסטורי",
        sent: "נשלח!",
        platforms: "Instagram · Facebook · או שמירה כתמונה",
        closePreview: "סגור תצוגה מקדימה",
        altPoster: "פוסטר ה-FlyGift Story שלך",
        defaultGiftFromCompany: (company: string) => `מתנה מ-${company}`,
    },

    // Hotels
    hotels: {
        kicker: "לינה · גילוי · הרפתקה",
        title: "מצא את המלון המושלם",
        subtitle: "מאות מלונות מובילים. שלם מהיתרה שלך, השלם בכרטיס.",
        cityLabel: "יעד / עיר",
        cityPlaceholder: "תל אביב, פריז, רומא…",
        checkInLabel: "צ'ק-אין",
        checkOutLabel: "צ'ק-אאוט",
        guestsLabel: "אורחים",
        searchCta: "חיפוש מלונות",
        searching: "מחפשים את המלונות הטובים ביותר…",
        noResults: "לא נמצאו מלונות התואמים את היתרה שלך לטווח התאריכים שנבחר.",
        affordable: "תואם ליתרה",
        partial: "כיסוי חלקי",
        nights: (n: number) => `${n} לילות`,
        perNight: "ללילה",
        from: "החל מ-",
        rating: "דירוג",
        reviews: (n: number) => `${n.toLocaleString("he-IL")} ביקורות`,
        amenities: "שירותים",
        bookCta: "הזמן עכשיו",
        bookingTitle: "אישור הזמנת מלון",
        bookingFor: (city: string, nights: number) =>
            `${city} · ${nights} לילות`,
        guestName: "שם האורח הראשי",
        confirmAndPay: (amount: string) => `אישור ותשלום ${amount}`,
        booking: "מבצעים את ההזמנה…",
        bookingSuccess: "ההזמנה אושרה!",
        bookingRef: (ref: string) => `מספר אישור: ${ref}`,
    },

    // Common
    landing: {
        nav: {
            login: "התחברות",
            getStarted: "צא לדרך",
            features: "התכונות",
            search: "חיפוש",
            giftCard: "המתנה",
        },
        hero: {
            badge: "המתנה שמתחילה בשחקים",
            titleLine1: "שלחו את",
            titleHighlight: "החוויה",
            titleLine2: "לא רק את הכרטיס",
            subtitle:
                "FlyGift הופכת רגע אחד לזיכרון בלתי נשכח — מתנת טיסה דיגיטלית, בכרטיס אישי שאהוביכם יממשו לטיסות ולמלונות מהיוקרתיים בעולם.",
            ctaPrimary: "פתחו חשבון בחינם",
            ctaSecondary: "כבר רשום? התחברות",
            scrollHint: "גללו לחקור",
        },
        story1: {
            kicker: "פרק 01 · החזון",
            title: "המתנה שמתחילה בשחקים",
            body:
                "כל מתנה היא הזמנה להרפתקה. בחרו יעד, סכום ועיצוב — אנחנו דואגים לטיסה ולמלון, ואהוביכם בוחרים מתי להמריא.",
            bullets: [
                "כיסוי מלא לטיסה ולמלון בתשלום אחד",
                "תאריך תפוגה גמיש — לוקחים את הזמן לבחור",
                "מסירה דיגיטלית מיידית — בלי משלוחים, בלי ניירת",
            ],
        },
        story2: {
            kicker: "פרק 02 · החיפוש",
            title: "חיפוש ללא גבולות",
            body:
                "התחילו לחלום עכשיו. בחרו טיסה או מלון, ראו תוצאות אמיתיות במחירי שוק — ובחרו אם להזמין כעת או לשלוח כמתנה.",
            tabFlights: "טיסות",
            tabHotels: "מלונות",
            from: "מאיפה",
            to: "לאן",
            depart: "תאריך יציאה",
            returnDate: "תאריך חזרה",
            oneWay: "כיוון אחד",
            roundTrip: "הלוך וחזור",
            city: "עיר היעד",
            checkIn: "צ'ק-אין",
            checkOut: "צ'ק-אאוט",
            search: "חפשו עכשיו",
            previewBadge: "תצוגה מקדימה",
            book: "הזמנה",
            loginToBook: "התחברו כדי להזמין",
            previewResults: "תוצאות לדוגמה — להזמנה מלאה התחברו",
            from$: "החל מ־",
            perNight: "ללילה",
        },
        story3: {
            kicker: "פרק 03 · הכרטיס",
            title: "הכרטיס האישי שלך",
            body:
                "כרטיס מתנה תלת-ממדי, עם זוהר הולוגרפי וגרדיאנט אישי. סובבו, גלו זוויות, ראו את ההפתעה שתגיע לאהובכם.",
            tip: "הזיזו עם העכבר כדי לסובב",
            cta: "צרו את הכרטיס שלכם",
        },
        finale: {
            kicker: "מוכנים להמריא?",
            title: "הצטרפו ל־FlyGift היום",
            body:
                "פתחו חשבון בחינם, טענו יתרה ושלחו את המתנה הראשונה תוך פחות מדקה.",
            ctaPrimary: "פתיחת חשבון",
            ctaSecondary: "כניסה לחשבון",
        },
        footer: {
            tagline: "מתנת הטיסה",
            rights: "כל הזכויות שמורות",
        },
    },

    common: {
        loading: "טוען…",
        error: "אירעה שגיאה. נסה שוב.",
        retry: "נסה שוב",
        cancel: "ביטול",
        confirm: "אישור",
        close: "סגור",
        done: "סיום",
        save: "שמור",
        continue: "המשך",
        dismiss: "סגור",
        edit: "עריכה",
        results: "תוצאות",
        passengersShort: (n: number) => `${n} נוסעים`,
        searchFailed: "החיפוש נכשל. נסה שוב.",
        bookingFailed: "ההזמנה נכשלה. נסה שוב.",
        dbError: "שגיאה בהתחברות למסד הנתונים",
        searching: "מחפש…",
        noResults: "לא נמצאו תוצאות",
        backToDashboard: "חזרה ללוח הבקרה",
        notFoundTitle: "המתנה לא נמצאה",
        notFoundDescription:
            "לא הצלחנו למצוא כרטיס מתנה עם המזהה הזה. ייתכן שהוא הוסר או שהקישור אינו תקין.",
        pageNotFoundTitle: "העמוד לא נמצא",
        pageNotFoundDescription:
            "הדף שחיפשת לא קיים או הוסר. בוא נחזור למסלול.",
    },
} as const;

export type Dictionary = typeof t;
