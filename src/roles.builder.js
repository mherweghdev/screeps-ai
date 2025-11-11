// roles.builder.js

const helpers = require('utils.helpers');

module.exports = {
  run(creep) {
    // Gérer les états working/collecting
    if (creep.memory.building && creep.store[RESOURCE_ENERGY] === 0) {
      creep.memory.building = false;
      creep.say('🔄 collect');
    }
    if (!creep.memory.building && creep.store.getFreeCapacity() === 0) {
      creep.memory.building = true;
      creep.say('🔨 build');
    }

    if (creep.memory.building) {
      this.buildStructures(creep);
    } else {
      this.collectEnergy(creep);
    }
  },

  buildStructures(creep) {
    // Chercher un site de construction
    let target = null;

    // Si on a déjà une cible en mémoire, la vérifier
    if (creep.memory.buildTarget) {
      target = Game.getObjectById(creep.memory.buildTarget);
      if (!target) {
        delete creep.memory.buildTarget;
      }
    }

    // Si pas de cible, en trouver une nouvelle
    if (!target) {
      target = this.findConstructionSite(creep);
      if (target) {
        creep.memory.buildTarget = target.id;
      }
    }

    if (target) {
      if (creep.build(target) === ERR_NOT_IN_RANGE) {
        creep.moveTo(target, {
          visualizePathStyle: { stroke: '#ffffff' },
          reusePath: 5
        });
      }
    } else {
      // Pas de construction, upgrader le controller en backup
      if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
        creep.moveTo(creep.room.controller, {
          visualizePathStyle: { stroke: '#ffffff' },
          reusePath: 10
        });
      }
    }
  },

  findConstructionSite(creep) {
    // Priorités de construction
    const priorities = [
      STRUCTURE_SPAWN,
      STRUCTURE_EXTENSION,
      STRUCTURE_TOWER,
      STRUCTURE_CONTAINER,
      STRUCTURE_STORAGE,
      STRUCTURE_ROAD,
      STRUCTURE_WALL,
      STRUCTURE_RAMPART
    ];

    // Chercher par priorité
    for (const structureType of priorities) {
      const sites = creep.room.find(FIND_CONSTRUCTION_SITES, {
        filter: s => s.structureType === structureType
      });

      if (sites.length > 0) {
        return creep.pos.findClosestByPath(sites);
      }
    }

    // Si rien trouvé avec priorité, prendre n'importe quoi
    const allSites = creep.room.find(FIND_CONSTRUCTION_SITES);
    if (allSites.length > 0) {
      return creep.pos.findClosestByPath(allSites);
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
    if (creep.room.storage && creep.room.storage.store[RESOURCE_ENERGY] > 0) {
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