/**
 * Formate un timestamp pour l'affichage des messages
 * - Aujourd'hui: "19:45"
 * - Hier: "Hier 19:45"
 * - Cette année: "25/07 15:34"
 * - Année précédente ou plus: "25/07/2023 15:34"
 */
export function formatMessageDate(dateString: string): string {
  const messageDate = new Date(dateString);
  const now = new Date();
  
  // Calculer les dates de référence
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const messageDay = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
  
  // Formater l'heure
  const timeString = messageDate.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  // Aujourd'hui
  if (messageDay.getTime() === today.getTime()) {
    return timeString;
  }
  
  // Hier
  if (messageDay.getTime() === yesterday.getTime()) {
    return `Hier ${timeString}`;
  }
  
  // Cette année
  if (messageDate.getFullYear() === now.getFullYear()) {
    const dayMonth = messageDate.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit'
    });
    return `${dayMonth} ${timeString}`;
  }
  
  // Année différente
  const fullDate = messageDate.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  return `${fullDate} ${timeString}`;
}

/**
 * Determine si deux messages sont du même jour pour grouper l'affichage
 */
export function isSameDay(date1: string, date2: string): boolean {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

/**
 * Formate une date pour les séparateurs de jour dans le chat
 */
export function formatDaySeparator(dateString: string): string {
  const messageDate = new Date(dateString);
  const now = new Date();
  
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const messageDay = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
  
  // Aujourd'hui
  if (messageDay.getTime() === today.getTime()) {
    return "Aujourd'hui";
  }
  
  // Hier
  if (messageDay.getTime() === yesterday.getTime()) {
    return "Hier";
  }
  
  // Cette année
  if (messageDate.getFullYear() === now.getFullYear()) {
    return messageDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  }
  
  // Année différente
  return messageDate.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}
