// src/roles/upgrader.js

module.exports = {
    run(creep) {
      // Gérer les états working/harvesting
      if (creep.memory.working && creep.store[RESOURCE_ENERGY] === 0) {
        creep.memory.working = false;
        creep.say('🔄 harvest');
      }
      if (!creep.memory.working && creep.store.getFreeCapacity() === 0) {
        creep.memory.working = true;
        creep.say('⚡ upgrade');
      }
  
      if (creep.memory.working) {
        // Upgrade le controller
        if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
          creep.moveTo(creep.room.controller, {
            visualizePathStyle: { stroke: '#ffffff' },
            reusePath: 5
          });
        }
      } else {
        // Récolter de l'énergie
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
    }
  };