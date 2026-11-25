/**
 * Customer-service and legal pages (/info/[slug]). Content lives here rather than in messages/*.json because
 * it is long-form text, not UI labels. Company details come from config/company.ts (placeholders while the shop
 * is a portfolio project). See docs/legal-compliance.md for which rule each page covers.
 */
import {COMPANY, WITHDRAWAL_PERIOD_DAYS} from '@/config/company';

export const INFO_PAGE_SLUGS = [
    'verzending',
    'retourneren',
    'herroepingsrecht',
    'garantie',
    'algemene-voorwaarden',
    'privacybeleid',
    'contact',
    'recycling',
] as const;

export type InfoPageSlug = (typeof INFO_PAGE_SLUGS)[number];

export interface InfoSection {
    heading: string;
    paragraphs: string[];
}

export interface InfoPage {
    title: string;
    intro: string;
    sections: InfoSection[];
}

type LocalizedPages = Record<InfoPageSlug, InfoPage>;

const C = COMPANY;
const DAYS = WITHDRAWAL_PERIOD_DAYS;
const companyLine = `${C.name}, ${C.address}. KVK ${C.kvkNumber}, btw-nummer ${C.btwNumber}. E-mail: ${C.email}, telefoon: ${C.phone}.`;
const companyLineEn = `${C.name}, ${C.address}. Chamber of Commerce (KVK) ${C.kvkNumber}, VAT number ${C.btwNumber}. Email: ${C.email}, phone: ${C.phone}.`;

const nl: LocalizedPages = {
    verzending: {
        title: 'Verzending en levering',
        intro: 'We verzenden alle bestellingen met PostNL binnen Nederland.',
        sections: [
            {
                heading: 'Levertijd',
                paragraphs: [
                    'Op werkdagen voor 17:00 besteld en betaald? Dan verzenden we dezelfde dag en is je bestelling meestal de volgende werkdag in huis.',
                    'Uiterlijk leveren we binnen 30 dagen. Lukt dat niet, dan laten we het je weten en mag je de bestelling kosteloos ontbinden; je krijgt dan direct je geld terug.',
                    'Zodra je pakket onderweg is, ontvang je een e-mail met de track-and-tracecode.',
                ],
            },
            {
                heading: 'Verzendkosten',
                paragraphs: ['Verzending binnen Nederland kost € 4,95 per bestelling. De verzendkosten zie je in de winkelwagen en bij het afrekenen, voordat je bestelt.'],
            },
            {
                heading: 'Niet thuis?',
                paragraphs: [
                    'PostNL probeert het pakket bij de buren af te geven of brengt het naar een PostNL-punt in de buurt. Je krijgt daarover bericht van PostNL.',
                ],
            },
        ],
    },
    retourneren: {
        title: 'Retourneren',
        intro: `Niet tevreden? Binnen ${DAYS} dagen na ontvangst kun je je bestelling zonder opgaaf van reden retourneren.`,
        sections: [
            {
                heading: 'Zo werkt het',
                paragraphs: [
                    'Meld je retour aan via het retourformulier met je bestelnummer en e-mailadres. Je ontvangt direct een bevestiging per e-mail.',
                    'Binnen twee werkdagen sturen we je het retouradres en verdere instructies. Daarna heb je nog 14 dagen om het product terug te sturen.',
                    'Stuur de laptop goed verpakt terug, met de meegeleverde accessoires. Zet je eigen gegevens eerst veilig en reset de laptop naar de fabrieksinstellingen.',
                ],
            },
            {
                heading: 'Kosten van het terugsturen',
                paragraphs: [
                    'Bij gebruik van je bedenktijd betaal je zelf de kosten van het terugsturen (bij PostNL ongeveer € 7 tot € 14, afhankelijk van het formaat).',
                    'Is het product defect of heb je een verkeerd artikel ontvangen? Dan betalen wij het terugsturen en sturen we je een gratis retourlabel.',
                ],
            },
            {
                heading: 'Terugbetaling',
                paragraphs: [
                    `We betalen het aankoopbedrag, inclusief de oorspronkelijke verzendkosten, binnen ${DAYS} dagen na je herroeping terug via de betaalmethode die je gebruikte. We mogen wachten tot we het product hebben ontvangen of je hebt aangetoond dat je het hebt teruggestuurd.`,
                    'Heb je met in3 betaald? Dan verwerkt in3 de terugbetaling en worden je resterende termijnen aangepast of vervallen ze.',
                ],
            },
        ],
    },
    herroepingsrecht: {
        title: 'Herroepingsrecht',
        intro: `Als consument heb je het recht om binnen ${DAYS} dagen zonder opgave van redenen de overeenkomst te herroepen.`,
        sections: [
            {
                heading: 'Bedenktijd',
                paragraphs: [
                    `De herroepingstermijn verstrijkt ${DAYS} dagen na de dag waarop jij, of een door jou aangewezen derde die niet de vervoerder is, het product fysiek in bezit krijgt. Bestel je meerdere producten die apart worden geleverd, dan gaat de termijn in op de dag dat je het laatste product ontvangt.`,
                    'Om het herroepingsrecht uit te oefenen, laat je ons dit vóór het einde van de termijn ondubbelzinnig weten, bijvoorbeeld via het retourformulier, per e-mail of met het modelformulier hieronder. Je bent niet verplicht het modelformulier te gebruiken.',
                ],
            },
            {
                heading: 'Gevolgen van de herroeping',
                paragraphs: [
                    `We betalen alle betalingen die we van je hebben ontvangen, inclusief de standaard leveringskosten, uiterlijk ${DAYS} dagen na ontvangst van je herroeping terug, met hetzelfde betaalmiddel. We mogen wachten met terugbetalen tot we het product hebben ontvangen of je hebt aangetoond dat je het hebt teruggestuurd.`,
                    `Je stuurt het product uiterlijk ${DAYS} dagen na je herroeping terug. De directe kosten van het terugsturen zijn voor jouw rekening.`,
                    'Je bent alleen aansprakelijk voor waardevermindering die het gevolg is van een behandeling die verder gaat dan nodig is om de aard, de kenmerken en de werking van het product vast te stellen.',
                ],
            },
            {
                heading: 'Modelformulier voor herroeping',
                paragraphs: [
                    `Aan: ${C.name}, ${C.address}, ${C.email}`,
                    'Ik deel u hierbij mede dat ik onze overeenkomst betreffende de verkoop van de volgende producten herroep: [product]',
                    'Besteld op / ontvangen op: [datum] — Bestelnummer: [bestelnummer]',
                    'Naam en adres consument: [naam, adres]',
                    'Datum: [datum] — Handtekening (alleen bij papieren formulier)',
                ],
            },
        ],
    },
    garantie: {
        title: 'Garantie',
        intro: 'Op al onze refurbished laptops krijg je 12 maanden garantie van Laptopic, bovenop je wettelijke rechten.',
        sections: [
            {
                heading: 'Wettelijke garantie (conformiteit)',
                paragraphs: [
                    'Een product moet doen wat je er bij normaal gebruik redelijkerwijs van mag verwachten, rekening houdend met het feit dat het om een gebruikt (refurbished) product gaat. Dat recht heb je altijd, ook na afloop van onze extra garantie. Onze garantie beperkt je wettelijke rechten niet.',
                ],
            },
            {
                heading: 'Onze garantie: wat valt eronder',
                paragraphs: [
                    'Defecten aan hardware die niet door de gebruiker zijn veroorzaakt, zoals een defect moederbord, scherm, toetsenbord of opslag.',
                    'De accu valt 6 maanden onder onze garantie; normale slijtage van de accu daarna niet. Dit doet niets af aan je wettelijke rechten.',
                ],
            },
            {
                heading: 'Wat valt er niet onder',
                paragraphs: [
                    'Val- en vochtschade, schade door verkeerd gebruik, en software die je zelf hebt geïnstalleerd.',
                ],
            },
            {
                heading: 'Een garantieclaim melden',
                paragraphs: [`Mail ${C.email} met je bestelnummer en een korte omschrijving van het probleem. We reageren binnen twee werkdagen.`],
            },
        ],
    },
    'algemene-voorwaarden': {
        title: 'Algemene voorwaarden',
        intro: 'Deze voorwaarden gelden voor alle aanbiedingen van en bestellingen bij Laptopic. Let op: dit is een portfolioproject. Er worden geen echte producten verkocht en geen echte betalingen verwerkt.',
        sections: [
            {heading: '1. Wie zijn wij', paragraphs: [companyLine]},
            {
                heading: '2. Aanbod',
                paragraphs: [
                    'Alle producten zijn refurbished (gebruikt en opgeknapt). De conditie staat bij elk product. Afbeeldingen zijn voorbeeldafbeeldingen; kennelijke vergissingen of fouten in het aanbod binden ons niet.',
                ],
            },
            {
                heading: '3. Totstandkoming van de overeenkomst',
                paragraphs: [
                    'De overeenkomst komt tot stand wanneer je op "Bestellen en betalen" klikt en de betaling is gelukt. Je ontvangt direct een orderbevestiging per e-mail, met deze voorwaarden, informatie over je herroepingsrecht en het modelformulier.',
                ],
            },
            {
                heading: '4. Prijzen',
                paragraphs: [
                    'Alle prijzen zijn in euro’s en inclusief btw. Verzendkosten worden getoond voordat je bestelt. Er zijn geen andere kosten.',
                ],
            },
            {
                heading: '5. Betaling',
                paragraphs: [
                    'Je betaalt via Mollie met iDEAL of, als je bestelling daarvoor in aanmerking komt, met in3 in drie termijnen. Bij in3 sluit je een overeenkomst met in3; in3 kan een kredietcheck uitvoeren. Voor betalen met in3 rekenen wij geen extra kosten.',
                ],
            },
            {
                heading: '6. Levering',
                paragraphs: ['We leveren in Nederland, uiterlijk binnen 30 dagen. Zie Verzending en levering.'],
            },
            {
                heading: '7. Herroepingsrecht',
                paragraphs: [`Je hebt ${DAYS} dagen bedenktijd. Zie Herroepingsrecht en Retourneren voor de voorwaarden, de kosten van het terugsturen en het modelformulier.`],
            },
            {
                heading: '8. Garantie en conformiteit',
                paragraphs: ['Je hebt altijd recht op een product dat voldoet aan de overeenkomst. Daarnaast geven wij 12 maanden garantie. Zie Garantie.'],
            },
            {
                heading: '9. Klachten',
                paragraphs: [
                    `Klachten kun je mailen naar ${C.email}. We bevestigen je klacht binnen 2 werkdagen en geven binnen 14 dagen een inhoudelijke reactie.`,
                    'Komen we er samen niet uit, dan kun je het geschil voorleggen aan de bevoegde rechter.',
                ],
            },
            {
                heading: '10. Privacy',
                paragraphs: ['Hoe we met je gegevens omgaan, staat in ons Privacybeleid.'],
            },
            {
                heading: '11. Toepasselijk recht',
                paragraphs: ['Op deze voorwaarden en alle overeenkomsten is Nederlands recht van toepassing. Dwingende consumentenbescherming uit je eigen land blijft gelden.'],
            },
        ],
    },
    privacybeleid: {
        title: 'Privacybeleid en cookies',
        intro: `${C.name} verwerkt persoonsgegevens om je bestelling af te handelen. In dit privacybeleid lees je welke gegevens, waarom, met wie we ze delen en welke rechten je hebt.`,
        sections: [
            {heading: 'Wie is verantwoordelijk', paragraphs: [`Verwerkingsverantwoordelijke is ${companyLine}`]},
            {
                heading: 'Welke gegevens en waarom',
                paragraphs: [
                    'Bestellen: naam, e-mailadres, telefoonnummer, bezorg- en factuuradres en je bestelgegevens. We gebruiken die om je bestelling te leveren, je te informeren over de status en voor klantenservice. Grondslag: uitvoering van de overeenkomst.',
                    'Account (optioneel): daarnaast je wachtwoord (versleuteld opgeslagen) en opgeslagen adressen. Grondslag: uitvoering van de overeenkomst.',
                    'Retouren en klachten: je bericht en bestelgegevens. Grondslag: uitvoering van de overeenkomst en wettelijke plicht.',
                    'Administratie: bestel- en betaalgegevens bewaren we omdat de wet dat verplicht (fiscale bewaarplicht).',
                    'We sturen geen nieuwsbrieven of reclame en maken geen profielen.',
                ],
            },
            {
                heading: 'Met wie delen we gegevens',
                paragraphs: [
                    'Mollie (betalingen) en in3 (als je in3 kiest; in3 kan een kredietcheck doen), PostNL (bezorging), onze hostingpartij en e-mailprovider (verwerkers die alleen in onze opdracht werken). We verkopen je gegevens nooit.',
                ],
            },
            {
                heading: 'Hoe lang bewaren we gegevens',
                paragraphs: [
                    'Bestel- en factuurgegevens: 7 jaar (wettelijke bewaarplicht). Account: tot je het laat verwijderen. Retour- en klachtberichten: 2 jaar na afhandeling.',
                ],
            },
            {
                heading: 'Cookies',
                paragraphs: [
                    'We gebruiken alleen functionele cookies die nodig zijn om de webshop te laten werken. Daarvoor is geen toestemming nodig. We gebruiken geen analytische, tracking- of advertentiecookies.',
                    'vendure-auth-token: houdt je winkelwagen en inlogsessie bij. NEXT_LOCALE: onthoudt je taalkeuze. vendure-currency: onthoudt een valutakeuze (alleen als je die maakt). De keuze voor licht of donker thema wordt alleen in je eigen browser bewaard (localStorage).',
                    'Bij het afrekenen worden de logo’s van betaalmethoden van de servers van Mollie geladen; daarbij ziet Mollie je IP-adres.',
                ],
            },
            {
                heading: 'Beveiliging',
                paragraphs: ['De webshop gebruikt een versleutelde verbinding (HTTPS). Wachtwoorden worden versleuteld opgeslagen. Betaalgegevens komen nooit bij ons binnen, die verwerkt Mollie.'],
            },
            {
                heading: 'Jouw rechten',
                paragraphs: [
                    `Je mag je gegevens inzien, laten verbeteren of verwijderen, bezwaar maken, de verwerking laten beperken en je gegevens laten overdragen. Mail daarvoor naar ${C.email}; we reageren binnen een maand. Gegevens die we wettelijk moeten bewaren, kunnen we pas na afloop van die termijn verwijderen.`,
                    'Ben je het niet eens met hoe we met je gegevens omgaan? Dan kun je een klacht indienen bij de Autoriteit Persoonsgegevens.',
                ],
            },
        ],
    },
    contact: {
        title: 'Contact en bedrijfsgegevens',
        intro: 'Vragen over een bestelling, retour of garantie? We helpen je graag.',
        sections: [
            {
                heading: 'Bereikbaarheid',
                paragraphs: [`E-mail: ${C.email} — we reageren binnen twee werkdagen.`, `Telefoon: ${C.phone} (werkdagen 9:00–17:00).`],
            },
            {
                heading: 'Bedrijfsgegevens',
                paragraphs: [
                    `${C.name} (${C.legalForm})`,
                    `Adres: ${C.address}`,
                    `KVK-nummer: ${C.kvkNumber}`,
                    `Btw-nummer: ${C.btwNumber}`,
                    'Let op: dit is een portfolioproject. Bovenstaande gegevens zijn voorbeelden.',
                ],
            },
            {
                heading: 'Klachten',
                paragraphs: [`Mail je klacht naar ${C.email}. We bevestigen binnen 2 werkdagen en reageren inhoudelijk binnen 14 dagen.`],
            },
        ],
    },
    recycling: {
        title: 'Oude apparaten en batterijen inleveren',
        intro: 'Elektrische apparaten en batterijen horen niet bij het restafval.',
        sections: [
            {
                heading: 'Oud voor nieuw',
                paragraphs: [
                    `Koop je bij ons een laptop, dan mag je een oude laptop gratis bij ons inleveren. Mail ${C.email} met je bestelnummer; we sturen je een gratis verzendlabel.`,
                ],
            },
            {
                heading: 'Andere inleverpunten',
                paragraphs: [
                    'Je kunt oude elektrische apparaten ook gratis inleveren bij de gemeentelijke milieustraat. Kleine apparaten en batterijen kun je ook kwijt bij grotere elektronicawinkels en supermarkten.',
                ],
            },
        ],
    },
};

const en: LocalizedPages = {
    verzending: {
        title: 'Shipping and delivery',
        intro: 'We ship all orders with PostNL within the Netherlands.',
        sections: [
            {
                heading: 'Delivery time',
                paragraphs: [
                    'Ordered and paid on a working day before 17:00? We ship the same day and your order usually arrives the next working day.',
                    'We deliver within 30 days at the latest. If we can’t, we let you know and you may cancel the order free of charge with an immediate refund.',
                ],
            },
            {heading: 'Shipping costs', paragraphs: ['Shipping within the Netherlands costs € 4.95 per order, shown before you order.']},
        ],
    },
    retourneren: {
        title: 'Returns',
        intro: `Not satisfied? You can return your order within ${DAYS} days of receiving it, without giving a reason.`,
        sections: [
            {
                heading: 'How it works',
                paragraphs: [
                    'Request a return with the return form, using your order number and email address. You will receive a confirmation by email straight away.',
                    'Within two working days we send you the return address and instructions.',
                ],
            },
            {
                heading: 'Return shipping costs',
                paragraphs: [
                    'When you use your cooling-off period, you pay the cost of sending the product back. If the product is defective or you received the wrong item, we pay and send you a free return label.',
                ],
            },
            {
                heading: 'Refund',
                paragraphs: [
                    `We refund the purchase price including the original shipping costs within ${DAYS} days, using your original payment method. We may wait until we have received the product back. For in3 payments, in3 processes the refund.`,
                ],
            },
        ],
    },
    herroepingsrecht: {
        title: 'Right of withdrawal',
        intro: `As a consumer you have the right to withdraw from the contract within ${DAYS} days without giving any reason.`,
        sections: [
            {
                heading: 'Cooling-off period',
                paragraphs: [
                    `The withdrawal period expires ${DAYS} days after the day on which you, or a third party other than the carrier indicated by you, acquire physical possession of the product.`,
                    'To exercise the right of withdrawal, inform us of your decision by an unequivocal statement before the period expires, for example via the return form, by email, or with the model form below.',
                ],
            },
            {
                heading: 'Effects of withdrawal',
                paragraphs: [
                    `We reimburse all payments received from you, including standard delivery costs, no later than ${DAYS} days after receiving your withdrawal. We may withhold reimbursement until we have received the product back. You bear the direct cost of returning the product.`,
                ],
            },
            {
                heading: 'Model withdrawal form',
                paragraphs: [
                    `To: ${C.name}, ${C.address}, ${C.email}`,
                    'I hereby give notice that I withdraw from my contract for the sale of the following goods: [product]',
                    'Ordered on / received on: [date] — Order number: [number]',
                    'Name and address of consumer: [name, address]',
                    'Date: [date] — Signature (only if this form is notified on paper)',
                ],
            },
        ],
    },
    garantie: {
        title: 'Warranty',
        intro: 'All our refurbished laptops come with a 12-month warranty from Laptopic, on top of your statutory rights.',
        sections: [
            {
                heading: 'Statutory rights',
                paragraphs: ['A product must do what you can reasonably expect, taking into account that it is used (refurbished). Our warranty never limits these rights.'],
            },
            {
                heading: 'What our warranty covers',
                paragraphs: ['Hardware defects not caused by the user. The battery is covered for 6 months.'],
            },
        ],
    },
    'algemene-voorwaarden': {
        title: 'Terms and conditions',
        intro: 'These terms apply to all orders at Laptopic. Note: this is a portfolio project; no real products are sold and no real payments are processed. The Dutch version prevails.',
        sections: [
            {heading: 'Who we are', paragraphs: [companyLineEn]},
            {
                heading: 'Contract, prices and payment',
                paragraphs: [
                    'The contract is formed when you click "Order and pay" and the payment succeeds. All prices are in euros and include VAT; shipping costs are shown before you order. You pay via Mollie with iDEAL or, when eligible, with in3 in three installments, without extra costs from us.',
                ],
            },
            {
                heading: 'Delivery, withdrawal, warranty, complaints',
                paragraphs: [
                    `We deliver in the Netherlands within 30 days. You have a ${DAYS}-day cooling-off period. See the Shipping, Returns, Right of withdrawal and Warranty pages. Complaints: ${C.email}; we respond within 14 days.`,
                    'Dutch law applies, without prejudice to mandatory consumer protection in your country of residence.',
                ],
            },
        ],
    },
    privacybeleid: {
        title: 'Privacy policy and cookies',
        intro: `${C.name} processes personal data to handle your order. This policy explains what we collect, why, who we share it with and your rights. The Dutch version prevails.`,
        sections: [
            {heading: 'Controller', paragraphs: [companyLineEn]},
            {
                heading: 'What and why',
                paragraphs: [
                    'Name, email address, phone number, delivery and billing address and order details, to deliver your order and provide customer service (performance of the contract). Order records are kept for 7 years because Dutch tax law requires it. No newsletters, advertising or profiling.',
                ],
            },
            {
                heading: 'Who we share it with',
                paragraphs: ['Mollie (payments), in3 (if you choose in3; it may run a credit check), PostNL (delivery), our hosting and email providers. We never sell your data.'],
            },
            {
                heading: 'Cookies',
                paragraphs: [
                    'Only functional cookies, which need no consent: vendure-auth-token (cart and login session), NEXT_LOCALE (language), vendure-currency (only if you choose a currency). No analytics, tracking or advertising cookies.',
                ],
            },
            {
                heading: 'Your rights',
                paragraphs: [`You may access, correct, delete, restrict or port your data and object to processing: email ${C.email}. You may complain to the Dutch Data Protection Authority (Autoriteit Persoonsgegevens).`],
            },
        ],
    },
    contact: {
        title: 'Contact and company details',
        intro: 'Questions about an order, return or warranty? We are happy to help.',
        sections: [
            {heading: 'Contact', paragraphs: [`Email: ${C.email} (reply within two working days). Phone: ${C.phone} (working days 9:00–17:00).`]},
            {heading: 'Company details', paragraphs: [companyLineEn, 'Note: this is a portfolio project; these details are examples.']},
        ],
    },
    recycling: {
        title: 'Returning old devices and batteries',
        intro: 'Electrical devices and batteries don’t belong in household waste.',
        sections: [
            {
                heading: 'Old for new',
                paragraphs: [`When you buy a laptop from us, you can return an old laptop free of charge: email ${C.email} with your order number for a free shipping label.`],
            },
            {
                heading: 'Other collection points',
                paragraphs: ['Municipal recycling centres accept old electrical devices for free; larger electronics shops and supermarkets accept small devices and batteries.'],
            },
        ],
    },
};

const pages: Record<string, LocalizedPages> = {nl, en};

export function isInfoPageSlug(slug: string): slug is InfoPageSlug {
    return (INFO_PAGE_SLUGS as readonly string[]).includes(slug);
}

export function getInfoPage(locale: string, slug: InfoPageSlug): InfoPage {
    return (pages[locale] ?? nl)[slug];
}
