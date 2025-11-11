// managers.roads.js

const logger = require('utils.logger');

module.exports = {
  run(room) {
    if (!room.controller || !room.controller.my) return;
    if (room.controller.level < 3) return; // Attendre RCL 3 pour les roads

    // Initialiser la mémoire des roads
    if (!Memory.rooms[room.name].roads) {
      Memory.rooms[room.name].roads = {
        planned: false,
        pathsAnalyzed: false,
        heatMap: {}
      };
    }

    const roadMemory = Memory.rooms[room.name].roads;

    // Phase 1 : Analyser les chemins utilisés (tous les 1000 ticks)
    if (Game.time % 1000 === 0 || !roadMemory.pathsAnalyzed) {
      this.analyzeCreepPaths(room, roadMemory);
      roadMemory.pathsAnalyzed = true;
    }

    // Phase 2 : Planifier les roads essentielles
    if (!roadMemory.planned) {
      this.planEssentialRoads(room, roadMemory);
      roadMemory.planned = true;
    }

    // Phase 3 : Construire progressivement les roads (tous les 100 ticks)
    if (Game.time % 100 === 0) {
      this.buildRoadsFromHeatMap(room, roadMemory);
    }

    // Phase 4 : Maintenir les roads existantes
    if (Game.time % 500 === 0) {
      this.maintainRoads(room);
    }
  },

  planEssentialRoads(room, roadMemory) {
    logger.info('RoadsManager', `Planning essential roads for ${room.name}`);

    const spawn = room.find(FIND_MY_SPAWNS)[0];
    if (!spawn) return;

    const controller = room.controller;
    const sources = room.find(FIND_SOURCES);

    // Route 1 : Spawn vers Controller
    this.planRoad(spawn.pos, controller.pos, room, 'spawn-controller');

    // Route 2 : Spawn vers chaque Source
    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
      this.planRoad(spawn.pos, source.pos, room, `spawn-source${i}`);
    }

    // Route 3 : Sources vers Controller
    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
      this.planRoad(source.pos, controller.pos, room, `source${i}-controller`);
    }

    // Route 4 : Entre les sources
    if (sources.length > 1) {
      for (let i = 0; i < sources.length - 1; i++) {
        this.planRoad(sources[i].pos, sources[i + 1].pos, room, `source${i}-source${i + 1}`);
      }
    }

    logger.info('RoadsManager', `✅ Essential roads planned for ${room.name}`);
  },

  planRoad(fromPos, toPos, room, routeName) {
    const path = fromPos.findPathTo(toPos, {
      ignoreCreeps: true,
      ignoreRoads: false,
      plainCost: 2,
      swampCost: 10
    });

    let planned = 0;

    for (const step of path) {
      const pos = new RoomPosition(step.x, step.y, room.name);

      // Ne pas construire sur les structures existantes
      const structures = pos.lookFor(LOOK_STRUCTURES);
      const hasBlockingStructure = structures.some(s => 
        s.structureType !== STRUCTURE_ROAD && 
        s.structureType !== STRUCTURE_CONTAINER &&
        s.structureType !== STRUCTURE_RAMPART
      );

      if (hasBlockingStructure) continue;

      // Vérifier s'il y a déjà une road ou un site de construction
      const hasRoad = structures.some(s => s.structureType === STRUCTURE_ROAD);
      const hasConstructionSite = pos.lookFor(LOOK_CONSTRUCTION_SITES)
        .some(s => s.structureType === STRUCTURE_ROAD);

      if (!hasRoad && !hasConstructionSite) {
        // Ajouter au heat map pour construction future
        const key = `${step.x},${step.y}`;
        if (!Memory.rooms[room.name].roads.heatMap[key]) {
          Memory.rooms[room.name].roads.heatMap[key] = 0;
        }
        Memory.rooms[room.name].roads.heatMap[key] += 10; // Priorité élevée pour routes essentielles
        planned++;
      }
    }

    logger.debug('RoadsManager', `Planned ${planned} road tiles for ${routeName}`);
  },

  analyzeCreepPaths(room, roadMemory) {
    // Analyser où les creeps se déplacent réellement
    for (const name in Game.creeps) {
      const creep = Game.creeps[name];
      if (creep.room.name !== room.name) continue;

      const pos = creep.pos;
      const key = `${pos.x},${pos.y}`;

      // Incrémenter le heat map
      if (!roadMemory.heatMap[key]) {
        roadMemory.heatMap[key] = 0;
      }
      roadMemory.heatMap[key]++;
    }

    logger.debug('RoadsManager', `Heat map updated for ${room.name}`);
  },

  buildRoadsFromHeatMap(room, roadMemory) {
    const heatMap = roadMemory.heatMap;
    if (!heatMap || Object.keys(heatMap).length === 0) return;

    // Trier les positions par utilisation (heat)
    const sortedPositions = Object.entries(heatMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10); // Top 10 positions les plus utilisées

    let constructed = 0;
    const maxRoadsPerTick = 1; // Construire progressivement

    for (const [posKey, heat] of sortedPositions) {
      if (constructed >= maxRoadsPerTick) break;
      if (heat < 5) continue; // Seuil minimum d'utilisation

      const [x, y] = posKey.split(',').map(Number);
      const pos = new RoomPosition(x, y, room.name);

      // Vérifications
      const structures = pos.lookFor(LOOK_STRUCTURES);
      const hasRoad = structures.some(s => s.structureType === STRUCTURE_ROAD);
      const hasBlockingStructure = structures.some(s => 
        s.structureType !== STRUCTURE_ROAD && 
        s.structureType !== STRUCTURE_CONTAINER &&
        s.structureType !== STRUCTURE_RAMPART
      );

      if (hasRoad || hasBlockingStructure) continue;

      const hasConstructionSite = pos.lookFor(LOOK_CONSTRUCTION_SITES)
        .some(s => s.structureType === STRUCTURE_ROAD);

      if (hasConstructionSite) continue;

      // Vérifier qu'on n'a pas trop de sites de construction
      const totalSites = room.find(FIND_CONSTRUCTION_SITES).length;
      if (totalSites >= 10) break; // Limiter à 10 sites max

      // Créer le site de construction
      const result = room.createConstructionSite(pos, STRUCTURE_ROAD);
      if (result === OK) {
        constructed++;
        logger.info('RoadsManager', `🛣️ Road construction site at (${x},${y}) [heat: ${heat}]`);
      }
    }

    if (constructed > 0) {
      logger.info('RoadsManager', `Planned ${constructed} new roads`);
    }
  },

  maintainRoads(room) {
    // Trouver les roads qui ont besoin de réparations
    const roads = room.find(FIND_STRUCTURES, {
      filter: s => s.structureType === STRUCTURE_ROAD && 
                   s.hits < s.hitsMax * 0.8 // Moins de 80% HP
    });

    if (roads.length > 0) {
      logger.debug('RoadsManager', `${roads.length} roads need repair in ${room.name}`);
    }

    // Note: Le repairer role s'occupera des réparations
  },

  // Utilitaire : Visualiser le heat map (debug)
  visualizeHeatMap(room) {
    const roadMemory = Memory.rooms[room.name]?.roads;
    if (!roadMemory?.heatMap) return;

    const visual = room.visual;
    const maxHeat = Math.max(...Object.values(roadMemory.heatMap));

    for (const [posKey, heat] of Object.entries(roadMemory.heatMap)) {
      if (heat < 5) continue;

      const [x, y] = posKey.split(',').map(Number);
      const intensity = heat / maxHeat;
      const color = this.getHeatColor(intensity);

      visual.circle(x, y, {
        radius: 0.3,
        fill: color,
        opacity: 0.3 + (intensity * 0.5)
      });

      visual.text(`${heat}`, x, y + 0.2, {
        color: '#ffffff',
        font: 0.3,
        opacity: 0.8
      });
    }
  },

  getHeatColor(intensity) {
    if (intensity > 0.7) return '#ff0000'; // Rouge = très utilisé
    if (intensity > 0.4) return '#ff8800'; // Orange
    if (intensity > 0.2) return '#ffaa00'; // Jaune
    return '#00ff00'; // Vert = peu utilisé
  }
};