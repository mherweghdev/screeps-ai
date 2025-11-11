// src/config/constants.js

module.exports = {
  // Rôles disponibles
  ROLES: {
    HARVESTER: 'harvester',
    HAULER: 'hauler',
    UPGRADER: 'upgrader',
    BUILDER: 'builder',
    REPAIRER: 'repairer'
  },

  // Priorités de spawn (plus le nombre est bas, plus c'est prioritaire)
  // Note: Ces priorités de base peuvent être overridées dynamiquement
  // par managers.population selon les besoins critiques
  SPAWN_PRIORITY: {
    harvester: 1,
    hauler: 2,
    upgrader: 3,
    builder: 4,
    repairer: 5
  },

  // Population cible par rôle - DEPRECATED
  // Utiliser managers.population.getOptimalPopulation() à la place
  // Ces valeurs sont conservées comme fallback uniquement
  TARGET_POPULATION: {
    harvester: 2,
    hauler: 3,
    upgrader: 2,
    builder: 1,
    repairer: 1
  },

  // Body parts par rôle et niveau d'énergie
  BODY_PARTS: {
    harvester: {
      // RCL 1-2 : Harvesters multi-rôles (récoltent ET transportent)
      300: [WORK, CARRY, MOVE, MOVE],
      550: [WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE],
      800: [WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE],
      // RCL 3+ : Harvesters statiques (que du WORK)
      1200: [WORK, WORK, WORK, WORK, WORK, WORK, MOVE, MOVE]
    },
    hauler: {
      300: [CARRY, CARRY, MOVE, MOVE],
      450: [CARRY, CARRY, CARRY, MOVE, MOVE, MOVE],
      600: [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE]
    },
    upgrader: {
      300: [WORK, CARRY, MOVE, MOVE],
      550: [WORK, WORK, WORK, CARRY, MOVE, MOVE],
      800: [WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE]
    },
    builder: {
      300: [WORK, CARRY, MOVE, MOVE],
      550: [WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE],
      800: [WORK, WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE]
    },
    repairer: {
      300: [WORK, CARRY, MOVE, MOVE],
      550: [WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE],
      800: [WORK, WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE]
    }
  },

  // Seuils d'énergie
  ENERGY_THRESHOLDS: {
    CRITICAL: 0.2,  // 20% = mode urgence
    LOW: 0.4,       // 40% = réduire les spawns
    NORMAL: 0.6     // 60% = mode normal
  },

  // Paramètres de performance
  PERFORMANCE: {
    PATH_CACHE_TICKS: 5,      // Recalculer le path tous les N ticks
    MEMORY_CLEANUP_TICKS: 10   // Nettoyer la mémoire tous les N ticks
  }
};