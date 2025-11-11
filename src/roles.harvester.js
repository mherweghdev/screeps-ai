// roles.harvester.js - Version optimisée (harvester statique)

const logger = require('utils.logger');

module.exports = {
  run(creep) {
    // Si pas de source assignée, en trouver une
    if (!creep.memory.sourceId) {
      const source = this.findBestSource(creep.room, creep);
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

    // Chercher un container près de la source
    if (!creep.memory.containerPos) {
      const container = source.pos.findInRange(FIND_STRUCTURES, 1, {
        filter: s => s.structureType === STRUCTURE_CONTAINER
      })[0];

      if (container) {
        creep.memory.containerPos = { x: container.pos.x, y: container.pos.y };
      }
    }

    // Si on a un container, se positionner dessus
    if (creep.memory.containerPos) {
      const containerPos = new RoomPosition(
        creep.memory.containerPos.x,
        creep.memory.containerPos.y,
        creep.room.name
      );

      // Si pas sur le container, y aller
      if (!creep.pos.isEqualTo(containerPos)) {
        creep.moveTo(containerPos, {
          visualizePathStyle: { stroke: '#ffaa00' }
        });
        return;
      }

      // Récolter en boucle (l'énergie tombe dans le container ou au sol)
      creep.harvest(source);

      // Si le container est plein et qu'on a de l'énergie, la transférer
      const container = containerPos.lookFor(LOOK_STRUCTURES)
        .find(s => s.structureType === STRUCTURE_CONTAINER);
      
      if (container && container.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
        // Container plein, déposer ailleurs si possible
        if (creep.store[RESOURCE_ENERGY] > 0) {
          const nearbyTarget = creep.pos.findInRange(FIND_MY_STRUCTURES, 1, {
            filter: s => (s.structureType === STRUCTURE_SPAWN ||
                         s.structureType === STRUCTURE_EXTENSION) &&
                         s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
          })[0];

          if (nearbyTarget) {
            creep.transfer(nearbyTarget, RESOURCE_ENERGY);
          }
        }
      }
    } else {
      // Pas de container, mode ancien (récolter et déposer)
      if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
        creep.moveTo(source, {
          visualizePathStyle: { stroke: '#ffaa00' },
          reusePath: 5
        });
      }

      // Si plein, déposer
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
  },

  // Trouve la meilleure source (la moins occupée)
  findBestSource(room, creep) {
    const sources = room.find(FIND_SOURCES);
    if (!sources.length) return null;

    // Compter les harvesters assignés à chaque source
    const assignments = {};
    sources.forEach(s => assignments[s.id] = 0);

    for (const name in Game.creeps) {
      const c = Game.creeps[name];
      if (c.memory.role === 'harvester' && 
          c.memory.sourceId && 
          assignments[c.memory.sourceId] !== undefined &&
          c.name !== creep.name) {
        assignments[c.memory.sourceId]++;
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
  }
};