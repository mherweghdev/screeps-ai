// roles.hauler.js

const helpers = require('utils.helpers');
const logger = require('utils.logger');

module.exports = {
  run(creep) {
    // Gérer les états working/collecting
    if (creep.memory.hauling && creep.store[RESOURCE_ENERGY] === 0) {
      creep.memory.hauling = false;
      creep.say('🔄 collect');
    }
    if (!creep.memory.hauling && creep.store.getFreeCapacity() === 0) {
      creep.memory.hauling = true;
      creep.say('🚚 deliver');
    }

    if (creep.memory.hauling) {
      // Livrer l'énergie
      this.deliverEnergy(creep);
    } else {
      // Collecter l'énergie
      this.collectEnergy(creep);
    }
  },

  collectEnergy(creep) {
    // Priorité 1 : Container près des sources
    const containers = creep.room.find(FIND_STRUCTURES, {
      filter: s => s.structureType === STRUCTURE_CONTAINER &&
                   s.store[RESOURCE_ENERGY] > 0
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

    // Priorité 2 : Énergie tombée au sol
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

    // Priorité 3 : Si rien, récolter directement (fallback)
    const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
    if (source) {
      if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
        creep.moveTo(source, {
          visualizePathStyle: { stroke: '#ffaa00' },
          reusePath: 5
        });
      }
    }
  },

  deliverEnergy(creep) {
    // Priorité 1 : Spawn et Extensions
    let target = helpers.findEnergyTarget(creep);

    // Priorité 2 : Tours qui ont besoin d'énergie
    if (!target) {
      target = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_TOWER &&
                     s.store.getFreeCapacity(RESOURCE_ENERGY) > 200
      });
    }

    // Priorité 3 : Storage (si RCL >= 4)
    if (!target) {
      target = creep.room.storage;
      if (target && target.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
        target = null;
      }
    }

    // Priorité 4 : Container central (si pas de storage)
    if (!target) {
      const containers = creep.room.find(FIND_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_CONTAINER &&
                     s.store.getFreeCapacity(RESOURCE_ENERGY) > 0 &&
                     !this.isSourceContainer(s, creep.room)
      });
      if (containers.length > 0) {
        target = creep.pos.findClosestByPath(containers);
      }
    }

    if (target) {
      if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
        creep.moveTo(target, {
          visualizePathStyle: { stroke: '#ffffff' },
          reusePath: 5
        });
      }
    } else {
      // Pas de cible, aller au controller en backup
      if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
        creep.moveTo(creep.room.controller, {
          visualizePathStyle: { stroke: '#ffffff' },
          reusePath: 10
        });
      }
    }
  },

  // Vérifie si un container est près d'une source
  isSourceContainer(container, room) {
    const sources = room.find(FIND_SOURCES);
    for (const source of sources) {
      if (container.pos.inRangeTo(source, 2)) {
        return true;
      }
    }
    return false;
  }
};