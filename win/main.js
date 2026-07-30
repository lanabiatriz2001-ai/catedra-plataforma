// Cátedra · host desktop para Windows.
// Janela única com o app web publicado (mesmo bundle do macOS): login, sync e
// IA vêm do deploy — os dados dela ficam na conta (Supabase), como no Mac.
// Aqui não há a ponte nativa do macOS (LEGIS/JURIS SwiftUI, cronômetro na
// barra); as abas LEGIS/JURIS usam as versões web embutidas no próprio site.
const { app, BrowserWindow, shell } = require('electron');

const APP_URL = 'https://catedra-plataforma.vercel.app';

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

  win.loadURL(APP_URL);

  // Sem internet (ou deploy fora do ar): página local com botão de tentar de novo.
  win.webContents.on('did-fail-load', (_e, code, _desc, _url, isMainFrame) => {
    // -3 = ERR_ABORTED (navegação cancelada pelo próprio app) — não é queda de rede.
    if (isMainFrame && code !== -3) win.loadFile('offline.html');
  });

  // Links externos (Planalto, DJe etc.) abrem no navegador padrão, não na janela.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(APP_URL) && !url.startsWith('file:')) {
      e.preventDefault();
      shell.openExternal(url);
    }
  });

  win.on('closed', () => { win = null; });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
app.on('activate', () => { if (!win) createWindow(); });
