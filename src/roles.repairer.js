// roles.repairer.js

const logger = require('utils.logger');

module.exports = {
  run(creep) {
    // Gérer les états working/collecting
    if (creep.memory.repairing && creep.store[RESOURCE_ENERGY] === 0) {
      creep.memory.repairing = false;
      creep.say('🔄 collect');
    }
    if (!creep.memory.repairing && creep.store.getFreeCapacity() === 0) {
      creep.memory.repairing = true;
      creep.say('🔧 repair');
    }

    if (creep.memory.repairing) {
      this.repairStructures(creep);
    } else {
      this.collectEnergy(creep);
    }
  },

  repairStructures(creep) {
    let target = null;

    // Si on a déjà une cible en mémoire, la vérifier
    if (creep.memory.repairTarget) {
      target = Game.getObjectById(creep.memory.repairTarget);
      if (!target || target.hits === target.hitsMax) {
        delete creep.memory.repairTarget;
        target = null;
      }
    }

    // Si pas de cible, en trouver une nouvelle
    if (!target) {
      target = this.findRepairTarget(creep);
      if (target) {
        creep.memory.repairTarget = target.id;
      }
    }

    if (target) {
      if (creep.repair(target) === ERR_NOT_IN_RANGE) {
        creep.moveTo(target, {
          visualizePathStyle: { stroke: '#00ff00' },
          reusePath: 5
        });
      }

      // Afficher les HP de la cible
      if (Game.time % 5 === 0) {
        const percent = ((target.hits / target.hitsMax) * 100).toFixed(0);
        creep.say(`🔧 ${percent}%`);
      }
    } else {
      // Pas de réparation nécessaire, upgrader le controller
      if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
        creep.moveTo(creep.room.controller, {
          visualizePathStyle: { stroke: '#ffffff' },
          reusePath: 10
        });
      }
    }
  },

  findRepairTarget(creep) {
    // Priorités de réparation avec seuils spécifiques
    const repairPriorities = [
      {
        // Critique : Structures essentielles < 50%
        filter: s => (s.structureType === STRUCTURE_SPAWN ||
                     s.structureType === STRUCTURE_TOWER ||
                     s.structureType === STRUCTURE_STORAGE ||
                     s.structureType === STRUCTURE_CONTAINER) &&
                     s.hits < s.hitsMax * 0.5,
        maxHits: Infinity
      },
      {
        // Important : Routes et containers < 80%
        filter: s => (s.structureType === STRUCTURE_ROAD ||
                     s.structureType === STRUCTURE_CONTAINER) &&
                     s.hits < s.hitsMax * 0.8,
        maxHits: Infinity
      },
      {
        // Normal : Extensions et autres structures < 90%
        filter: s => (s.structureType === STRUCTURE_EXTENSION ||
                     s.structureType === STRUCTURE_LINK ||
                     s.structureType === STRUCTURE_EXTRACTOR) &&
                     s.hits < s.hitsMax * 0.9,
        maxHits: Infinity
      },
      {
        // Défense : Ramparts et walls (limité)
        filter: s => (s.structureType === STRUCTURE_RAMPART ||
                     s.structureType === STRUCTURE_WALL) &&
                     s.hits < 10000, // Limiter les repairs infinis
        maxHits: 10000
      }
    ];

    // Chercher par ordre de priorité
    for (const priority of repairPriorities) {
      const structures = creep.room.find(FIND_STRUCTURES, {
        filter: priority.filter
      });

      if (structures.length > 0) {
        // Trier par % de HP (réparer le plus endommagé en premier)
        structures.sort((a, b) => {
          const ratioA = a.hits / a.hitsMax;
          const ratioB = b.hits / b.hitsMax;
          return ratioA - ratioB;
        });

        return structures[0];
      }
    }

    return null;
  },

  collectEnergy(creep) {
    // Priorité 1 : Container avec énergie
    const containers = creep.room.find(FIND_STRUCTURES, {
      filter: s => s.structureType === STRUCTURE_CONTAINER &&
                   s.store[RESOURCE_ENERGY] > 50
    });

    if (containers.length > 0) {
      const target = creep.pos.findClosestByPath(containers);
      if (target) {
        if (creep.withdraw(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          creep.moveTo(target, {
            visualizePathStyle: { stroke: '#ffaa00' },
            reusePath: 5
          });
        }
        return;
      }
    }

    // Priorité 2 : Storage
    if (creep.room.storage && creep.room.storage.store[RESOURCE_ENERGY] > 100) {
      if (creep.withdraw(creep.room.storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
        creep.moveTo(creep.room.storage, {
          visualizePathStyle: { stroke: '#ffaa00' },
          reusePath: 5
        });
      }
      return;
    }

    // Priorité 3 : Énergie au sol
    const droppedEnergy = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
      filter: r => r.resourceType === RESOURCE_ENERGY && r.amount > 50
    });

    if (droppedEnergy) {
      if (creep.pickup(droppedEnergy) === ERR_NOT_IN_RANGE) {
        creep.moveTo(droppedEnergy, {
          visualizePathStyle: { stroke: '#ffaa00' },
          reusePath: 5
        });
      }
      return;
    }

    // Priorité 4 : Récolter directement (fallback)
    const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
    if (source) {
      if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
        creep.moveTo(source, {
          visualizePathStyle: { stroke: '#ffaa00' },
          reusePath: 5
        });
      }
    }
  }
};