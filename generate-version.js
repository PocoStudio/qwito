import fs from 'fs';

// Générer une version basée sur la date/heure actuelle
function generateVersion() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  
  // Version format: année.mois.jour.heure
  const version = `${year}.${month}.${day}.${hour}${minute}`;
  const buildTime = now.getTime().toString();
  
  console.log(`📦 Génération de la version: ${version}`);
  
  // Créer le fichier version.json
  const versionInfo = {
    version,
    buildTime,
    deployDate: now.toISOString()
  };
  
  // Écrire dans public/version.json
  fs.writeFileSync('./public/version.json', JSON.stringify(versionInfo, null, 2));
  console.log('✅ Fichier version.json créé');
  
  // Mettre à jour package.json avec la nouvelle version
  const packagePath = './package.json';
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
  packageJson.version = version;
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
  console.log(`✅ Version ${version} mise à jour dans package.json`);
  
  return versionInfo;
}

// Exécuter directement
generateVersion();