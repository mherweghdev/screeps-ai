// managers.population.js

const logger = require('utils.logger');
const CONSTANTS = require('config.constants');

module.exports = {
  /**
   * Calcule la population cible optimale selon le RCL et les conditions de la room
   */
  getOptimalPopulation(room) {
    const rcl = room.controller.level;
    const sources = room.find(FIND_SOURCES);
    const numSources = sources.length;
    
    // Calculer l'énergie disponible
    const energyCapacity = room.energyCapacityAvailable;
    const energyAvailable = room.energyAvailable;
    const energyRatio = energyAvailable / energyCapacity;

    // Vérifier s'il y a des construction sites
    const constructionSites = room.find(FIND_CONSTRUCTION_SITES);
    const hasConstruction = constructionSites.length > 0;

    // Vérifier s'il y a des structures endommagées
    const damagedStructures = room.find(FIND_STRUCTURES, {
      filter: s => s.hits < s.hitsMax && 
                   (s.structureType === STRUCTURE_ROAD || 
                    s.structureType === STRUCTURE_CONTAINER)
    });
    const needsRepair = damagedStructures.length > 5;

    const population = {
      harvester: 0,
      hauler: 0,
      upgrader: 0,
      builder: 0,
      repairer: 0
    };

    // === RCL 1 : Mode Survie ===
    if (rcl === 1) {
      population.harvester = Math.min(numSources * 2, 4); // Multi-role harvesters
      population.hauler = 0; // Pas encore de haulers
      population.upgrader = 1; // 1 upgrader pour atteindre RCL 2
      population.builder = 0;
      population.repairer = 0;
    }

    // === RCL 2 : Transition ===
    else if (rcl === 2) {
      population.harvester = numSources; // 1 par source
      population.hauler = Math.max(2, numSources); // Commencer les haulers
      population.upgrader = 2;
      population.builder = hasConstruction ? 1 : 0;
      population.repairer = 0;
    }

    // === RCL 3-4 : Croissance ===
    else if (rcl >= 3 && rcl <= 4) {
      population.harvester = numSources; // 1 par source (statique)
      population.hauler = Math.max(3, numSources + 1); // Augmenter les haulers
      population.upgrader = 2;
      population.builder = hasConstruction ? 2 : 1;
      population.repairer = needsRepair ? 1 : 0;
    }

    // === RCL 5-6 : Production ===
    else if (rcl >= 5 && rcl <= 6) {
      population.harvester = numSources;
      population.hauler = Math.max(4, numSources + 2);
      population.upgrader = 3; // Plus d'upgraders
      population.builder = hasConstruction ? 2 : 1;
      population.repairer = 1; // Toujours 1 repairer
    }

    // === RCL 7-8 : Optimisation Maximale ===
    else if (rcl >= 7) {
      population.harvester = numSources;
      population.hauler = Math.max(5, numSources + 3);
      population.upgrader = energyRatio > 0.8 ? 5 : 3; // Plus d'upgraders si énergie abondante
      population.builder = hasConstruction ? 3 : 1;
      population.repairer = 2;
    }

    // Ajustements selon l'énergie disponible
    if (energyRatio < 0.3) {
      // Mode économie d'énergie : réduire les upgraders et builders
      logger.warn('PopulationManager', `Low energy (${(energyRatio * 100).toFixed(0)}%), reducing population`);
      population.upgrader = Math.max(1, Math.floor(population.upgrader / 2));
      population.builder = hasConstruction ? 1 : 0;
    }

    // Log des changements
    if (Game.time % 100 === 0) {
      logger.info('PopulationManager', `RCL ${rcl} - Target population:`, population);
    }

    return population;
  },

  /**
   * Analyse l'état de la room et suggère des ajustements
   */
  analyzeRoomNeeds(room) {
    const population = this.getOptimalPopulation(room);
    const currentPopulation = this.getCurrentPopulation(room);
    
    const analysis = {
      needs: [],
      warnings: [],
      suggestions: []
    };

    // Comparer avec la population actuelle
    for (const role in population) {
      const target = population[role];
      const current = currentPopulation[role] || 0;
      const deficit = target - current;

      if (deficit > 0) {
        analysis.needs.push({
          role: role,
          current: current,
          target: target,
          deficit: deficit
        });
      }
    }

    // Vérifications critiques
    if (currentPopulation.harvester === 0) {
      analysis.warnings.push('CRITICAL: No harvesters! Energy production stopped!');
    }

    if (currentPopulation.harvester < room.find(FIND_SOURCES).length) {
      analysis.warnings.push('WARNING: Not enough harvesters for all sources');
    }

    // Suggestions
    const energyRatio = room.energyAvailable / room.energyCapacityAvailable;
    if (energyRatio > 0.9 && currentPopulation.upgrader < 5) {
      analysis.suggestions.push('High energy available - consider more upgraders');
    }

    if (room.find(FIND_CONSTRUCTION_SITES).length > 10 && currentPopulation.builder < 2) {
      analysis.suggestions.push('Many construction sites - consider more builders');
    }

    return analysis;
  },

  /**
   * Compte la population actuelle par rôle
   */
  getCurrentPopulation(room) {
    const population = {
      harvester: 0,
      hauler: 0,
      upgrader: 0,
      builder: 0,
      repairer: 0
    };

    for (const name in Game.creeps) {
      const creep = Game.creeps[name];
      if (creep.room.name === room.name && creep.memory.role) {
        if (population[creep.memory.role] !== undefined) {
          population[creep.memory.role]++;
        }
      }
    }

    return population;
  },

  /**
   * Visualise la population sur le HUD
   */
  visualizePopulation(room, visual) {
    const optimal = this.getOptimalPopulation(room);
    const current = this.getCurrentPopulation(room);

    let y = 5;
    visual.text('Population Analysis', 40, y, {
      color: '#00ff00',
      font: 0.6,
      align: 'left'
    });

    y += 1;
    for (const role in optimal) {
      const target = optimal[role];
      const curr = current[role];
      const color = curr >= target ? '#00ff00' : (curr === 0 ? '#ff0000' : '#ffaa00');

      visual.text(`${role}: ${curr}/${target}`, 40, y, {
        color: color,
        font: 0.5,
        align: 'left'
      });

      y += 0.8;
    }
  },

  /**
   * Ajuste automatiquement les priorités de spawn selon les besoins
   */
  getSpawnPriorities(room) {
    const analysis = this.analyzeRoomNeeds(room);
    const priorities = {};

    // Priorité de base
    const basePriorities = {
      harvester: 1,
      hauler: 2,
      upgrader: 3,
      builder: 4,
      repairer: 5
    };

    // Ajuster les priorités selon les besoins critiques
    for (const need of analysis.needs) {
      if (need.role === 'harvester' && need.current === 0) {
        // CRITIQUE : Pas de harvester
        priorities[need.role] = 0;
      } else if (need.role === 'harvester' && need.current < 2) {
        // URGENT : Peu de harvesters
        priorities[need.role] = 0.5;
      } else {
        priorities[need.role] = basePriorities[need.role];
      }
    }

    // Remplir les rôles manquants avec priorités de base
    for (const role in basePriorities) {
      if (priorities[role] === undefined) {
        priorities[role] = basePriorities[role];
      }
    }

    return priorities;
  }
};