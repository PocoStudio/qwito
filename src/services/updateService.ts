interface VersionInfo {
  version: string;
  buildTime: string;
  deployDate?: string;
}

class UpdateService {
  private checkInterval: NodeJS.Timeout | null = null;
  private isCheckingUpdate = false;
  private listeners: Set<(hasUpdate: boolean, newVersion?: VersionInfo) => void> = new Set();
  private currentVersion: VersionInfo | null = null;

  constructor() {
    this.loadCurrentVersion();
    this.startPeriodicCheck();
    // Vérifier au focus de la fenêtre
    window.addEventListener('focus', this.checkForUpdates.bind(this));
  }

  // Charger la version actuelle au démarrage
  private async loadCurrentVersion() {
    try {
      const response = await fetch('/version.json');
      if (response.ok) {
        this.currentVersion = await response.json();
        console.log('Version actuelle:', this.currentVersion?.version);
      }
    } catch (error) {
      console.warn('Impossible de charger la version actuelle:', error);
      this.currentVersion = { version: '1.0.0', buildTime: Date.now().toString() };
    }
  }

  // Démarrer la vérification périodique
  startPeriodicCheck(intervalMs = 3 * 60 * 1000) { // 3 minutes
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(() => {
      this.checkForUpdates();
    }, intervalMs);

    // Première vérification après 30 secondes
    setTimeout(() => this.checkForUpdates(), 30000);
  }

  // Vérifier s'il y a une mise à jour disponible
  async checkForUpdates(): Promise<boolean> {
    if (this.isCheckingUpdate || !this.currentVersion) {
      return false;
    }

    this.isCheckingUpdate = true;

    try {
      // Vérifier le fichier version.json avec un timestamp pour éviter le cache
      const response = await fetch('/version.json?' + Date.now(), {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      if (response.ok) {
        const newVersionInfo: VersionInfo = await response.json();
        
        // Comparer les versions
        if (this.isNewerVersion(newVersionInfo.version, this.currentVersion.version) ||
            this.isNewerBuild(newVersionInfo.buildTime, this.currentVersion.buildTime)) {
          console.log(`🚀 Nouvelle version disponible: ${newVersionInfo.version}`);
          this.notifyListeners(true, newVersionInfo);
          return true;
        }
      }
    } catch (error) {
      console.warn('Erreur lors de la vérification de mise à jour:', error);
    } finally {
      this.isCheckingUpdate = false;
    }

    return false;
  }

  // Comparer les versions
  private isNewerVersion(newVersion: string, currentVersion: string): boolean {
    return newVersion !== currentVersion;
  }

  // Comparer les temps de build
  private isNewerBuild(newBuildTime: string, currentBuildTime: string): boolean {
    return parseInt(newBuildTime, 10) > parseInt(currentBuildTime, 10);
  }

  // S'abonner aux notifications de mise à jour
  onUpdate(callback: (hasUpdate: boolean, newVersion?: VersionInfo) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Notifier les écouteurs
  private notifyListeners(hasUpdate: boolean, versionInfo?: VersionInfo) {
    this.listeners.forEach(callback => {
      try {
        callback(hasUpdate, versionInfo);
      } catch (error) {
        console.error('Erreur dans le callback de mise à jour:', error);
      }
    });
  }

  // Forcer le rechargement de l'application
  reloadApp() {
    // Nettoyer les caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    // Recharger la page
    window.location.reload();
  }

  // Obtenir les informations de version actuelles
  getCurrentVersion(): VersionInfo | null {
    return this.currentVersion;
  }

  // Nettoyer les ressources
  dispose() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    this.listeners.clear();
  }
}

// Instance singleton
const updateService = new UpdateService();

export default updateService;
export type { VersionInfo };