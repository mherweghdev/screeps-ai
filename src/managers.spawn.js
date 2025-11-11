// src/managers/spawn.manager.js

const logger = require('./utils.logger');
const helpers = require('./utils.helpers');
const CONSTANTS = require('./config.constants');


module.exports = {
  run(room) {
    logger.startCPU('SpawnManager');

    const spawn = room.find(FIND_MY_SPAWNS)[0];
    if (!spawn || spawn.spawning) {
      logger.endCPU('SpawnManager');
      return;
    }

    // Compter les creeps par rôle
    const creepsByRole = this.countCreepsByRole(room);
    
    // Vérifier si on a besoin de spawner
    const roleToSpawn = this.getRoleToSpawn(creepsByRole);
    
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

  countCreepsByRole(room) {
    const counts = {};
    
    // Initialiser tous les rôles à 0
    for (const role in CONSTANTS.ROLES) {
      counts[CONSTANTS.ROLES[role]] = 0;
    }

    // Compter les creeps de cette room
    for (const name in Game.creeps) {
      const creep = Game.creeps[name];
      if (creep.room.name === room.name && creep.memory.role) {
        counts[creep.memory.role]++;
      }
    }

    logger.debug('SpawnManager', 'Creep counts', counts);
    return counts;
  },

  getRoleToSpawn(creepsByRole) {
    // Créer une liste des rôles en déficit
    const deficits = [];

    for (const [role, count] of Object.entries(creepsByRole)) {
      const target = CONSTANTS.TARGET_POPULATION[role] || 0;
      if (count < target) {
        deficits.push({
          role,
          deficit: target - count,
          priority: CONSTANTS.SPAWN_PRIORITY[role] || 999
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

    logger.info('SpawnManager', `Need to spawn: ${deficits[0].role}`);
    return deficits[0].role;
  },

  spawnCreep(spawn, role, room) {
    const availableEnergy = helpers.getRoomEnergy(room);
    const bodyConfig = CONSTANTS.BODY_PARTS[role];

    if (!bodyConfig) {
      logger.error('SpawnManager', `No body config for role: ${role}`);
      return ERR_INVALID_ARGS;
    }

    // Adapter les body parts selon le RCL et le rôle
    let body;
    if (role === 'harvester' && room.controller.level >= 3) {
      // RCL 3+ : Harvesters statiques (que du WORK)
      const staticConfig = {
        300: [WORK, WORK, MOVE],
        550: [WORK, WORK, WORK, WORK, MOVE],
        800: [WORK, WORK, WORK, WORK, WORK, WORK, MOVE, MOVE]
      };
      body = helpers.getOptimalBody(role, availableEnergy, staticConfig);
    } else {
      // RCL 1-2 ou autres rôles : config normale
      body = helpers.getOptimalBody(role, availableEnergy, bodyConfig);
    }

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
      logger.info('SpawnManager', `✅ Spawning ${name} (cost: ${cost}, RCL: ${room.controller.level})`);
    } else {
      logger.error('SpawnManager', `❌ Failed to spawn ${role}: ${result}`);
    }

    return result;
  }
};