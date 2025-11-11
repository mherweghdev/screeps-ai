// managers.room.js

const logger = require('utils.logger');

module.exports = {
  run(room) {
    if (!room.controller || !room.controller.my) return;

    logger.startCPU('RoomManager');

    // Initialiser la mémoire de la room si nécessaire
    if (!Memory.rooms[room.name]) {
      Memory.rooms[room.name] = {
        initialized: false,
        sources: {}
      };
    }

    const roomMemory = Memory.rooms[room.name];

    // Première initialisation
    if (!roomMemory.initialized) {
      this.initializeRoom(room, roomMemory);
      roomMemory.initialized = true;
    }

    // Placer les containers près des sources (RCL >= 2)
    if (room.controller.level >= 2) {
      this.planSourceContainers(room, roomMemory);
    }

    // Nettoyer les sites de construction abandonnés
    if (Game.time % 500 === 0) {
      this.cleanupConstructionSites(room);
    }

    logger.endCPU('RoomManager');
  },

  initializeRoom(room, roomMemory) {
    logger.info('RoomManager', `Initializing room ${room.name}`);

    // Analyser les sources
    const sources = room.find(FIND_SOURCES);
    for (const source of sources) {
      roomMemory.sources[source.id] = {
        id: source.id,
        pos: { x: source.pos.x, y: source.pos.y },
        containerPlanned: false,
        containerId: null
      };
    }

    logger.info('RoomManager', `Found ${sources.length} sources in ${room.name}`);
  },

  planSourceContainers(room, roomMemory) {
    const sources = room.find(FIND_SOURCES);

    for (const source of sources) {
      const sourceData = roomMemory.sources[source.id];
      if (!sourceData) continue;

      // Si déjà planifié ou construit, skip
      if (sourceData.containerPlanned) {
        // Vérifier si le container existe
        const existingContainer = source.pos.findInRange(FIND_STRUCTURES, 1, {
          filter: s => s.structureType === STRUCTURE_CONTAINER
        })[0];

        if (existingContainer) {
          sourceData.containerId = existingContainer.id;
        }
        continue;
      }

      // Vérifier si un container existe déjà
      const existingContainer = source.pos.findInRange(FIND_STRUCTURES, 1, {
        filter: s => s.structureType === STRUCTURE_CONTAINER
      })[0];

      if (existingContainer) {
        sourceData.containerPlanned = true;
        sourceData.containerId = existingContainer.id;
        logger.info('RoomManager', `Container found near source ${source.id}`);
        continue;
      }

      // Vérifier si un site de construction existe
      const existingSite = source.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {
        filter: s => s.structureType === STRUCTURE_CONTAINER
      })[0];

      if (existingSite) {
        sourceData.containerPlanned = true;
        logger.debug('RoomManager', `Container construction site exists for source ${source.id}`);
        continue;
      }

      // Trouver la meilleure position pour le container
      const containerPos = this.findBestContainerPosition(source, room);

      if (containerPos) {
        const result = room.createConstructionSite(containerPos, STRUCTURE_CONTAINER);
        
        if (result === OK) {
          sourceData.containerPlanned = true;
          logger.info('RoomManager', `✅ Planned container at ${containerPos} for source ${source.id}`);
        } else if (result === ERR_FULL) {
          logger.warn('RoomManager', 'Too many construction sites, will retry later');
        } else {
          logger.error('RoomManager', `Failed to plan container: ${result}`);
        }
      }
    }
  },

  findBestContainerPosition(source, room) {
    // Chercher une position adjacente à la source
    const terrain = room.getTerrain();
    const positions = [];

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;

        const x = source.pos.x + dx;
        const y = source.pos.y + dy;

        // Vérifier les limites
        if (x < 1 || x > 48 || y < 1 || y > 48) continue;

        const pos = new RoomPosition(x, y, room.name);

        // Vérifier que c'est praticable
        if (terrain.get(x, y) === TERRAIN_MASK_WALL) continue;

        // Vérifier qu'il n'y a pas de structure
        const structures = pos.lookFor(LOOK_STRUCTURES);
        if (structures.length > 0) continue;

        // Calculer la distance au controller (préférer plus proche)
        const distToController = pos.getRangeTo(room.controller);

        positions.push({
          pos: pos,
          priority: distToController // Plus c'est bas, mieux c'est
        });
      }
    }

    if (positions.length === 0) return null;

    // Trier par priorité et prendre la meilleure
    positions.sort((a, b) => a.priority - b.priority);
    return positions[0].pos;
  },

  cleanupConstructionSites(room) {
    const sites = room.find(FIND_CONSTRUCTION_SITES);
    let removed = 0;

    for (const site of sites) {
      // Supprimer les sites très vieux (> 50000 ticks = ~1.4 jour)
      const createdAt = (site.memory && site.memory.createdAt) ? site.memory.createdAt : 0;
      if (Game.time - createdAt > 50000) {
        site.remove();
        removed++;
      }
    }

    if (removed > 0) {
      logger.info('RoomManager', `Cleaned up ${removed} old construction sites`);
    }
  }
};