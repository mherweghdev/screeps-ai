// src/roles/harvester.js

const logger = require('../utils/logger');

module.exports = {
  run(creep) {
    // Si pas de source assignée, en trouver une
    if (!creep.memory.sourceId) {
      const source = creep.pos.findClosestByPath(FIND_SOURCES);
      if (source) {
        creep.memory.sourceId = source.id;
        logger.debug('Harvester', `${creep.name} assigned to source ${source.id}`);
      }
    }

    const source = Game.getObjectById(creep.memory.sourceId);
    if (!source) {
      delete creep.memory.sourceId;
      return;
    }

    // Harvest
    if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
      creep.moveTo(source, {
        visualizePathStyle: { stroke: '#ffaa00' },
        reusePath: 5
      });
    }

    // Si plein, déposer dans le spawn/extension le plus proche
    if (creep.store.getFreeCapacity() === 0) {
      const target = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
        filter: s => {
          return (s.structureType === STRUCTURE_SPAWN ||
                  s.structureType === STRUCTURE_EXTENSION) &&
                 s.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
        }
      });

      if (target) {
        if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          creep.moveTo(target, {
            visualizePathStyle: { stroke: '#ffffff' },
            reusePath: 5
          });
        }
      }
    }
  }
};