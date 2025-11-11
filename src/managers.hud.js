// managers.hud.js

const logger = require('utils.logger');
const helpers = require('utils.helpers');
const CONSTANTS = require('config.constants');

module.exports = {
  run(room) {
    if (!room.controller || !room.controller.my) return;

    const visual = room.visual;
    
    // Position de départ du HUD
    const startX = 1;
    const startY = 1;
    const lineHeight = 1;
    let currentY = startY;

    // Style du panneau
    const panelStyle = {
      fill: '#1a1a1a',
      opacity: 0.85,
      stroke: '#00ff00',
      strokeWidth: 0.05
    };

    // Style du texte
    const headerStyle = {
      color: '#00ff00',
      font: 0.6,
      align: 'left',
      opacity: 0.9
    };

    const textStyle = {
      color: '#ffffff',
      font: 0.5,
      align: 'left',
      opacity: 0.85
    };

    const valueStyle = {
      color: '#00ff00',
      font: 0.5,
      align: 'left',
      opacity: 0.9
    };

    // Calculer les données
    const stats = this.calculateStats(room);

    // Dessiner le fond du panneau
    const panelWidth = 12;
    const panelHeight = 15;
    visual.rect(startX - 0.3, startY - 0.5, panelWidth, panelHeight, panelStyle);

    // === HEADER ===
    visual.text(`🏰 Room: ${room.name}`, startX, currentY, headerStyle);
    currentY += lineHeight;

    // === RCL ===
    const rclProgress = ((room.controller.progress / room.controller.progressTotal) * 100).toFixed(1);
    visual.text(`⚡ RCL ${room.controller.level}`, startX, currentY, textStyle);
    visual.text(`${rclProgress}%`, startX + 4, currentY, valueStyle);
    currentY += lineHeight * 0.8;

    // Barre de progression RCL
    this.drawProgressBar(visual, startX, currentY, 8, 0.3, 
      room.controller.progress, room.controller.progressTotal, '#00ff00');
    currentY += lineHeight;

    // === ENERGY ===
    const energyPercent = ((stats.energy / stats.energyCapacity) * 100).toFixed(0);
    const energyColor = this.getEnergyColor(energyPercent);
    
    visual.text(`⚡ Energy:`, startX, currentY, textStyle);
    visual.text(`${stats.energy}/${stats.energyCapacity}`, startX + 4, currentY, 
      { ...valueStyle, color: energyColor });
    currentY += lineHeight * 0.8;

    // Barre d'énergie
    this.drawProgressBar(visual, startX, currentY, 8, 0.3, 
      stats.energy, stats.energyCapacity, energyColor);
    currentY += lineHeight;

    // === CREEPS ===
    visual.text(`👷 Creeps: ${stats.totalCreeps}`, startX, currentY, textStyle);
    currentY += lineHeight * 0.8;

    // Détail par rôle
    for (const [role, count] of Object.entries(stats.creepsByRole)) {
      if (count > 0) {
        const icon = this.getRoleIcon(role);
        const target = CONSTANTS.TARGET_POPULATION[role] || 0;
        const color = count >= target ? '#00ff00' : '#ffaa00';
        
        visual.text(`${icon} ${role}:`, startX + 0.5, currentY, 
          { ...textStyle, font: 0.45 });
        visual.text(`${count}/${target}`, startX + 5, currentY, 
          { ...valueStyle, font: 0.45, color });
        currentY += lineHeight * 0.7;
      }
    }

    // === CPU ===
    currentY += lineHeight * 0.3;
    const cpuUsed = Game.cpu.getUsed().toFixed(1);
    const cpuLimit = Game.cpu.limit;
    const cpuPercent = ((cpuUsed / cpuLimit) * 100).toFixed(0);
    const cpuColor = this.getCPUColor(cpuPercent);

    visual.text(`💻 CPU:`, startX, currentY, textStyle);
    visual.text(`${cpuUsed}/${cpuLimit}`, startX + 4, currentY, 
      { ...valueStyle, color: cpuColor });
    currentY += lineHeight * 0.8;

    // Barre CPU
    this.drawProgressBar(visual, startX, currentY, 8, 0.3, 
      cpuUsed, cpuLimit, cpuColor);
    currentY += lineHeight;

    // === INCOME ===
    if (stats.energyIncome > 0) {
      visual.text(`📈 Income:`, startX, currentY, textStyle);
      visual.text(`+${stats.energyIncome}/tick`, startX + 4, currentY, valueStyle);
      currentY += lineHeight;
    }

    // === ALERTS ===
    if (stats.alerts.length > 0) {
      currentY += lineHeight * 0.3;
      visual.text(`⚠️ Alerts:`, startX, currentY, { ...textStyle, color: '#ff0000' });
      currentY += lineHeight * 0.8;
      
      for (const alert of stats.alerts) {
        visual.text(`• ${alert}`, startX + 0.5, currentY, 
          { ...textStyle, font: 0.45, color: '#ffaa00' });
        currentY += lineHeight * 0.7;
      }
    }

    // Timestamp
    visual.text(`⏱️ ${Game.time}`, startX, currentY + lineHeight * 0.5, 
      { ...textStyle, font: 0.4, opacity: 0.5 });
  },

  calculateStats(room) {
    const stats = {
      energy: helpers.getRoomEnergy(room),
      energyCapacity: helpers.getRoomEnergyCapacity(room),
      totalCreeps: 0,
      creepsByRole: {},
      energyIncome: 0,
      alerts: []
    };

    // Initialiser les rôles
    for (const role in CONSTANTS.ROLES) {
      stats.creepsByRole[CONSTANTS.ROLES[role]] = 0;
    }

    // Compter les creeps
    for (const name in Game.creeps) {
      const creep = Game.creeps[name];
      if (creep.room.name === room.name) {
        stats.totalCreeps++;
        if (creep.memory.role) {
          stats.creepsByRole[creep.memory.role]++;
        }
      }
    }

    // Calculer l'income (nombre de harvesters * capacité moyenne)
    const harvesters = stats.creepsByRole['harvester'] || 0;
    stats.energyIncome = harvesters * 2; // Approximation

    // Détecter les alertes
    const energyPercent = (stats.energy / stats.energyCapacity) * 100;
    if (energyPercent < 20) {
      stats.alerts.push('Low Energy');
    }

    if (stats.totalCreeps < 3) {
      stats.alerts.push('Low Population');
    }

    if (Game.cpu.bucket < 1000) {
      stats.alerts.push('Low Bucket');
    }

    // Vérifier si des spawns sont disponibles
    const spawns = room.find(FIND_MY_SPAWNS);
    const busySpawns = spawns.filter(s => s.spawning).length;
    if (busySpawns === spawns.length && spawns.length > 0) {
      stats.alerts.push('All Spawns Busy');
    }

    return stats;
  },

  drawProgressBar(visual, x, y, width, height, current, max, color) {
    const percent = Math.min(current / max, 1);
    const filledWidth = width * percent;

    // Fond de la barre
    visual.rect(x, y, width, height, {
      fill: '#333333',
      opacity: 0.5,
      stroke: '#555555',
      strokeWidth: 0.02
    });

    // Partie remplie
    if (filledWidth > 0) {
      visual.rect(x, y, filledWidth, height, {
        fill: color,
        opacity: 0.8
      });
    }

    // Texte au centre
    const percentText = `${(percent * 100).toFixed(0)}%`;
    visual.text(percentText, x + width / 2, y + height / 2 + 0.1, {
      color: '#ffffff',
      font: 0.3,
      align: 'center',
      opacity: 0.9
    });
  },

  getRoleIcon(role) {
    const icons = {
      harvester: '⛏️',
      hauler: '🚚',
      upgrader: '⚡',
      builder: '🔨',
      repairer: '🔧'
    };
    return icons[role] || '👷';
  },

  getEnergyColor(percent) {
    if (percent < 20) return '#ff0000';
    if (percent < 40) return '#ff8800';
    if (percent < 60) return '#ffaa00';
    return '#00ff00';
  },

  getCPUColor(percent) {
    if (percent > 90) return '#ff0000';
    if (percent > 75) return '#ff8800';
    if (percent > 50) return '#ffaa00';
    return '#00ff00';
  }
};