// Cartes Chance
const CHANCE_CARDS = [
  {
    id: 1,
    title: "Avancez jusqu'à la case Départ",
    description: "Recevez 200€",
    effect: "move_to_position",
    targetPosition: 0,
    collectSalary: true
  },
  {
    id: 2,
    title: "Avancez jusqu'à l'Avenue Henri-Martin",
    description: "Si vous passez par la case Départ, recevez 200€",
    effect: "move_to_position",
    targetPosition: 24,
    collectSalary: true
  },
  {
    id: 3,
    title: "Avancez jusqu'à la Rue de la Paix",
    description: "Si vous passez par la case Départ, recevez 200€",
    effect: "move_to_position",
    targetPosition: 39,
    collectSalary: true
  },
  {
    id: 4,
    title: "Rendez-vous à la gare la plus proche",
    description: "Payez le double du loyer au propriétaire",
    effect: "move_to_nearest_station",
    payDouble: true
  },
  {
    id: 5,
    title: "Rendez-vous au service public le plus proche",
    description: "Payez 10 fois le montant des dés au propriétaire",
    effect: "move_to_nearest_utility",
    payMultiple: 10
  },
  {
    id: 6,
    title: "La banque vous verse un dividende de 50€",
    description: "",
    effect: "collect_money",
    amount: 50
  },
  {
    id: 7,
    title: "Carte 'Sortie de prison'",
    description: "Cette carte peut être conservée jusqu'à ce qu'elle soit utilisée",
    effect: "get_out_of_jail_card"
  },
  {
    id: 8,
    title: "Reculez de 3 cases",
    description: "",
    effect: "move_back",
    steps: 3
  },
  {
    id: 9,
    title: "Allez en prison",
    description: "Rendez-vous directement à la prison. Ne passez pas par la case Départ",
    effect: "go_to_jail"
  },
  {
    id: 10,
    title: "Faites des réparations dans tous vos immeubles",
    description: "Versez 25€ par maison et 100€ par hôtel",
    effect: "pay_per_property",
    houseValue: 25,
    hotelValue: 100
  },
  {
    id: 11,
    title: "Amende pour excès de vitesse",
    description: "Payez 15€",
    effect: "pay_money",
    amount: 15
  },
  {
    id: 12,
    title: "Avancez jusqu'à la gare Montparnasse",
    description: "Si vous passez par la case Départ, recevez 200€",
    effect: "move_to_position",
    targetPosition: 5,
    collectSalary: true
  },
  {
    id: 13,
    title: "Vous êtes imposé pour les réparations de voirie",
    description: "40€ par maison, 115€ par hôtel",
    effect: "pay_per_property",
    houseValue: 40,
    hotelValue: 115
  },
  {
    id: 14,
    title: "Votre immeuble et votre prêt rapportent",
    description: "Vous devez toucher 150€",
    effect: "collect_money",
    amount: 150
  },
  {
    id: 15,
    title: "Avancez jusqu'à Boulevard de la Villette",
    description: "Si vous passez par la case Départ, recevez 200€",
    effect: "move_to_position",
    targetPosition: 11,
    collectSalary: true
  },
  {
    id: 16,
    title: "Vous avez gagné le prix de beauté",
    description: "Recevez 10€",
    effect: "collect_money",
    amount: 10
  }
];

// Cartes Caisse de Communauté
const COMMUNITY_CHEST_CARDS = [
  {
    id: 1,
    title: "Avancez jusqu'à la case Départ",
    description: "Recevez 200€",
    effect: "move_to_position",
    targetPosition: 0,
    collectSalary: true
  },
  {
    id: 2,
    title: "Erreur de la banque en votre faveur",
    description: "Recevez 200€",
    effect: "collect_money",
    amount: 200
  },
  {
    id: 3,
    title: "Payez la note du médecin",
    description: "50€",
    effect: "pay_money",
    amount: 50
  },
  {
    id: 4,
    title: "La vente de votre stock vous rapporte",
    description: "50€",
    effect: "collect_money",
    amount: 50
  },
  {
    id: 5,
    title: "Carte 'Sortie de prison'",
    description: "Cette carte peut être conservée jusqu'à ce qu'elle soit utilisée",
    effect: "get_out_of_jail_card"
  },
  {
    id: 6,
    title: "Allez en prison",
    description: "Rendez-vous directement à la prison. Ne passez pas par la case Départ",
    effect: "go_to_jail"
  },
  {
    id: 7,
    title: "Vous héritez",
    description: "100€",
    effect: "collect_money",
    amount: 100
  },
  {
    id: 8,
    title: "Frais de scolarité",
    description: "Payez 150€",
    effect: "pay_money",
    amount: 150
  },
  {
    id: 9,
    title: "Consultations médicales",
    description: "Payez 100€",
    effect: "pay_money",
    amount: 100
  },
  {
    id: 10,
    title: "C'est votre anniversaire",
    description: "Chaque joueur doit vous donner 10€",
    effect: "collect_from_players",
    amount: 10
  },
  {
    id: 11,
    title: "Assurance-vie arrivée à échéance",
    description: "Recevez 100€",
    effect: "collect_money",
    amount: 100
  },
  {
    id: 12,
    title: "Amende pour stationnement interdit",
    description: "Payez 10€",
    effect: "pay_money",
    amount: 10
  },
  {
    id: 13,
    title: "Vous avez gagné le deuxième prix de beauté",
    description: "Recevez 20€",
    effect: "collect_money",
    amount: 20
  },
  {
    id: 14,
    title: "Votre prêt rapporte",
    description: "Recevez 25€",
    effect: "collect_money",
    amount: 25
  },
  {
    id: 15,
    title: "Payez votre prime d'assurance",
    description: "50€",
    effect: "pay_money",
    amount: 50
  },
  {
    id: 16,
    title: "Placez votre argent, vous recevez",
    description: "100€",
    effect: "collect_money",
    amount: 100
  }
];

// Utilitaires pour les cartes
const getCardEffect = (card, gameState, playerId) => {
  const player = gameState.players.find(p => p.userId.toString() === playerId.toString());
  if (!player) return null;

  switch (card.effect) {
    case 'collect_money':
      return {
        type: 'money_change',
        playerId: playerId,
        amount: card.amount,
        description: `${player.username} reçoit ${card.amount}€`
      };

    case 'pay_money':
      return {
        type: 'money_change',
        playerId: playerId,
        amount: -card.amount,
        description: `${player.username} paie ${card.amount}€`
      };

    case 'move_to_position':
      return {
        type: 'move_player',
        playerId: playerId,
        targetPosition: card.targetPosition,
        collectSalary: card.collectSalary || false,
        description: `${player.username} se déplace vers la case ${card.targetPosition}`
      };

    case 'go_to_jail':
      return {
        type: 'go_to_jail',
        playerId: playerId,
        description: `${player.username} va en prison`
      };

    case 'get_out_of_jail_card':
      return {
        type: 'get_out_of_jail_card',
        playerId: playerId,
        description: `${player.username} reçoit une carte "Sortie de prison"`
      };

    case 'pay_per_property':
      const houses = player.properties.reduce((sum, prop) => sum + prop.houses, 0);
      const hotels = player.properties.reduce((sum, prop) => sum + (prop.hasHotel ? 1 : 0), 0);
      const totalCost = (houses * card.houseValue) + (hotels * card.hotelValue);
      
      return {
        type: 'money_change',
        playerId: playerId,
        amount: -totalCost,
        details: { houses, hotels, houseCost: card.houseValue, hotelCost: card.hotelValue },
        description: `${player.username} paie ${totalCost}€ (${houses} maisons × ${card.houseValue}€ + ${hotels} hôtels × ${card.hotelValue}€)`
      };

    case 'collect_from_players':
      const totalAmount = (gameState.players.length - 1) * card.amount;
      return {
        type: 'collect_from_all',
        playerId: playerId,
        amountPerPlayer: card.amount,
        totalAmount: totalAmount,
        description: `${player.username} reçoit ${card.amount}€ de chaque joueur (total: ${totalAmount}€)`
      };

    case 'move_to_nearest_station':
      const currentPosition = player.position;
      const stations = [5, 15, 25, 35];
      let nearestStation = stations.find(station => station > currentPosition);
      if (!nearestStation) nearestStation = stations[0]; // Retour au début

      return {
        type: 'move_to_nearest',
        playerId: playerId,
        targetPosition: nearestStation,
        propertyType: 'station',
        payDouble: card.payDouble,
        description: `${player.username} va à la gare la plus proche (case ${nearestStation})`
      };

    case 'move_to_nearest_utility':
      const utilities = [12, 28];
      let nearestUtility = utilities.find(utility => utility > currentPosition);
      if (!nearestUtility) nearestUtility = utilities[0];

      return {
        type: 'move_to_nearest',
        playerId: playerId,
        targetPosition: nearestUtility,
        propertyType: 'utility',
        payMultiple: card.payMultiple,
        description: `${player.username} va au service public le plus proche (case ${nearestUtility})`
      };

    case 'move_back':
      const newPosition = Math.max(0, player.position - card.steps);
      return {
        type: 'move_player',
        playerId: playerId,
        targetPosition: newPosition,
        collectSalary: false,
        description: `${player.username} recule de ${card.steps} cases vers la case ${newPosition}`
      };

    default:
      return null;
  }
};

module.exports = {
  CHANCE_CARDS,
  COMMUNITY_CHEST_CARDS,
  getCardEffect
}; 