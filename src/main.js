// main.js

const logger = require('utils.logger');
const helpers = require('utils.helpers');
const spawnManager = require('managers.spawn');
const hudManager = require('managers.hud');
const roomManager = require('managers.room');
const roadsManager = require('managers.roads');

// Roles
const roleHarvester = require('roles.harvester');
const roleHauler = require('roles.hauler');
const roleUpgrader = require('roles.upgrader');
const roleBuilder = require('roles.builder');
const roleRepairer = require('roles.repairer');

// Global: exposer le logger pour la console
global.logger = logger;

module.exports.loop = function () {
  // Nettoyer la mémoire périodiquement
  if (Game.time % 10 === 0) {
    helpers.cleanMemory();
  }

  // Pour chaque room possédée
  for (const roomName in Game.rooms) {
    const room = Game.rooms[roomName];
    
    // Skip si on ne possède pas cette room
    if (!room.controller || !room.controller.my) continue;

    // Gestion de la room (containers, etc.)
    roomManager.run(room);

    // Gestion des routes automatiques
    roadsManager.run(room);

    // Gestion du spawn
    spawnManager.run(room);

    // Afficher le HUD
    hudManager.run(room);
  }

  // Exécuter les rôles pour chaque creep
  for (const name in Game.creeps) {
    const creep = Game.creeps[name];
    const role = creep.memory.role;

    try {
      switch (role) {
        case 'harvester':
          roleHarvester.run(creep);
          break;
        case 'hauler':
          roleHauler.run(creep);
          break;
        case 'upgrader':
          roleUpgrader.run(creep);
          break;
        case 'builder':
          roleBuilder.run(creep);
          break;
        case 'repairer':
          roleRepairer.run(creep);
          break;
        default:
          logger.warn('Main', `Unknown role: ${role} for creep ${name}`);
      }
    } catch (error) {
      logger.error('Main', `Error running ${name} (${role}): ${error.message}`);
    }
  }

  // Stats CPU en fin de tick
  if (Game.time % 100 === 0) {
    logger.info('Main', `CPU: ${Game.cpu.getUsed().toFixed(2)}/${Game.cpu.limit}`);
  }
};