// managers.spawn.js

const logger = require('utils.logger');
const helpers = require('utils.helpers');
const CONSTANTS = require('config.constants');
const populationManager = require('managers.population');

module.exports = {
  run(room) {
    logger.startCPU('SpawnManager');

    const spawn = room.find(FIND_MY_SPAWNS)[0];
    if (!spawn || spawn.spawning) {
      logger.endCPU('SpawnManager');
      return;
    }

    // Utiliser la population dynamique
    const targetPopulation = populationManager.getOptimalPopulation(room);
    const currentPopulation = populationManager.getCurrentPopulation(room);
    
    // Vérifier si on a besoin de spawner
    const roleToSpawn = this.getRoleToSpawn(currentPopulation, targetPopulation, room);
    
    if (roleToSpawn) {
      this.spawnCreep(spawn, roleToSpawn, room);
    }

    // Afficher qui spawn
    if (spawn.spawning) {
      const spawningCreep = Game.creeps[spawn.spawning.name];
      room.visual.text(
        '🛠️ ' + spawningCreep.memory.role,
        spawn.pos.x + 1,
        spawn.pos.y,
        { align: 'left', opacity: 0.8 }
      );
    }

    logger.endCPU('SpawnManager');
  },

  getRoleToSpawn(currentPopulation, targetPopulation, room) {
    // Créer une liste des rôles en déficit
    const deficits = [];

    for (const role in targetPopulation) {
      const current = currentPopulation[role] || 0;
      const target = targetPopulation[role] || 0;
      
      if (current < target) {
        // Obtenir les priorités dynamiques
        const priorities = populationManager.getSpawnPriorities(room);
        
        deficits.push({
          role,
          deficit: target - current,
          priority: priorities[role] || CONSTANTS.SPAWN_PRIORITY[role] || 999
        });
      }
    }

    if (deficits.length === 0) return null;

    // Trier par priorité puis par déficit
    deficits.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return b.deficit - a.deficit;
    });

    logger.info('SpawnManager', `Need to spawn: ${deficits[0].role} (priority: ${deficits[0].priority})`);
    return deficits[0].role;
  },

  spawnCreep(spawn, role, room) {
    const availableEnergy = helpers.getRoomEnergy(room);
    const bodyConfig = CONSTANTS.BODY_PARTS[role];

    if (!bodyConfig) {
      logger.error('SpawnManager', `No body config for role: ${role}`);
      return ERR_INVALID_ARGS;
    }

    const body = helpers.getOptimalBody(role, availableEnergy, bodyConfig);
    const cost = helpers.getBodyCost(body);

    if (availableEnergy < cost) {
      logger.warn('SpawnManager', `Not enough energy: ${availableEnergy}/${cost}`);
      return ERR_NOT_ENOUGH_ENERGY;
    }

    const name = `${role}_${Game.time}`;
    const memory = {
      role: role,
      room: room.name,
      working: false
    };

    const result = spawn.spawnCreep(body, name, { memory });

    if (result === OK) {
      logger.info('SpawnManager', `✅ Spawning ${name} (cost: ${cost})`);
    } else {
      logger.error('SpawnManager', `❌ Failed to spawn ${role}: ${result}`);
    }

    return result;
  }
};