// src/utils/logger.js

const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4
  };
  
  const LOG_COLORS = {
    DEBUG: '#888888',
    INFO: '#00FF00',
    WARN: '#FFAA00',
    ERROR: '#FF0000'
  };
  
  class Logger {
    constructor() {
      // Niveau de log global (changeable via console)
      this.globalLevel = LOG_LEVELS.INFO;
      
      // Niveaux par module (optionnel)
      this.moduleLevels = {};
      
      // Stats CPU par module
      this.cpuStats = {};
    }
  
    setLevel(level) {
      this.globalLevel = LOG_LEVELS[level] || LOG_LEVELS.INFO;
      console.log(`📝 Log level set to: ${level}`);
    }
  
    setModuleLevel(module, level) {
      this.moduleLevels[module] = LOG_LEVELS[level] || LOG_LEVELS.INFO;
      console.log(`📝 Log level for ${module} set to: ${level}`);
    }
  
    _shouldLog(level, module) {
      const numericLevel = LOG_LEVELS[level];
      const moduleLevel = this.moduleLevels[module];
      
      if (moduleLevel !== undefined) {
        return numericLevel >= moduleLevel;
      }
      return numericLevel >= this.globalLevel;
    }
  
    _log(level, module, message, data) {
      if (!this._shouldLog(level, module)) return;
  
      const color = LOG_COLORS[level];
      const prefix = `<span style="color:${color}">[${level}]</span> [${module}]`;
      
      if (data !== undefined) {
        console.log(`${prefix} ${message}`, JSON.stringify(data, null, 2));
      } else {
        console.log(`${prefix} ${message}`);
      }
    }
  
    debug(module, message, data) {
      this._log('DEBUG', module, message, data);
    }
  
    info(module, message, data) {
      this._log('INFO', module, message, data);
    }
  
    warn(module, message, data) {
      this._log('WARN', module, message, data);
    }
  
    error(module, message, data) {
      this._log('ERROR', module, message, data);
    }
  
    // Mesure du CPU par module
    startCPU(module) {
      this.cpuStats[module] = Game.cpu.getUsed();
    }
  
    endCPU(module) {
      if (this.cpuStats[module] === undefined) return;
      
      const used = Game.cpu.getUsed() - this.cpuStats[module];
      this.debug(module, `CPU used: ${used.toFixed(2)}`);
      
      // Stocker pour stats
      if (!Memory.stats) Memory.stats = {};
      if (!Memory.stats.cpu) Memory.stats.cpu = {};
      Memory.stats.cpu[module] = used;
    }
  
    // Afficher les stats globales
    showStats() {
      console.log('=== CPU STATS ===');
      if (Memory.stats && Memory.stats.cpu) {
        for (const [module, cpu] of Object.entries(Memory.stats.cpu)) {
          console.log(`${module}: ${cpu.toFixed(2)}`);
        }
      }
      console.log(`Total: ${Game.cpu.getUsed().toFixed(2)} / ${Game.cpu.limit}`);
      console.log('================');
    }
  }
  
  // Export singleton
  module.exports = new Logger();