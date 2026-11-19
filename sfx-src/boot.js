"use strict";
/* Inicialização: carrega dados salvos e abre a última aba */
(async function boot(){
  initSfx(); initSettings();
  await idbLoadAll(); loadModelsIDB();
  let tab = 'sfx'; try { tab = localStorage.getItem('nexi-sfx-tab') || 'sfx'; } catch(e){}
  if (!document.querySelector(`[data-mod="${tab}"]`)) tab = 'sfx';
  showModule(tab);
})();
