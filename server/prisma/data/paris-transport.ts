import type { TransportType } from "@prisma/client";

// ── Types ──────────────────────────────────────────────────────────────

export interface LineData {
  code: string;
  name: string;
  transportType: TransportType;
  color: string;
  textColor: string;
}

export interface StationData {
  name: string;
  slug: string;
  latitude: number;
  longitude: number;
  isAccessible: boolean;
  municipality?: string;
}

export interface LineStopSequence {
  lineCode: string;
  stops: Array<{ stationSlug: string; travelTimeToNext: number | null }>;
}

export interface ConnectionPair {
  lineCodeA: string;
  stationSlugA: string;
  lineCodeB: string;
  stationSlugB: string;
  walkingTime: number; // seconds
}

// ── Lines (22) ─────────────────────────────────────────────────────────

export const lines: LineData[] = [
  // Metro
  { code: "M1",  name: "Métro 1",  transportType: "METRO", color: "#FFCD00", textColor: "#000000" },
  { code: "M2",  name: "Métro 2",  transportType: "METRO", color: "#003CA6", textColor: "#FFFFFF" },
  { code: "M3",  name: "Métro 3",  transportType: "METRO", color: "#837902", textColor: "#FFFFFF" },
  { code: "M4",  name: "Métro 4",  transportType: "METRO", color: "#CF009E", textColor: "#FFFFFF" },
  { code: "M5",  name: "Métro 5",  transportType: "METRO", color: "#FF7E2E", textColor: "#000000" },
  { code: "M6",  name: "Métro 6",  transportType: "METRO", color: "#6ECA97", textColor: "#000000" },
  { code: "M7",  name: "Métro 7",  transportType: "METRO", color: "#FA9ABA", textColor: "#000000" },
  { code: "M8",  name: "Métro 8",  transportType: "METRO", color: "#E19BDF", textColor: "#000000" },
  { code: "M9",  name: "Métro 9",  transportType: "METRO", color: "#B6BD00", textColor: "#000000" },
  { code: "M10", name: "Métro 10", transportType: "METRO", color: "#C9910D", textColor: "#000000" },
  { code: "M11", name: "Métro 11", transportType: "METRO", color: "#704B1C", textColor: "#FFFFFF" },
  { code: "M12", name: "Métro 12", transportType: "METRO", color: "#007852", textColor: "#FFFFFF" },
  { code: "M13", name: "Métro 13", transportType: "METRO", color: "#6EC4E8", textColor: "#000000" },
  { code: "M14", name: "Métro 14", transportType: "METRO", color: "#62259D", textColor: "#FFFFFF" },
  // RER
  { code: "RER-A", name: "RER A", transportType: "RER", color: "#E3051C", textColor: "#FFFFFF" },
  { code: "RER-B", name: "RER B", transportType: "RER", color: "#5291CE", textColor: "#FFFFFF" },
  { code: "RER-C", name: "RER C", transportType: "RER", color: "#FFCD00", textColor: "#000000" },
  { code: "RER-D", name: "RER D", transportType: "RER", color: "#00814F", textColor: "#FFFFFF" },
  { code: "RER-E", name: "RER E", transportType: "RER", color: "#CF76C8", textColor: "#FFFFFF" },
  // Tram
  { code: "T1",  name: "Tram T1",  transportType: "TRAM", color: "#006DB8", textColor: "#FFFFFF" },
  { code: "T2",  name: "Tram T2",  transportType: "TRAM", color: "#CF009E", textColor: "#FFFFFF" },
  { code: "T3A", name: "Tram T3a", transportType: "TRAM", color: "#FF7E2E", textColor: "#000000" },
];

// ── Stations (~118) ────────────────────────────────────────────────────

export const stations: StationData[] = [
  // ─ Major interchanges & M1 ─
  { name: "La Défense",                    slug: "la-defense",                     latitude: 48.8920, longitude: 2.2360, isAccessible: true,  municipality: "Puteaux" },
  { name: "Porte Maillot",                 slug: "porte-maillot",                  latitude: 48.8781, longitude: 2.2822, isAccessible: true  },
  { name: "Charles de Gaulle — Étoile",    slug: "charles-de-gaulle-etoile",       latitude: 48.8738, longitude: 2.2950, isAccessible: true  },
  { name: "Franklin D. Roosevelt",         slug: "franklin-d-roosevelt",           latitude: 48.8689, longitude: 2.3095, isAccessible: true  },
  { name: "Concorde",                      slug: "concorde",                       latitude: 48.8656, longitude: 2.3213, isAccessible: true  },
  { name: "Louvre — Rivoli",               slug: "louvre-rivoli",                  latitude: 48.8607, longitude: 2.3406, isAccessible: true  },
  { name: "Châtelet",                      slug: "chatelet",                       latitude: 48.8584, longitude: 2.3470, isAccessible: true  },
  { name: "Hôtel de Ville",                slug: "hotel-de-ville",                 latitude: 48.8572, longitude: 2.3514, isAccessible: true  },
  { name: "Bastille",                      slug: "bastille",                       latitude: 48.8531, longitude: 2.3691, isAccessible: true  },
  { name: "Gare de Lyon",                  slug: "gare-de-lyon",                   latitude: 48.8448, longitude: 2.3735, isAccessible: true  },
  { name: "Nation",                        slug: "nation",                         latitude: 48.8485, longitude: 2.3960, isAccessible: true  },
  { name: "Château de Vincennes",          slug: "chateau-de-vincennes",           latitude: 48.8442, longitude: 2.4406, isAccessible: true,  municipality: "Vincennes" },

  // ─ M2 extras ─
  { name: "Porte Dauphine",                slug: "porte-dauphine",                 latitude: 48.8716, longitude: 2.2773, isAccessible: false },
  { name: "Place de Clichy",               slug: "place-de-clichy",                latitude: 48.8837, longitude: 2.3274, isAccessible: false },
  { name: "Pigalle",                       slug: "pigalle",                        latitude: 48.8822, longitude: 2.3372, isAccessible: false },
  { name: "Barbès — Rochechouart",         slug: "barbes-rochechouart",            latitude: 48.8837, longitude: 2.3494, isAccessible: false },
  { name: "Stalingrad",                    slug: "stalingrad",                     latitude: 48.8842, longitude: 2.3654, isAccessible: false },
  { name: "Jaurès",                        slug: "jaures",                         latitude: 48.8820, longitude: 2.3704, isAccessible: false },
  { name: "Belleville",                    slug: "belleville",                     latitude: 48.8721, longitude: 2.3768, isAccessible: false },
  { name: "Père Lachaise",                 slug: "pere-lachaise",                  latitude: 48.8626, longitude: 2.3868, isAccessible: false },

  // ─ M3 extras ─
  { name: "Pont de Levallois — Bécon",     slug: "pont-de-levallois-becon",        latitude: 48.8978, longitude: 2.2813, isAccessible: false, municipality: "Levallois-Perret" },
  { name: "Villiers",                      slug: "villiers",                       latitude: 48.8817, longitude: 2.3153, isAccessible: false },
  { name: "Saint-Lazare",                  slug: "saint-lazare",                   latitude: 48.8755, longitude: 2.3254, isAccessible: true  },
  { name: "Opéra",                         slug: "opera",                          latitude: 48.8711, longitude: 2.3321, isAccessible: true  },
  { name: "Réaumur — Sébastopol",          slug: "reaumur-sebastopol",             latitude: 48.8661, longitude: 2.3522, isAccessible: false },
  { name: "Arts et Métiers",               slug: "arts-et-metiers",                latitude: 48.8654, longitude: 2.3563, isAccessible: false },
  { name: "République",                    slug: "republique",                     latitude: 48.8675, longitude: 2.3640, isAccessible: true  },
  { name: "Gambetta",                      slug: "gambetta",                       latitude: 48.8650, longitude: 2.3987, isAccessible: false },
  { name: "Gallieni",                      slug: "gallieni",                       latitude: 48.8638, longitude: 2.4160, isAccessible: false, municipality: "Bagnolet" },

  // ─ M4 extras ─
  { name: "Porte de Clignancourt",         slug: "porte-de-clignancourt",          latitude: 48.8975, longitude: 2.3449, isAccessible: false },
  { name: "Gare du Nord",                  slug: "gare-du-nord",                   latitude: 48.8800, longitude: 2.3553, isAccessible: true  },
  { name: "Gare de l'Est",                 slug: "gare-de-l-est",                  latitude: 48.8763, longitude: 2.3588, isAccessible: true  },
  { name: "Strasbourg — Saint-Denis",      slug: "strasbourg-saint-denis",         latitude: 48.8694, longitude: 2.3546, isAccessible: false },
  { name: "Cité",                          slug: "cite",                           latitude: 48.8554, longitude: 2.3470, isAccessible: false },
  { name: "Saint-Michel",                  slug: "saint-michel",                   latitude: 48.8537, longitude: 2.3440, isAccessible: false },
  { name: "Odéon",                         slug: "odeon",                          latitude: 48.8520, longitude: 2.3390, isAccessible: false },
  { name: "Montparnasse — Bienvenüe",      slug: "montparnasse-bienvenue",         latitude: 48.8427, longitude: 2.3210, isAccessible: true  },
  { name: "Denfert-Rochereau",             slug: "denfert-rochereau",              latitude: 48.8339, longitude: 2.3325, isAccessible: true  },
  { name: "Porte d'Orléans",               slug: "porte-d-orleans",                latitude: 48.8232, longitude: 2.3256, isAccessible: false },

  // ─ M5 extras ─
  { name: "Bobigny — Pablo Picasso",       slug: "bobigny-pablo-picasso",          latitude: 48.9066, longitude: 2.4495, isAccessible: true,  municipality: "Bobigny" },
  { name: "Oberkampf",                     slug: "oberkampf",                      latitude: 48.8647, longitude: 2.3685, isAccessible: false },
  { name: "Quai de la Rapée",              slug: "quai-de-la-rapee",               latitude: 48.8464, longitude: 2.3659, isAccessible: false },
  { name: "Gare d'Austerlitz",             slug: "gare-d-austerlitz",              latitude: 48.8426, longitude: 2.3648, isAccessible: true  },
  { name: "Place d'Italie",                slug: "place-d-italie",                 latitude: 48.8310, longitude: 2.3554, isAccessible: true  },

  // ─ M6 extras ─
  { name: "Trocadéro",                     slug: "trocadero",                      latitude: 48.8628, longitude: 2.2867, isAccessible: false },
  { name: "Bir-Hakeim",                    slug: "bir-hakeim",                     latitude: 48.8544, longitude: 2.2890, isAccessible: false },
  { name: "La Motte-Picquet — Grenelle",   slug: "la-motte-picquet-grenelle",      latitude: 48.8490, longitude: 2.2983, isAccessible: false },
  { name: "Bercy",                         slug: "bercy",                          latitude: 48.8397, longitude: 2.3792, isAccessible: true  },
  { name: "Daumesnil",                     slug: "daumesnil",                      latitude: 48.8394, longitude: 2.3960, isAccessible: false },

  // ─ M7 extras ─
  { name: "La Courneuve — 8 Mai 1945",     slug: "la-courneuve-8-mai-1945",        latitude: 48.9209, longitude: 2.4106, isAccessible: true,  municipality: "La Courneuve" },
  { name: "Porte de la Villette",           slug: "porte-de-la-villette",           latitude: 48.8977, longitude: 2.3860, isAccessible: false },
  { name: "Palais Royal — Musée du Louvre", slug: "palais-royal-musee-du-louvre",   latitude: 48.8623, longitude: 2.3367, isAccessible: true  },
  { name: "Pont Neuf",                     slug: "pont-neuf",                      latitude: 48.8587, longitude: 2.3419, isAccessible: false },
  { name: "Jussieu",                       slug: "jussieu",                        latitude: 48.8462, longitude: 2.3546, isAccessible: false },
  { name: "Villejuif — Louis Aragon",      slug: "villejuif-louis-aragon",         latitude: 48.7876, longitude: 2.3681, isAccessible: true,  municipality: "Villejuif" },

  // ─ M8 extras ─
  { name: "Balard",                        slug: "balard",                         latitude: 48.8363, longitude: 2.2787, isAccessible: false },
  { name: "Invalides",                     slug: "invalides",                      latitude: 48.8608, longitude: 2.3147, isAccessible: true  },
  { name: "Madeleine",                     slug: "madeleine",                      latitude: 48.8698, longitude: 2.3246, isAccessible: false },
  { name: "Créteil — Préfecture",          slug: "creteil-prefecture",             latitude: 48.7797, longitude: 2.4594, isAccessible: true,  municipality: "Créteil" },

  // ─ M9 extras ─
  { name: "Pont de Sèvres",                slug: "pont-de-sevres",                 latitude: 48.8295, longitude: 2.2306, isAccessible: false, municipality: "Boulogne-Billancourt" },
  { name: "Havre — Caumartin",             slug: "havre-caumartin",                latitude: 48.8733, longitude: 2.3282, isAccessible: false },
  { name: "Richelieu — Drouot",            slug: "richelieu-drouot",               latitude: 48.8716, longitude: 2.3380, isAccessible: false },
  { name: "Grands Boulevards",             slug: "grands-boulevards",              latitude: 48.8710, longitude: 2.3430, isAccessible: false },
  { name: "Mairie de Montreuil",           slug: "mairie-de-montreuil",            latitude: 48.8622, longitude: 2.4426, isAccessible: false, municipality: "Montreuil" },

  // ─ M10 extras ─
  { name: "Boulogne — Pont de Saint-Cloud", slug: "boulogne-pont-de-saint-cloud",  latitude: 48.8404, longitude: 2.2284, isAccessible: false, municipality: "Boulogne-Billancourt" },
  { name: "Duroc",                         slug: "duroc",                          latitude: 48.8469, longitude: 2.3165, isAccessible: false },
  { name: "Sèvres — Babylone",             slug: "sevres-babylone",                latitude: 48.8510, longitude: 2.3267, isAccessible: false },
  { name: "Cluny — La Sorbonne",           slug: "cluny-la-sorbonne",              latitude: 48.8510, longitude: 2.3460, isAccessible: false },

  // ─ M11 extras ─
  { name: "Place des Fêtes",               slug: "place-des-fetes",                latitude: 48.8769, longitude: 2.3929, isAccessible: false },
  { name: "Porte des Lilas",               slug: "porte-des-lilas",                latitude: 48.8770, longitude: 2.4068, isAccessible: false },
  { name: "Mairie des Lilas",              slug: "mairie-des-lilas",               latitude: 48.8797, longitude: 2.4177, isAccessible: false, municipality: "Les Lilas" },

  // ─ M12 extras ─
  { name: "Front Populaire",               slug: "front-populaire",                latitude: 48.9067, longitude: 2.3651, isAccessible: true,  municipality: "Aubervilliers" },
  { name: "Abbesses",                      slug: "abbesses",                       latitude: 48.8843, longitude: 2.3384, isAccessible: false },
  { name: "Pasteur",                       slug: "pasteur",                        latitude: 48.8423, longitude: 2.3124, isAccessible: false },
  { name: "Porte de Versailles",           slug: "porte-de-versailles",            latitude: 48.8323, longitude: 2.2877, isAccessible: true  },
  { name: "Mairie d'Issy",                 slug: "mairie-d-issy",                  latitude: 48.8244, longitude: 2.2734, isAccessible: true,  municipality: "Issy-les-Moulineaux" },

  // ─ M13 extras ─
  { name: "Saint-Denis — Université",      slug: "saint-denis-universite",         latitude: 48.9462, longitude: 2.3640, isAccessible: true,  municipality: "Saint-Denis" },
  { name: "Basilique de Saint-Denis",      slug: "basilique-de-saint-denis",       latitude: 48.9365, longitude: 2.3590, isAccessible: true,  municipality: "Saint-Denis" },
  { name: "Mairie de Saint-Ouen",          slug: "mairie-de-saint-ouen",           latitude: 48.9120, longitude: 2.3340, isAccessible: true,  municipality: "Saint-Ouen-sur-Seine" },
  { name: "Champs-Élysées — Clemenceau",   slug: "champs-elysees-clemenceau",      latitude: 48.8675, longitude: 2.3140, isAccessible: false },
  { name: "Porte de Vanves",               slug: "porte-de-vanves",                latitude: 48.8279, longitude: 2.3059, isAccessible: false },
  { name: "Châtillon — Montrouge",         slug: "chatillon-montrouge",            latitude: 48.8102, longitude: 2.3015, isAccessible: true,  municipality: "Châtillon" },

  // ─ M14 extras ─
  { name: "Saint-Denis Pleyel",            slug: "saint-denis-pleyel",             latitude: 48.9192, longitude: 2.3460, isAccessible: true,  municipality: "Saint-Denis" },
  { name: "Porte de Clichy",               slug: "porte-de-clichy",                latitude: 48.8943, longitude: 2.3133, isAccessible: true  },
  { name: "Pyramides",                     slug: "pyramides",                      latitude: 48.8666, longitude: 2.3340, isAccessible: true  },
  { name: "Bibliothèque François Mitterrand", slug: "bibliotheque-francois-mitterrand", latitude: 48.8294, longitude: 2.3756, isAccessible: true },
  { name: "Olympiades",                    slug: "olympiades",                     latitude: 48.8267, longitude: 2.3675, isAccessible: true  },

  // ─ RER A extras ─
  { name: "Auber",                         slug: "auber",                          latitude: 48.8727, longitude: 2.3296, isAccessible: true  },
  { name: "Châtelet — Les Halles",         slug: "chatelet-les-halles",            latitude: 48.8622, longitude: 2.3470, isAccessible: true  },
  { name: "Vincennes",                     slug: "vincennes",                      latitude: 48.8474, longitude: 2.4334, isAccessible: true,  municipality: "Vincennes" },
  { name: "Val de Fontenay",               slug: "val-de-fontenay",                latitude: 48.8546, longitude: 2.4826, isAccessible: true,  municipality: "Fontenay-sous-Bois" },
  { name: "Marne-la-Vallée — Chessy",      slug: "marne-la-vallee-chessy",         latitude: 48.8675, longitude: 2.7827, isAccessible: true,  municipality: "Chessy" },

  // ─ RER B extras ─
  { name: "Aéroport Charles de Gaulle",    slug: "aeroport-charles-de-gaulle",     latitude: 49.0097, longitude: 2.5479, isAccessible: true,  municipality: "Roissy-en-France" },
  { name: "Saint-Michel — Notre-Dame",     slug: "saint-michel-notre-dame",        latitude: 48.8535, longitude: 2.3448, isAccessible: true  },
  { name: "Luxembourg",                    slug: "luxembourg",                     latitude: 48.8462, longitude: 2.3396, isAccessible: true  },
  { name: "Port-Royal",                    slug: "port-royal",                     latitude: 48.8395, longitude: 2.3374, isAccessible: true  },
  { name: "Cité Universitaire",            slug: "cite-universitaire",             latitude: 48.8234, longitude: 2.3369, isAccessible: true  },
  { name: "Antony",                        slug: "antony",                         latitude: 48.7534, longitude: 2.2977, isAccessible: true,  municipality: "Antony" },
  { name: "Robinson",                      slug: "robinson",                       latitude: 48.7793, longitude: 2.2822, isAccessible: true,  municipality: "Sceaux" },

  // ─ RER C extras ─
  { name: "Versailles-Château — Rive Gauche", slug: "versailles-chateau-rive-gauche", latitude: 48.7998, longitude: 2.1292, isAccessible: true, municipality: "Versailles" },
  { name: "Champ de Mars — Tour Eiffel",   slug: "champ-de-mars-tour-eiffel",      latitude: 48.8556, longitude: 2.2900, isAccessible: true  },
  { name: "Musée d'Orsay",                 slug: "musee-d-orsay",                  latitude: 48.8606, longitude: 2.3256, isAccessible: true  },

  // ─ RER D extras ─
  { name: "Stade de France — Saint-Denis",  slug: "stade-de-france-saint-denis",    latitude: 48.9166, longitude: 2.3562, isAccessible: true,  municipality: "Saint-Denis" },
  { name: "Maisons-Alfort — Alfortville",  slug: "maisons-alfort-alfortville",     latitude: 48.8068, longitude: 2.4296, isAccessible: true,  municipality: "Maisons-Alfort" },

  // ─ RER E extras ─
  { name: "Haussmann — Saint-Lazare",      slug: "haussmann-saint-lazare",         latitude: 48.8753, longitude: 2.3271, isAccessible: true  },
  { name: "Magenta",                       slug: "magenta",                        latitude: 48.8808, longitude: 2.3574, isAccessible: true  },
  { name: "Rosa Parks",                    slug: "rosa-parks",                     latitude: 48.8969, longitude: 2.3721, isAccessible: true  },
  { name: "Pantin",                        slug: "pantin",                         latitude: 48.8976, longitude: 2.4002, isAccessible: true,  municipality: "Pantin" },
  { name: "Chelles — Gournay",             slug: "chelles-gournay",                latitude: 48.8797, longitude: 2.5868, isAccessible: true,  municipality: "Chelles" },

  // ─ T1 extras ─
  { name: "Saint-Denis — Gare",            slug: "saint-denis-gare",               latitude: 48.9344, longitude: 2.3456, isAccessible: true,  municipality: "Saint-Denis" },
  { name: "Noisy-le-Sec",                  slug: "noisy-le-sec",                   latitude: 48.8917, longitude: 2.4595, isAccessible: true,  municipality: "Noisy-le-Sec" },

  // ─ T2 extras ─
  { name: "Pont de Bezons",                slug: "pont-de-bezons",                 latitude: 48.9286, longitude: 2.2138, isAccessible: true,  municipality: "Bezons" },
  { name: "Parc de Saint-Cloud",           slug: "parc-de-saint-cloud",            latitude: 48.8404, longitude: 2.2149, isAccessible: true,  municipality: "Saint-Cloud" },
  { name: "Issy — Val de Seine",           slug: "issy-val-de-seine",              latitude: 48.8244, longitude: 2.2598, isAccessible: true,  municipality: "Issy-les-Moulineaux" },
  { name: "Les Moulineaux",                slug: "les-moulineaux",                 latitude: 48.8308, longitude: 2.2615, isAccessible: true,  municipality: "Issy-les-Moulineaux" },

  // ─ T3a extras ─
  { name: "Pont du Garigliano",            slug: "pont-du-garigliano",             latitude: 48.8391, longitude: 2.2710, isAccessible: true  },
  { name: "Porte d'Italie",                slug: "porte-d-italie",                 latitude: 48.8198, longitude: 2.3600, isAccessible: true  },
  { name: "Porte de Vincennes",            slug: "porte-de-vincennes",             latitude: 48.8465, longitude: 2.4106, isAccessible: true  },
];

// ── Line stop sequences (22 lines, ~201 stops) ────────────────────────

export const lineStopSequences: LineStopSequence[] = [
  // ── Metro 1: La Défense → Château de Vincennes (12 stops)
  {
    lineCode: "M1",
    stops: [
      { stationSlug: "la-defense",              travelTimeToNext: 120 },
      { stationSlug: "porte-maillot",           travelTimeToNext: 120 },
      { stationSlug: "charles-de-gaulle-etoile", travelTimeToNext: 90  },
      { stationSlug: "franklin-d-roosevelt",    travelTimeToNext: 90  },
      { stationSlug: "concorde",                travelTimeToNext: 90  },
      { stationSlug: "louvre-rivoli",            travelTimeToNext: 90  },
      { stationSlug: "chatelet",                travelTimeToNext: 60  },
      { stationSlug: "hotel-de-ville",          travelTimeToNext: 90  },
      { stationSlug: "bastille",                travelTimeToNext: 120 },
      { stationSlug: "gare-de-lyon",            travelTimeToNext: 120 },
      { stationSlug: "nation",                  travelTimeToNext: 150 },
      { stationSlug: "chateau-de-vincennes",    travelTimeToNext: null },
    ],
  },

  // ── Metro 2: Porte Dauphine → Nation (10 stops)
  {
    lineCode: "M2",
    stops: [
      { stationSlug: "porte-dauphine",          travelTimeToNext: 150 },
      { stationSlug: "charles-de-gaulle-etoile", travelTimeToNext: 180 },
      { stationSlug: "place-de-clichy",         travelTimeToNext: 90  },
      { stationSlug: "pigalle",                 travelTimeToNext: 90  },
      { stationSlug: "barbes-rochechouart",     travelTimeToNext: 90  },
      { stationSlug: "stalingrad",              travelTimeToNext: 90  },
      { stationSlug: "jaures",                  travelTimeToNext: 120 },
      { stationSlug: "belleville",              travelTimeToNext: 120 },
      { stationSlug: "pere-lachaise",           travelTimeToNext: 150 },
      { stationSlug: "nation",                  travelTimeToNext: null },
    ],
  },

  // ── Metro 3: Pont de Levallois — Bécon → Gallieni (10 stops)
  {
    lineCode: "M3",
    stops: [
      { stationSlug: "pont-de-levallois-becon", travelTimeToNext: 150 },
      { stationSlug: "villiers",                travelTimeToNext: 90  },
      { stationSlug: "saint-lazare",            travelTimeToNext: 90  },
      { stationSlug: "opera",                   travelTimeToNext: 90  },
      { stationSlug: "reaumur-sebastopol",      travelTimeToNext: 90  },
      { stationSlug: "arts-et-metiers",         travelTimeToNext: 60  },
      { stationSlug: "republique",              travelTimeToNext: 120 },
      { stationSlug: "pere-lachaise",           travelTimeToNext: 120 },
      { stationSlug: "gambetta",                travelTimeToNext: 120 },
      { stationSlug: "gallieni",                travelTimeToNext: null },
    ],
  },

  // ── Metro 4: Porte de Clignancourt → Porte d'Orléans (12 stops)
  {
    lineCode: "M4",
    stops: [
      { stationSlug: "porte-de-clignancourt",   travelTimeToNext: 120 },
      { stationSlug: "barbes-rochechouart",     travelTimeToNext: 90  },
      { stationSlug: "gare-du-nord",            travelTimeToNext: 90  },
      { stationSlug: "gare-de-l-est",           travelTimeToNext: 90  },
      { stationSlug: "strasbourg-saint-denis",  travelTimeToNext: 120 },
      { stationSlug: "chatelet",                travelTimeToNext: 60  },
      { stationSlug: "cite",                    travelTimeToNext: 60  },
      { stationSlug: "saint-michel",            travelTimeToNext: 90  },
      { stationSlug: "odeon",                   travelTimeToNext: 120 },
      { stationSlug: "montparnasse-bienvenue",  travelTimeToNext: 120 },
      { stationSlug: "denfert-rochereau",       travelTimeToNext: 120 },
      { stationSlug: "porte-d-orleans",         travelTimeToNext: null },
    ],
  },

  // ── Metro 5: Bobigny — Pablo Picasso → Place d'Italie (11 stops)
  {
    lineCode: "M5",
    stops: [
      { stationSlug: "bobigny-pablo-picasso",   travelTimeToNext: 180 },
      { stationSlug: "jaures",                  travelTimeToNext: 90  },
      { stationSlug: "stalingrad",              travelTimeToNext: 90  },
      { stationSlug: "gare-du-nord",            travelTimeToNext: 90  },
      { stationSlug: "gare-de-l-est",           travelTimeToNext: 90  },
      { stationSlug: "republique",              travelTimeToNext: 90  },
      { stationSlug: "oberkampf",               travelTimeToNext: 90  },
      { stationSlug: "bastille",                travelTimeToNext: 90  },
      { stationSlug: "quai-de-la-rapee",        travelTimeToNext: 90  },
      { stationSlug: "gare-d-austerlitz",       travelTimeToNext: 120 },
      { stationSlug: "place-d-italie",          travelTimeToNext: null },
    ],
  },

  // ── Metro 6: Charles de Gaulle — Étoile → Nation (10 stops)
  {
    lineCode: "M6",
    stops: [
      { stationSlug: "charles-de-gaulle-etoile", travelTimeToNext: 120 },
      { stationSlug: "trocadero",               travelTimeToNext: 90  },
      { stationSlug: "bir-hakeim",              travelTimeToNext: 90  },
      { stationSlug: "la-motte-picquet-grenelle", travelTimeToNext: 120 },
      { stationSlug: "montparnasse-bienvenue",  travelTimeToNext: 150 },
      { stationSlug: "denfert-rochereau",       travelTimeToNext: 120 },
      { stationSlug: "place-d-italie",          travelTimeToNext: 150 },
      { stationSlug: "bercy",                   travelTimeToNext: 120 },
      { stationSlug: "daumesnil",               travelTimeToNext: 120 },
      { stationSlug: "nation",                  travelTimeToNext: null },
    ],
  },

  // ── Metro 7: La Courneuve — 8 Mai 1945 → Villejuif — Louis Aragon (11 stops)
  {
    lineCode: "M7",
    stops: [
      { stationSlug: "la-courneuve-8-mai-1945", travelTimeToNext: 150 },
      { stationSlug: "porte-de-la-villette",    travelTimeToNext: 120 },
      { stationSlug: "stalingrad",              travelTimeToNext: 120 },
      { stationSlug: "gare-de-l-est",           travelTimeToNext: 150 },
      { stationSlug: "opera",                   travelTimeToNext: 90  },
      { stationSlug: "palais-royal-musee-du-louvre", travelTimeToNext: 90 },
      { stationSlug: "pont-neuf",               travelTimeToNext: 60  },
      { stationSlug: "chatelet",                travelTimeToNext: 120 },
      { stationSlug: "jussieu",                 travelTimeToNext: 120 },
      { stationSlug: "place-d-italie",          travelTimeToNext: 180 },
      { stationSlug: "villejuif-louis-aragon",  travelTimeToNext: null },
    ],
  },

  // ── Metro 8: Balard → Créteil — Préfecture (11 stops)
  {
    lineCode: "M8",
    stops: [
      { stationSlug: "balard",                  travelTimeToNext: 150 },
      { stationSlug: "la-motte-picquet-grenelle", travelTimeToNext: 120 },
      { stationSlug: "invalides",               travelTimeToNext: 90  },
      { stationSlug: "concorde",                travelTimeToNext: 90  },
      { stationSlug: "madeleine",               travelTimeToNext: 90  },
      { stationSlug: "opera",                   travelTimeToNext: 120 },
      { stationSlug: "strasbourg-saint-denis",  travelTimeToNext: 90  },
      { stationSlug: "republique",              travelTimeToNext: 90  },
      { stationSlug: "bastille",                travelTimeToNext: 120 },
      { stationSlug: "daumesnil",               travelTimeToNext: 180 },
      { stationSlug: "creteil-prefecture",      travelTimeToNext: null },
    ],
  },

  // ── Metro 9: Pont de Sèvres → Mairie de Montreuil (11 stops)
  {
    lineCode: "M9",
    stops: [
      { stationSlug: "pont-de-sevres",          travelTimeToNext: 180 },
      { stationSlug: "trocadero",               travelTimeToNext: 120 },
      { stationSlug: "franklin-d-roosevelt",    travelTimeToNext: 120 },
      { stationSlug: "havre-caumartin",         travelTimeToNext: 90  },
      { stationSlug: "richelieu-drouot",        travelTimeToNext: 60  },
      { stationSlug: "grands-boulevards",       travelTimeToNext: 60  },
      { stationSlug: "strasbourg-saint-denis",  travelTimeToNext: 90  },
      { stationSlug: "republique",              travelTimeToNext: 90  },
      { stationSlug: "oberkampf",               travelTimeToNext: 120 },
      { stationSlug: "nation",                  travelTimeToNext: 150 },
      { stationSlug: "mairie-de-montreuil",     travelTimeToNext: null },
    ],
  },

  // ── Metro 10: Boulogne — Pont de Saint-Cloud → Gare d'Austerlitz (8 stops)
  {
    lineCode: "M10",
    stops: [
      { stationSlug: "boulogne-pont-de-saint-cloud", travelTimeToNext: 180 },
      { stationSlug: "la-motte-picquet-grenelle", travelTimeToNext: 120 },
      { stationSlug: "duroc",                   travelTimeToNext: 90  },
      { stationSlug: "sevres-babylone",          travelTimeToNext: 90  },
      { stationSlug: "odeon",                   travelTimeToNext: 90  },
      { stationSlug: "cluny-la-sorbonne",       travelTimeToNext: 60  },
      { stationSlug: "jussieu",                 travelTimeToNext: 90  },
      { stationSlug: "gare-d-austerlitz",       travelTimeToNext: null },
    ],
  },

  // ── Metro 11: Châtelet → Mairie des Lilas (8 stops)
  {
    lineCode: "M11",
    stops: [
      { stationSlug: "chatelet",                travelTimeToNext: 60  },
      { stationSlug: "hotel-de-ville",          travelTimeToNext: 90  },
      { stationSlug: "arts-et-metiers",         travelTimeToNext: 90  },
      { stationSlug: "republique",              travelTimeToNext: 90  },
      { stationSlug: "belleville",              travelTimeToNext: 120 },
      { stationSlug: "place-des-fetes",         travelTimeToNext: 120 },
      { stationSlug: "porte-des-lilas",         travelTimeToNext: 90  },
      { stationSlug: "mairie-des-lilas",        travelTimeToNext: null },
    ],
  },

  // ── Metro 12: Front Populaire → Mairie d'Issy (11 stops)
  {
    lineCode: "M12",
    stops: [
      { stationSlug: "front-populaire",         travelTimeToNext: 180 },
      { stationSlug: "abbesses",                travelTimeToNext: 120 },
      { stationSlug: "pigalle",                 travelTimeToNext: 90  },
      { stationSlug: "saint-lazare",            travelTimeToNext: 120 },
      { stationSlug: "madeleine",               travelTimeToNext: 90  },
      { stationSlug: "concorde",                travelTimeToNext: 90  },
      { stationSlug: "sevres-babylone",          travelTimeToNext: 120 },
      { stationSlug: "montparnasse-bienvenue",  travelTimeToNext: 90  },
      { stationSlug: "pasteur",                 travelTimeToNext: 120 },
      { stationSlug: "porte-de-versailles",     travelTimeToNext: 120 },
      { stationSlug: "mairie-d-issy",           travelTimeToNext: null },
    ],
  },

  // ── Metro 13: Saint-Denis — Université → Châtillon — Montrouge (11 stops)
  {
    lineCode: "M13",
    stops: [
      { stationSlug: "saint-denis-universite",  travelTimeToNext: 120 },
      { stationSlug: "basilique-de-saint-denis", travelTimeToNext: 150 },
      { stationSlug: "mairie-de-saint-ouen",    travelTimeToNext: 150 },
      { stationSlug: "place-de-clichy",         travelTimeToNext: 120 },
      { stationSlug: "saint-lazare",            travelTimeToNext: 90  },
      { stationSlug: "champs-elysees-clemenceau", travelTimeToNext: 120 },
      { stationSlug: "invalides",               travelTimeToNext: 90  },
      { stationSlug: "duroc",                   travelTimeToNext: 120 },
      { stationSlug: "montparnasse-bienvenue",  travelTimeToNext: 120 },
      { stationSlug: "porte-de-vanves",         travelTimeToNext: 150 },
      { stationSlug: "chatillon-montrouge",     travelTimeToNext: null },
    ],
  },

  // ── Metro 14: Saint-Denis Pleyel → Olympiades (11 stops)
  {
    lineCode: "M14",
    stops: [
      { stationSlug: "saint-denis-pleyel",      travelTimeToNext: 120 },
      { stationSlug: "mairie-de-saint-ouen",    travelTimeToNext: 120 },
      { stationSlug: "porte-de-clichy",         travelTimeToNext: 90  },
      { stationSlug: "saint-lazare",            travelTimeToNext: 90  },
      { stationSlug: "madeleine",               travelTimeToNext: 60  },
      { stationSlug: "pyramides",               travelTimeToNext: 90  },
      { stationSlug: "chatelet",                travelTimeToNext: 90  },
      { stationSlug: "gare-de-lyon",            travelTimeToNext: 90  },
      { stationSlug: "bercy",                   travelTimeToNext: 90  },
      { stationSlug: "bibliotheque-francois-mitterrand", travelTimeToNext: 90 },
      { stationSlug: "olympiades",              travelTimeToNext: null },
    ],
  },

  // ── RER A: La Défense → Marne-la-Vallée — Chessy (9 stops)
  {
    lineCode: "RER-A",
    stops: [
      { stationSlug: "la-defense",              travelTimeToNext: 180 },
      { stationSlug: "charles-de-gaulle-etoile", travelTimeToNext: 150 },
      { stationSlug: "auber",                   travelTimeToNext: 120 },
      { stationSlug: "chatelet-les-halles",     travelTimeToNext: 120 },
      { stationSlug: "gare-de-lyon",            travelTimeToNext: 120 },
      { stationSlug: "nation",                  travelTimeToNext: 180 },
      { stationSlug: "vincennes",               travelTimeToNext: 150 },
      { stationSlug: "val-de-fontenay",         travelTimeToNext: 300 },
      { stationSlug: "marne-la-vallee-chessy",  travelTimeToNext: null },
    ],
  },

  // ── RER B: Aéroport Charles de Gaulle → Robinson (10 stops)
  {
    lineCode: "RER-B",
    stops: [
      { stationSlug: "aeroport-charles-de-gaulle", travelTimeToNext: 600 },
      { stationSlug: "gare-du-nord",            travelTimeToNext: 120 },
      { stationSlug: "chatelet-les-halles",     travelTimeToNext: 120 },
      { stationSlug: "saint-michel-notre-dame", travelTimeToNext: 90  },
      { stationSlug: "luxembourg",              travelTimeToNext: 90  },
      { stationSlug: "port-royal",              travelTimeToNext: 90  },
      { stationSlug: "denfert-rochereau",       travelTimeToNext: 120 },
      { stationSlug: "cite-universitaire",      travelTimeToNext: 180 },
      { stationSlug: "antony",                  travelTimeToNext: 240 },
      { stationSlug: "robinson",                travelTimeToNext: null },
    ],
  },

  // ── RER C: Versailles-Château → Bibliothèque François Mitterrand (7 stops)
  {
    lineCode: "RER-C",
    stops: [
      { stationSlug: "versailles-chateau-rive-gauche", travelTimeToNext: 600 },
      { stationSlug: "champ-de-mars-tour-eiffel", travelTimeToNext: 120 },
      { stationSlug: "invalides",               travelTimeToNext: 90  },
      { stationSlug: "musee-d-orsay",           travelTimeToNext: 90  },
      { stationSlug: "saint-michel-notre-dame", travelTimeToNext: 120 },
      { stationSlug: "gare-d-austerlitz",       travelTimeToNext: 180 },
      { stationSlug: "bibliotheque-francois-mitterrand", travelTimeToNext: null },
    ],
  },

  // ── RER D: Stade de France → Maisons-Alfort — Alfortville (5 stops)
  {
    lineCode: "RER-D",
    stops: [
      { stationSlug: "stade-de-france-saint-denis", travelTimeToNext: 180 },
      { stationSlug: "gare-du-nord",            travelTimeToNext: 120 },
      { stationSlug: "chatelet-les-halles",     travelTimeToNext: 120 },
      { stationSlug: "gare-de-lyon",            travelTimeToNext: 240 },
      { stationSlug: "maisons-alfort-alfortville", travelTimeToNext: null },
    ],
  },

  // ── RER E: Haussmann — Saint-Lazare → Chelles — Gournay (5 stops)
  {
    lineCode: "RER-E",
    stops: [
      { stationSlug: "haussmann-saint-lazare",  travelTimeToNext: 120 },
      { stationSlug: "magenta",                 travelTimeToNext: 180 },
      { stationSlug: "rosa-parks",              travelTimeToNext: 180 },
      { stationSlug: "pantin",                  travelTimeToNext: 300 },
      { stationSlug: "chelles-gournay",         travelTimeToNext: null },
    ],
  },

  // ── Tram T1: Saint-Denis — Gare → Noisy-le-Sec (5 stops)
  {
    lineCode: "T1",
    stops: [
      { stationSlug: "saint-denis-gare",        travelTimeToNext: 120 },
      { stationSlug: "basilique-de-saint-denis", travelTimeToNext: 300 },
      { stationSlug: "la-courneuve-8-mai-1945", travelTimeToNext: 240 },
      { stationSlug: "bobigny-pablo-picasso",   travelTimeToNext: 300 },
      { stationSlug: "noisy-le-sec",            travelTimeToNext: null },
    ],
  },

  // ── Tram T2: Pont de Bezons → Porte de Versailles (6 stops)
  {
    lineCode: "T2",
    stops: [
      { stationSlug: "pont-de-bezons",          travelTimeToNext: 300 },
      { stationSlug: "la-defense",              travelTimeToNext: 240 },
      { stationSlug: "parc-de-saint-cloud",     travelTimeToNext: 300 },
      { stationSlug: "issy-val-de-seine",       travelTimeToNext: 180 },
      { stationSlug: "les-moulineaux",          travelTimeToNext: 180 },
      { stationSlug: "porte-de-versailles",     travelTimeToNext: null },
    ],
  },

  // ── Tram T3a: Pont du Garigliano → Porte de Vincennes (7 stops)
  {
    lineCode: "T3A",
    stops: [
      { stationSlug: "pont-du-garigliano",      travelTimeToNext: 120 },
      { stationSlug: "balard",                  travelTimeToNext: 180 },
      { stationSlug: "porte-de-versailles",     travelTimeToNext: 240 },
      { stationSlug: "porte-d-orleans",         travelTimeToNext: 300 },
      { stationSlug: "cite-universitaire",      travelTimeToNext: 240 },
      { stationSlug: "porte-d-italie",          travelTimeToNext: 300 },
      { stationSlug: "porte-de-vincennes",      travelTimeToNext: null },
    ],
  },
];

// ── Walking connections at interchange stations (45 pairs → 90 directed) ──

export const connectionPairs: ConnectionPair[] = [
  // ── Châtelet (M1, M4, M7, M11, M14) ──
  { lineCodeA: "M1",  stationSlugA: "chatelet", lineCodeB: "M4",  stationSlugB: "chatelet", walkingTime: 180 },
  { lineCodeA: "M1",  stationSlugA: "chatelet", lineCodeB: "M14", stationSlugB: "chatelet", walkingTime: 120 },
  { lineCodeA: "M4",  stationSlugA: "chatelet", lineCodeB: "M7",  stationSlugB: "chatelet", walkingTime: 150 },
  { lineCodeA: "M4",  stationSlugA: "chatelet", lineCodeB: "M14", stationSlugB: "chatelet", walkingTime: 180 },
  { lineCodeA: "M7",  stationSlugA: "chatelet", lineCodeB: "M11", stationSlugB: "chatelet", walkingTime: 180 },

  // ── République (M3, M5, M8, M9, M11) ──
  { lineCodeA: "M3",  stationSlugA: "republique", lineCodeB: "M5",  stationSlugB: "republique", walkingTime: 150 },
  { lineCodeA: "M5",  stationSlugA: "republique", lineCodeB: "M9",  stationSlugB: "republique", walkingTime: 120 },
  { lineCodeA: "M8",  stationSlugA: "republique", lineCodeB: "M9",  stationSlugB: "republique", walkingTime: 120 },
  { lineCodeA: "M3",  stationSlugA: "republique", lineCodeB: "M11", stationSlugB: "republique", walkingTime: 180 },

  // ── Gare du Nord (M4, M5, RER-B, RER-D) ──
  { lineCodeA: "M4",    stationSlugA: "gare-du-nord", lineCodeB: "M5",    stationSlugB: "gare-du-nord", walkingTime: 120 },
  { lineCodeA: "M4",    stationSlugA: "gare-du-nord", lineCodeB: "RER-B", stationSlugB: "gare-du-nord", walkingTime: 240 },
  { lineCodeA: "RER-B", stationSlugA: "gare-du-nord", lineCodeB: "RER-D", stationSlugB: "gare-du-nord", walkingTime: 180 },

  // ── Gare de Lyon (M1, M14, RER-A, RER-D) ──
  { lineCodeA: "M1",    stationSlugA: "gare-de-lyon", lineCodeB: "M14",   stationSlugB: "gare-de-lyon", walkingTime: 120 },
  { lineCodeA: "M1",    stationSlugA: "gare-de-lyon", lineCodeB: "RER-A", stationSlugB: "gare-de-lyon", walkingTime: 240 },
  { lineCodeA: "RER-A", stationSlugA: "gare-de-lyon", lineCodeB: "RER-D", stationSlugB: "gare-de-lyon", walkingTime: 180 },

  // ── Saint-Lazare (M3, M12, M13, M14) ──
  { lineCodeA: "M3",  stationSlugA: "saint-lazare", lineCodeB: "M12", stationSlugB: "saint-lazare", walkingTime: 150 },
  { lineCodeA: "M12", stationSlugA: "saint-lazare", lineCodeB: "M13", stationSlugB: "saint-lazare", walkingTime: 120 },
  { lineCodeA: "M13", stationSlugA: "saint-lazare", lineCodeB: "M14", stationSlugB: "saint-lazare", walkingTime: 180 },

  // ── Charles de Gaulle — Étoile (M1, M2, M6, RER-A) ──
  { lineCodeA: "M1",    stationSlugA: "charles-de-gaulle-etoile", lineCodeB: "M2",    stationSlugB: "charles-de-gaulle-etoile", walkingTime: 180 },
  { lineCodeA: "M1",    stationSlugA: "charles-de-gaulle-etoile", lineCodeB: "M6",    stationSlugB: "charles-de-gaulle-etoile", walkingTime: 150 },
  { lineCodeA: "M1",    stationSlugA: "charles-de-gaulle-etoile", lineCodeB: "RER-A", stationSlugB: "charles-de-gaulle-etoile", walkingTime: 240 },

  // ── Nation (M1, M2, M6, M9, RER-A) ──
  { lineCodeA: "M1",    stationSlugA: "nation", lineCodeB: "M2",    stationSlugB: "nation", walkingTime: 120 },
  { lineCodeA: "M1",    stationSlugA: "nation", lineCodeB: "M9",    stationSlugB: "nation", walkingTime: 150 },
  { lineCodeA: "M6",    stationSlugA: "nation", lineCodeB: "M9",    stationSlugB: "nation", walkingTime: 120 },
  { lineCodeA: "M1",    stationSlugA: "nation", lineCodeB: "RER-A", stationSlugB: "nation", walkingTime: 180 },

  // ── Montparnasse — Bienvenüe (M4, M6, M12, M13) ──
  { lineCodeA: "M4",  stationSlugA: "montparnasse-bienvenue", lineCodeB: "M6",  stationSlugB: "montparnasse-bienvenue", walkingTime: 150 },
  { lineCodeA: "M4",  stationSlugA: "montparnasse-bienvenue", lineCodeB: "M12", stationSlugB: "montparnasse-bienvenue", walkingTime: 120 },
  { lineCodeA: "M12", stationSlugA: "montparnasse-bienvenue", lineCodeB: "M13", stationSlugB: "montparnasse-bienvenue", walkingTime: 120 },

  // ── Bastille (M1, M5, M8) ──
  { lineCodeA: "M1", stationSlugA: "bastille", lineCodeB: "M5", stationSlugB: "bastille", walkingTime: 120 },
  { lineCodeA: "M1", stationSlugA: "bastille", lineCodeB: "M8", stationSlugB: "bastille", walkingTime: 120 },
  { lineCodeA: "M5", stationSlugA: "bastille", lineCodeB: "M8", stationSlugB: "bastille", walkingTime: 150 },

  // ── Opéra (M3, M7, M8) ──
  { lineCodeA: "M3", stationSlugA: "opera", lineCodeB: "M7", stationSlugB: "opera", walkingTime: 150 },
  { lineCodeA: "M3", stationSlugA: "opera", lineCodeB: "M8", stationSlugB: "opera", walkingTime: 120 },
  { lineCodeA: "M7", stationSlugA: "opera", lineCodeB: "M8", stationSlugB: "opera", walkingTime: 150 },

  // ── Strasbourg — Saint-Denis (M4, M8, M9) ──
  { lineCodeA: "M4", stationSlugA: "strasbourg-saint-denis", lineCodeB: "M8", stationSlugB: "strasbourg-saint-denis", walkingTime: 120 },
  { lineCodeA: "M4", stationSlugA: "strasbourg-saint-denis", lineCodeB: "M9", stationSlugB: "strasbourg-saint-denis", walkingTime: 120 },
  { lineCodeA: "M8", stationSlugA: "strasbourg-saint-denis", lineCodeB: "M9", stationSlugB: "strasbourg-saint-denis", walkingTime: 120 },

  // ── Place d'Italie (M5, M6, M7) ──
  { lineCodeA: "M5", stationSlugA: "place-d-italie", lineCodeB: "M6", stationSlugB: "place-d-italie", walkingTime: 120 },
  { lineCodeA: "M5", stationSlugA: "place-d-italie", lineCodeB: "M7", stationSlugB: "place-d-italie", walkingTime: 150 },
  { lineCodeA: "M6", stationSlugA: "place-d-italie", lineCodeB: "M7", stationSlugB: "place-d-italie", walkingTime: 120 },

  // ── La Défense (M1, RER-A, T2) ──
  { lineCodeA: "M1",    stationSlugA: "la-defense", lineCodeB: "RER-A", stationSlugB: "la-defense", walkingTime: 180 },
  { lineCodeA: "M1",    stationSlugA: "la-defense", lineCodeB: "T2",    stationSlugB: "la-defense", walkingTime: 240 },
  { lineCodeA: "RER-A", stationSlugA: "la-defense", lineCodeB: "T2",    stationSlugB: "la-defense", walkingTime: 180 },

  // ── Châtelet — Les Halles (RER-A, RER-B, RER-D) ──
  { lineCodeA: "RER-A", stationSlugA: "chatelet-les-halles", lineCodeB: "RER-B", stationSlugB: "chatelet-les-halles", walkingTime: 180 },
  { lineCodeA: "RER-A", stationSlugA: "chatelet-les-halles", lineCodeB: "RER-D", stationSlugB: "chatelet-les-halles", walkingTime: 150 },
  { lineCodeA: "RER-B", stationSlugA: "chatelet-les-halles", lineCodeB: "RER-D", stationSlugB: "chatelet-les-halles", walkingTime: 120 },

  // ── Cross-station: Châtelet ↔ Châtelet — Les Halles ──
  { lineCodeA: "M14",   stationSlugA: "chatelet",            lineCodeB: "RER-A", stationSlugB: "chatelet-les-halles", walkingTime: 240 },

  // ── Cross-station: Saint-Lazare ↔ Haussmann — Saint-Lazare ──
  { lineCodeA: "M14",   stationSlugA: "saint-lazare",        lineCodeB: "RER-E", stationSlugB: "haussmann-saint-lazare", walkingTime: 180 },

  // ── Cross-station: Saint-Michel ↔ Saint-Michel — Notre-Dame ──
  { lineCodeA: "M4",    stationSlugA: "saint-michel",        lineCodeB: "RER-B", stationSlugB: "saint-michel-notre-dame", walkingTime: 180 },

  // ── Cross-station: Gare du Nord ↔ Magenta (RER E) ──
  { lineCodeA: "M4",    stationSlugA: "gare-du-nord",        lineCodeB: "RER-E", stationSlugB: "magenta", walkingTime: 240 },
];
