// src/utils/helpers.js

const logger = require('./logger');

module.exports = {
  /**
   * Calcule le body optimal selon l'énergie disponible
   */
  getOptimalBody(role, availableEnergy, bodyConfig) {
    const sortedConfigs = Object.keys(bodyConfig)
      .map(e => parseInt(e))
      .sort((a, b) => b - a); // Du plus cher au moins cher

    for (const energyCost of sortedConfigs) {
      if (availableEnergy >= energyCost) {
        return bodyConfig[energyCost];
      }
    }

    return bodyConfig[sortedConfigs[sortedConfigs.length - 1]];
  },

  /**
   * Calcule le coût d'un body
   */
  getBodyCost(body) {
    return body.reduce((cost, part) => cost + BODYPART_COST[part], 0);
  },

  /**
   * Trouve la source la moins assignée
   */
  findBestSource(room) {
    const sources = room.find(FIND_SOURCES);
    if (!sources.length) return null;

    // Compter les creeps assignés à chaque source
    const assignments = {};
    sources.forEach(s => assignments[s.id] = 0);

    for (const creepName in Game.creeps) {
      const creep = Game.creeps[creepName];
      if (creep.memory.sourceId && assignments[creep.memory.sourceId] !== undefined) {
        assignments[creep.memory.sourceId]++;
      }
    }

    // Trouver la source avec le moins d'assignations
    let bestSource = sources[0];
    let minAssignments = assignments[bestSource.id];

    for (const source of sources) {
      if (assignments[source.id] < minAssignments) {
        bestSource = source;
        minAssignments = assignments[source.id];
      }
    }

    return bestSource;
  },

  /**
   * Nettoie la mémoire des creeps morts
   */
  cleanMemory() {
    let cleaned = 0;
    for (const name in Memory.creeps) {
      if (!Game.creeps[name]) {
        delete Memory.creeps[name];
        cleaned++;
      }
    }
    if (cleaned > 0) {
      logger.info('Memory', `Cleaned ${cleaned} dead creeps from memory`);
    }
  },

  /**
   * Récupère l'énergie disponible (stockée + capacité)
   */
  getRoomEnergy(room) {
    const structures = room.find(FIND_MY_STRUCTURES, {
      filter: s => s.structureType === STRUCTURE_SPAWN || 
                   s.structureType === STRUCTURE_EXTENSION
    });

    return structures.reduce((total, s) => total + s.store.getUsedCapacity(RESOURCE_ENERGY), 0);
  },

  /**
   * Récupère la capacité totale d'énergie
   */
  getRoomEnergyCapacity(room) {
    const structures = room.find(FIND_MY_STRUCTURES, {
      filter: s => s.structureType === STRUCTURE_SPAWN || 
                   s.structureType === STRUCTURE_EXTENSION
    });

    return structures.reduce((total, s) => total + s.store.getCapacity(RESOURCE_ENERGY), 0);
  },

  /**
   * Trouve une structure à remplir
   */
  findEnergyTarget(creep) {
    const targets = creep.room.find(FIND_MY_STRUCTURES, {
      filter: s => {
        return (s.structureType === STRUCTURE_SPAWN ||
                s.structureType === STRUCTURE_EXTENSION ||
                s.structureType === STRUCTURE_TOWER) &&
               s.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
      }
    });

    if (targets.length > 0) {
      return creep.pos.findClosestByPath(targets);
    }
    return null;
  },

  /**
   * Trouve une construction à builder
   */
  findConstructionSite(creep) {
    const sites = creep.room.find(FIND_CONSTRUCTION_SITES);
    if (sites.length > 0) {
      return creep.pos.findClosestByPath(sites);
    }
    return null;
  },

  /**
   * Trouve une structure à réparer
   */
  findRepairTarget(creep, maxHits = 100000) {
    const structures = creep.room.find(FIND_STRUCTURES, {
      filter: s => s.hits < s.hitsMax && 
                   s.hits < maxHits &&
                   s.structureType !== STRUCTURE_WALL
    });

    if (structures.length > 0) {
      // Trier par % de vie restante
      structures.sort((a, b) => (a.hits / a.hitsMax) - (b.hits / b.hitsMax));
      return structures[0];
    }
    return null;
  }
};