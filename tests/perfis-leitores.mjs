import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function testarPerfisLeitores(ok) {
  if (process.platform !== 'darwin') {
    console.log('NAT-04 e NAT-09 dependem do Chaveiro e do SDK do macOS.');
    return;
  }
  const raiz = fileURLToPath(new URL('..', import.meta.url));
  const pasta = mkdtempSync(path.join(tmpdir(), 'catedra-perfis-'));
  const binario = path.join(pasta, 'perfis');
  try {
    const args = ['--sdk', 'macosx', 'swiftc', 'ios/vendor/comum/PerfilLeitor.swift',
      'ios/vendor/comum/AIService.swift', 'ios/vendor/juris/Store/JurisRascunhoCache.swift',
      'tests/perfis-leitores.swift', '-o', binario];
    const compilacao = spawnSync('xcrun', args, { cwd: raiz, encoding: 'utf8' });
    if (compilacao.status !== 0) throw new Error(compilacao.stderr || compilacao.error?.message);
    const teste = spawnSync(binario, [], { cwd: raiz, encoding: 'utf8' });
    if (teste.status !== 0) throw new Error(teste.stderr || teste.error?.message || 'Falha no ensaio dos leitores');
    for (const caso of teste.stdout.trim().split('\n')) ok(true, caso);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
}

// Ensaio completo dos stores do aplicativo. Além dos casos rápidos da suíte, no
// Mac rode node tests/perfis-leitores.mjs --armazens para compilar os leitores reais.
function testarArmazens() {
  if (process.platform !== 'darwin') throw new Error('Os leitores nativos exigem macOS.');
  const raiz = fileURLToPath(new URL('..', import.meta.url));
  const pasta = mkdtempSync(path.join(tmpdir(), 'catedra-armazens-'));
  const binario = path.join(pasta, 'armazens');
  const ensaio = path.join(pasta, 'Ensaio.swift');
  try {
    writeFileSync(ensaio, String.raw`import Foundation

@main
struct TestarArmazens {
    @MainActor static func main() throws {
        let fm = FileManager.default
        let raiz = fm.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
        let app = "teste.catedra.armazens." + UUID().uuidString
        let a = PerfilLeitor(conta: UUID().uuidString, suporte: raiz, aplicativo: app)
        let b = PerfilLeitor(conta: UUID().uuidString, suporte: raiz, aplicativo: app)
        let lei = UUID()
        func abrir(_ perfil: PerfilLeitor) -> (AppStore, LibraryStore) {
            PerfilLeitor.ativar(perfil)
            return (AppStore.shared, LibraryStore())
        }
        defer {
            AppStore.encerrarPerfil()
            try? a.apagar()
            try? b.apagar()
            try? fm.removeItem(at: raiz)
        }
        let (la, ja) = abrir(a)
        la.setLeituraResposta("Resposta de A", lawID: lei, unitKey: "art", q: 0)
        ja.setNote(Data("Nota de A".utf8), isEmpty: false, for: "verbete")
        ja.encerrarPerfil()
        AppStore.encerrarPerfil()
        let (lb, jb) = abrir(b)
        precondition(lb.leituraResposta(lawID: lei, unitKey: "art", q: 0).isEmpty && jb.richNotes["verbete"] == nil)
        lb.setLeituraResposta("Resposta de B", lawID: lei, unitKey: "art", q: 0)
        jb.setNote(Data("Nota de B".utf8), isEmpty: false, for: "verbete")
        jb.encerrarPerfil()
        AppStore.encerrarPerfil()
        let (la2, ja2) = abrir(a)
        precondition(la2.leituraResposta(lawID: lei, unitKey: "art", q: 0) == "Resposta de A")
        precondition(ja2.richNotes["verbete"] == Data("Nota de A".utf8))
        ja2.encerrarPerfil()
        AppStore.encerrarPerfil()
        try a.apagar()
        // Uma gravação adiada do store antigo não pode ressuscitar o acervo excluído.
        ja2.setNote(Data("Tardia".utf8), isEmpty: false, for: "verbete")
        ja2.flushPersist()
        la2.saveNow()
        precondition(!fm.fileExists(atPath: a.raizConta.path))
        let (lb2, jb2) = abrir(b)
        precondition(lb2.leituraResposta(lawID: lei, unitKey: "art", q: 0) == "Resposta de B")
        precondition(jb2.richNotes["verbete"] == Data("Nota de B".utf8))
        print("NAT-09-ARMAZENS · AppStore e LibraryStore guardaram as anotações de A e B separadamente, recuperaram os originais offline e apagaram somente A, inclusive na presença de escrita tardia.")
    }
}
`);
    const fontes = ['mac/vendor/legis', 'mac/vendor/juris', 'ios/vendor/design'].flatMap(dir =>
      readdirSync(path.join(raiz, dir), { recursive: true }).filter(f => f.endsWith('.swift')).map(f => path.join(dir, f)));
    const sdk = flag => {
      const resultado = spawnSync('xcrun', ['--sdk', 'macosx', flag], { encoding: 'utf8' });
      if (resultado.status !== 0) throw new Error(resultado.stderr);
      return resultado.stdout.trim();
    };
    const args = ['--sdk', 'macosx', 'swiftc', '-whole-module-optimization', '-Onone',
      '-target', (process.arch === 'arm64' ? 'arm64' : 'x86_64') + '-apple-macos14.0',
      '-sdk', sdk('--show-sdk-path'), '-plugin-path', path.join(sdk('--show-sdk-platform-path'), 'Developer/usr/lib/swift/host/plugins'),
      ...fontes, 'ios/vendor/comum/PerfilLeitor.swift', 'ios/vendor/comum/CampoChavePessoal.swift', ensaio, '-o', binario];
    const compilacao = spawnSync('xcrun', args, { cwd: raiz, encoding: 'utf8' });
    if (compilacao.status !== 0) throw new Error(compilacao.stderr || compilacao.error?.message);
    const teste = spawnSync(binario, [], { cwd: raiz, encoding: 'utf8' });
    if (teste.status !== 0) throw new Error(teste.stderr || teste.error?.message);
    console.log(teste.stdout.trim());
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  testarPerfisLeitores((_, caso) => console.log(caso));
  if (process.argv.includes('--armazens')) testarArmazens();
}
