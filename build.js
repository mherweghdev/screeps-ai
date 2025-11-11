const fs = require('fs');
const path = require('path');

const srcDir = 'src';
const distDir = 'dist';

// Nettoyer dist
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true });
}
fs.mkdirSync(distDir);

// Fonction récursive pour parcourir les dossiers
function flattenDirectory(dir, prefix = '') {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      flattenDirectory(filePath, prefix + file + '.');
    } else if (file.endsWith('.js')) {
      // Transformer les / en . pour le nom de fichier
      const newName = prefix + file;
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Remplacer les require relatifs
      const updatedContent = content.replace(
        /require\(['"]\.\.?\/(.*?)['"]\)/g,
        (match, p1) => {
          const cleanPath = p1.replace(/\//g, '.').replace(/\.js$/, '');
          return `require('${cleanPath}')`;
        }
      );
      
      fs.writeFileSync(path.join(distDir, newName), updatedContent);
      console.log(`✅ ${filePath} → ${newName}`);
    }
  });
}

flattenDirectory(srcDir);
console.log('🎉 Build complete!');