/* ============================================================
   SERVICE WORKER — Gestão de Imóveis
   Gere notificações locais agendadas para vencimentos de renda
   ============================================================ */

const SW_VERSION = 'v1';
let scheduledTimers = []; // {id, timerId}

/* ---------- Instalar / Activar ---------- */
self.addEventListener('install', ()=> self.skipWaiting());
self.addEventListener('activate', ev=> ev.waitUntil(self.clients.claim()));

/* ---------- Receber mensagens da app ---------- */
self.addEventListener('message', ev=>{
  if(!ev.data) return;

  if(ev.data.type === 'schedule-notifications'){
    scheduleAll(ev.data.notifications || []);
  }
});

/* ---------- Agendar notificações ---------- */
function scheduleAll(notifications){
  // Limpar timers anteriores
  scheduledTimers.forEach(t=> clearTimeout(t.timerId));
  scheduledTimers = [];

  const now = Date.now();

  notifications.forEach(n=>{
    const delay = n.timestamp - now;
    if(delay < 0) return; // já passou

    const timerId = setTimeout(()=>{
      fireNotification(n);
    }, delay);

    scheduledTimers.push({id: n.id, timerId});
  });

  console.log(`[SW] ${scheduledTimers.length} notificação(ões) agendada(s)`);
}

/* ---------- Disparar notificação ---------- */
function fireNotification(n){
  self.registration.showNotification(n.title, {
    body: n.body,
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: n.id,           // evita duplicados
    renotify: false,
    requireInteraction: true,  // fica visível até o utilizador interagir
    data: {
      propertyId: n.propertyId,
      unitId: n.unitId,
      leaseId: n.leaseId,
      url: self.registration.scope
    }
  });
}

/* ---------- Clique na notificação ---------- */
self.addEventListener('notificationclick', ev=>{
  ev.notification.close();
  const {propertyId, unitId, url} = ev.notification.data || {};

  ev.waitUntil(
    self.clients.matchAll({type:'window', includeUncontrolled:true}).then(clients=>{
      // Se a app já está aberta, focar e navegar
      const existing = clients.find(c=> c.url.startsWith(url));
      if(existing){
        existing.focus();
        existing.postMessage({type:'open-lease', propertyId, unitId});
        return;
      }
      // Caso contrário, abrir a app
      return self.clients.openWindow(url + `?open=payments&propertyId=${propertyId}&unitId=${unitId}`);
    })
  );
});

/* ---------- Fechar notificação sem clicar ---------- */
self.addEventListener('notificationclose', ()=>{
  // não faz nada — o utilizador pode marcar mais tarde
});
