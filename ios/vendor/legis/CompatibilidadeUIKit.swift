// Ponte AppKit → UIKit para o CátedraLEGIS, que nasceu como app de Mac.
//
// A maior parte do código é SwiftUI puro e compila nas duas plataformas sem tocar em
// nada. O que não compila é quase sempre só o NOME do tipo — no macOS chama NS…, no
// iPadOS chama UI…, com a mesma API. Concentrar essas equivalências aqui evita 44
// arquivos divergindo do original do Mac, que continua sendo a fonte.
//
// O que NÃO é renomeação pura (API realmente diferente) fica de fora de propósito: o
// compilador aponta, e a correção vai no arquivo, comentada.
import UIKit

typealias NSColor = UIColor
typealias NSImage = UIImage
typealias NSPasteboard = UIPasteboard
typealias NSFont = UIFont
typealias NSSize = CGSize
typealias NSRect = CGRect
typealias NSPoint = CGPoint

// NSViewRepresentable NÃO entra aqui de propósito: o protocolo do iPadOS exige
// makeUIView/updateUIView, não makeNSView/updateNSView. Alias esconderia o problema
// e o erro sairia longe da causa. Quem usa isso é porte de verdade, arquivo a arquivo.
