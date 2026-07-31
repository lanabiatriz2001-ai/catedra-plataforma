// Cátedra · host desktop para Windows — mesma arquitetura do app nativo do
// macOS: o app web roda de DENTRO do bundle (app/web, gerado por
// scripts/build-win.mjs), com react/supabase/auth vendorados. Login e
// sincronização falam direto com o Supabase (sem CDN, sem depender do site);
// IA e leitor de lei usam as funções serverless do deploy.
// As abas LEGIS/JURIS são as versões web embutidas (os apps SwiftUI são só macOS).
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 980,
    minHeight: 640,
    title: 'Cátedra',
    backgroundColor: '#f4f1ea',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true
    }
  });

  win.loadFile(path.join(__dirname, 'app', 'web', 'index.html'));

  // Qualquer navegação http(s) na janela é link externo (Planalto, DJe etc.)
  // — abre no navegador padrão; o app em si vive todo em file://.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file:')) {
      e.preventDefault();
      shell.openExternal(url);
    }
  });

  win.on('closed', () => { win = null; });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
app.on('activate', () => { if (!win) createWindow(); });
