// Confere o mesmo motor Swift embarcado nos apps contra os 80 cenários oficiais.
// Executar no Mac: node tests/fsrs-swift.mjs.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const raiz=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(spawnSync('swiftc',['--version'],{encoding:'utf8'}).status!==0){console.log('FSRS Swift: sem compilador; verificar no Mac.');process.exit(0);}
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ct-fsrs-swift-'));
try{
  fs.writeFileSync(path.join(dir,"main.swift"),"import Foundation\nlet f=try! JSONSerialization.jsonObject(with:Data(contentsOf:URL(fileURLWithPath:CommandLine.arguments[1]))) as! [String:Any]\nvar failures=0\nfor row in f[\"rows\"] as! [[String:Any]] {\n let t=row[\"t\"] as! Int, g=row[\"g\"] as! Int, expected=row[\"expected\"] as! [String:Double]\n let now=Date(timeIntervalSince1970:1791374400)\n let memory=row[\"memory\"] as? [String:Double]\n let state=memory.map { FSRSEstado(stability:$0[\"stability\"]!,difficulty:$0[\"difficulty\"]!,lastReview:now.timeIntervalSince1970*1000-Double(t)*86400000) }\n let q=[1:2,2:3,3:4,4:5][g]!\n let result=CatedraFSRS.responder(state,intervalo:0,reps:0,ultima:nil,q:q,agora:now)\n if abs(result.estado.stability-expected[\"stability\"]!)>1e-7 || abs(result.estado.difficulty-expected[\"difficulty\"]!)>1e-7 || result.intervalo != row[\"interval\"] as! Int { failures += 1 }\n}\nprint(\"FSRS Swift: 80 vetores; divergências: \\(failures)\")\nexit(failures == 0 ? 0 : 1)\n");
  const bin=path.join(dir,'casos');
  const comp=spawnSync('swiftc',[path.join(raiz,'ios/vendor/design/FSRS.swift'),path.join(dir,'main.swift'),'-o',bin],{encoding:'utf8'});
  if(comp.status!==0)throw new Error(comp.stderr||'Falha ao compilar o motor FSRS.');
  const resultado=spawnSync(bin,[path.join(raiz,'tests/fixtures/fsrs6-oficial.json')],{encoding:'utf8'});
  console.log(resultado.stdout.trim());
  if(resultado.status!==0)throw new Error(resultado.stderr||'O motor Swift diverge dos cenários oficiais.');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
