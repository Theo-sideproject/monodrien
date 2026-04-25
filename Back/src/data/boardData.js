// Données complètes du plateau Monopoly français
const BOARD_DATA = [
  // Case 0 - Départ
  {
    id: 0,
    name: "Départ",
    type: "corner",
    description: "Recevez 200€ en passant",
    color: null,
    price: null,
    rent: null
  },
  
  // Case 1 - Boulevard de Belleville
  {
    id: 1,
    name: "Boulevard de Belleville",
    type: "property",
    description: "Propriété marron",
    color: "brown",
    price: 60,
    rent: [2, 10, 30, 90, 160, 250],
    houseCost: 50,
    hotelCost: 50
  },
  
  // Case 2 - Caisse de communauté
  {
    id: 2,
    name: "Caisse de Communauté",
    type: "community-chest",
    description: "Tirez une carte Caisse de Communauté",
    color: null,
    price: null,
    rent: null
  },
  
  // Case 3 - Rue Lecourbe
  {
    id: 3,
    name: "Rue Lecourbe",
    type: "property",
    description: "Propriété marron",
    color: "brown",
    price: 60,
    rent: [4, 20, 60, 180, 320, 450],
    houseCost: 50,
    hotelCost: 50
  },
  
  // Case 4 - Impôt sur le revenu
  {
    id: 4,
    name: "Impôt sur le revenu",
    type: "tax",
    description: "Payez 200€",
    color: null,
    price: 200,
    rent: null
  },
  
  // Case 5 - Gare Montparnasse
  {
    id: 5,
    name: "Gare Montparnasse",
    type: "station",
    description: "Gare",
    color: null,
    price: 200,
    rent: [25, 50, 100, 200]
  },
  
  // Case 6 - Rue de Vaugirard
  {
    id: 6,
    name: "Rue de Vaugirard",
    type: "property",
    description: "Propriété bleu clair",
    color: "lightblue",
    price: 100,
    rent: [6, 30, 90, 270, 400, 550],
    houseCost: 50,
    hotelCost: 50
  },
  
  // Case 7 - Chance
  {
    id: 7,
    name: "Chance",
    type: "chance",
    description: "Tirez une carte Chance",
    color: null,
    price: null,
    rent: null
  },
  
  // Case 8 - Rue de Courcelles
  {
    id: 8,
    name: "Rue de Courcelles",
    type: "property",
    description: "Propriété bleu clair",
    color: "lightblue",
    price: 100,
    rent: [6, 30, 90, 270, 400, 550],
    houseCost: 50,
    hotelCost: 50
  },
  
  // Case 9 - Avenue de la République
  {
    id: 9,
    name: "Avenue de la République",
    type: "property",
    description: "Propriété bleu clair",
    color: "lightblue",
    price: 120,
    rent: [8, 40, 100, 300, 450, 600],
    houseCost: 50,
    hotelCost: 50
  },
  
  // Case 10 - Prison
  {
    id: 10,
    name: "Prison",
    type: "corner",
    description: "Simple visite ou en prison",
    color: null,
    price: null,
    rent: null
  },
  
  // Case 11 - Boulevard de la Villette
  {
    id: 11,
    name: "Boulevard de la Villette",
    type: "property",
    description: "Propriété rose",
    color: "pink",
    price: 140,
    rent: [10, 50, 150, 450, 625, 750],
    houseCost: 100,
    hotelCost: 100
  },
  
  // Case 12 - Compagnie d'électricité
  {
    id: 12,
    name: "Compagnie d'électricité",
    type: "utility",
    description: "Service public",
    color: null,
    price: 150,
    rent: null // Calculé selon les dés
  },
  
  // Case 13 - Avenue de Neuilly
  {
    id: 13,
    name: "Avenue de Neuilly",
    type: "property",
    description: "Propriété rose",
    color: "pink",
    price: 140,
    rent: [10, 50, 150, 450, 625, 750],
    houseCost: 100,
    hotelCost: 100
  },
  
  // Case 14 - Rue de Paradis
  {
    id: 14,
    name: "Rue de Paradis",
    type: "property",
    description: "Propriété rose",
    color: "pink",
    price: 160,
    rent: [12, 60, 180, 500, 700, 900],
    houseCost: 100,
    hotelCost: 100
  },
  
  // Case 15 - Gare du Nord
  {
    id: 15,
    name: "Gare du Nord",
    type: "station",
    description: "Gare",
    color: null,
    price: 200,
    rent: [25, 50, 100, 200]
  },
  
  // Case 16 - Avenue Mozart
  {
    id: 16,
    name: "Avenue Mozart",
    type: "property",
    description: "Propriété orange",
    color: "orange",
    price: 180,
    rent: [14, 70, 200, 550, 750, 950],
    houseCost: 100,
    hotelCost: 100
  },
  
  // Case 17 - Caisse de communauté
  {
    id: 17,
    name: "Caisse de Communauté",
    type: "community-chest",
    description: "Tirez une carte Caisse de Communauté",
    color: null,
    price: null,
    rent: null
  },
  
  // Case 18 - Boulevard Saint-Michel
  {
    id: 18,
    name: "Boulevard Saint-Michel",
    type: "property",
    description: "Propriété orange",
    color: "orange",
    price: 180,
    rent: [14, 70, 200, 550, 750, 950],
    houseCost: 100,
    hotelCost: 100
  },
  
  // Case 19 - Place Pigalle
  {
    id: 19,
    name: "Place Pigalle",
    type: "property",
    description: "Propriété orange",
    color: "orange",
    price: 200,
    rent: [16, 80, 220, 600, 800, 1000],
    houseCost: 100,
    hotelCost: 100
  },
  
  // Case 20 - Parc Gratuit
  {
    id: 20,
    name: "Parc Gratuit",
    type: "corner",
    description: "Repos gratuit",
    color: null,
    price: null,
    rent: null
  },
  
  // Case 21 - Avenue Matignon
  {
    id: 21,
    name: "Avenue Matignon",
    type: "property",
    description: "Propriété rouge",
    color: "red",
    price: 220,
    rent: [18, 90, 250, 700, 875, 1050],
    houseCost: 150,
    hotelCost: 150
  },
  
  // Case 22 - Chance
  {
    id: 22,
    name: "Chance",
    type: "chance",
    description: "Tirez une carte Chance",
    color: null,
    price: null,
    rent: null
  },
  
  // Case 23 - Boulevard Malesherbes
  {
    id: 23,
    name: "Boulevard Malesherbes",
    type: "property",
    description: "Propriété rouge",
    color: "red",
    price: 220,
    rent: [18, 90, 250, 700, 875, 1050],
    houseCost: 150,
    hotelCost: 150
  },
  
  // Case 24 - Avenue Henri-Martin
  {
    id: 24,
    name: "Avenue Henri-Martin",
    type: "property",
    description: "Propriété rouge",
    color: "red",
    price: 240,
    rent: [20, 100, 300, 750, 925, 1100],
    houseCost: 150,
    hotelCost: 150
  },
  
  // Case 25 - Gare de Lyon
  {
    id: 25,
    name: "Gare de Lyon",
    type: "station",
    description: "Gare",
    color: null,
    price: 200,
    rent: [25, 50, 100, 200]
  },
  
  // Case 26 - Faubourg Saint-Honoré
  {
    id: 26,
    name: "Faubourg Saint-Honoré",
    type: "property",
    description: "Propriété jaune",
    color: "yellow",
    price: 260,
    rent: [22, 110, 330, 800, 975, 1150],
    houseCost: 150,
    hotelCost: 150
  },
  
  // Case 27 - Place de la Bourse
  {
    id: 27,
    name: "Place de la Bourse",
    type: "property",
    description: "Propriété jaune",
    color: "yellow",
    price: 260,
    rent: [22, 110, 330, 800, 975, 1150],
    houseCost: 150,
    hotelCost: 150
  },
  
  // Case 28 - Compagnie des eaux
  {
    id: 28,
    name: "Compagnie des eaux",
    type: "utility",
    description: "Service public",
    color: null,
    price: 150,
    rent: null // Calculé selon les dés
  },
  
  // Case 29 - Rue de la Paix
  {
    id: 29,
    name: "Rue de la Paix",
    type: "property",
    description: "Propriété jaune",
    color: "yellow",
    price: 280,
    rent: [24, 120, 360, 850, 1025, 1200],
    houseCost: 150,
    hotelCost: 150
  },
  
  // Case 30 - Allez en prison
  {
    id: 30,
    name: "Allez en prison",
    type: "corner",
    description: "Allez directement en prison",
    color: null,
    price: null,
    rent: null
  },
  
  // Case 31 - Avenue des Champs-Élysées
  {
    id: 31,
    name: "Avenue des Champs-Élysées",
    type: "property",
    description: "Propriété verte",
    color: "green",
    price: 300,
    rent: [26, 130, 390, 900, 1100, 1275],
    houseCost: 200,
    hotelCost: 200
  },
  
  // Case 32 - Rue de la Paix
  {
    id: 32,
    name: "Rue de la Paix",
    type: "property",
    description: "Propriété verte",
    color: "green",
    price: 300,
    rent: [26, 130, 390, 900, 1100, 1275],
    houseCost: 200,
    hotelCost: 200
  },
  
  // Case 33 - Caisse de communauté
  {
    id: 33,
    name: "Caisse de Communauté",
    type: "community-chest",
    description: "Tirez une carte Caisse de Communauté",
    color: null,
    price: null,
    rent: null
  },
  
  // Case 34 - Avenue de Breteuil
  {
    id: 34,
    name: "Avenue de Breteuil",
    type: "property",
    description: "Propriété verte",
    color: "green",
    price: 320,
    rent: [28, 150, 450, 1000, 1200, 1400],
    houseCost: 200,
    hotelCost: 200
  },
  
  // Case 35 - Gare Saint-Lazare
  {
    id: 35,
    name: "Gare Saint-Lazare",
    type: "station",
    description: "Gare",
    color: null,
    price: 200,
    rent: [25, 50, 100, 200]
  },
  
  // Case 36 - Chance
  {
    id: 36,
    name: "Chance",
    type: "chance",
    description: "Tirez une carte Chance",
    color: null,
    price: null,
    rent: null
  },
  
  // Case 37 - Avenue Foch
  {
    id: 37,
    name: "Avenue Foch",
    type: "property",
    description: "Propriété bleu foncé",
    color: "darkblue",
    price: 350,
    rent: [35, 175, 500, 1100, 1300, 1500],
    houseCost: 200,
    hotelCost: 200
  },
  
  // Case 38 - Taxe de luxe
  {
    id: 38,
    name: "Taxe de luxe",
    type: "tax",
    description: "Payez 100€",
    color: null,
    price: 100,
    rent: null
  },
  
  // Case 39 - Rue de la Paix
  {
    id: 39,
    name: "Rue de la Paix",
    type: "property",
    description: "Propriété bleu foncé",
    color: "darkblue",
    price: 400,
    rent: [50, 200, 600, 1400, 1700, 2000],
    houseCost: 200,
    hotelCost: 200
  }
];

// Groupes de propriétés par couleur
const PROPERTY_GROUPS = {
  brown: [1, 3],
  lightblue: [6, 8, 9],
  pink: [11, 13, 14],
  orange: [16, 18, 19],
  red: [21, 23, 24],
  yellow: [26, 27, 29],
  green: [31, 32, 34],
  darkblue: [37, 39]
};

// Gares
const STATIONS = [5, 15, 25, 35];

// Services publics
const UTILITIES = [12, 28];

// Cases spéciales
const SPECIAL_SQUARES = {
  START: 0,
  JAIL: 10,
  FREE_PARKING: 20,
  GO_TO_JAIL: 30
};

// Cases Chance
const CHANCE_SQUARES = [7, 22, 36];

// Cases Caisse de Communauté
const COMMUNITY_CHEST_SQUARES = [2, 17, 33];

// Cases d'impôts
const TAX_SQUARES = [4, 38];

module.exports = {
  BOARD_DATA,
  PROPERTY_GROUPS,
  STATIONS,
  UTILITIES,
  SPECIAL_SQUARES,
  CHANCE_SQUARES,
  COMMUNITY_CHEST_SQUARES,
  TAX_SQUARES
}; 