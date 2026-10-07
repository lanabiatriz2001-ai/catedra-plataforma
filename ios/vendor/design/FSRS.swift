import Foundation

/// FSRS-6, parâmetros padrão do ts-fsrs 5.4.2 (MIT; licença em fsrs.js).
/// Mesmo motor diário da web: retenção 90%, sem aleatoriedade e erro volta hoje.
struct FSRSRegistro: Codable, Hashable {
    var at: Double
    var rating: Int
    var elapsed: Int
    var interval: Int
}
struct FSRSEstado: Codable, Hashable {
    var version: Int = 6
    var stability: Double
    var difficulty: Double
    var lastReview: Double
    var lapses: Int = 0
    var history: [FSRSRegistro] = []
}
enum CatedraFSRS {
    static let w: [Double] = [0.212,1.2931,2.3065,8.2956,6.4133,0.8334,3.0194,0.001,1.8722,0.1666,0.796,1.4835,0.0614,0.2629,1.6483,0.6014,1.8729,0.5425,0.0912,0.0658,0.1542]
    static func clamp(_ x: Double, _ a: Double, _ b: Double) -> Double { min(max(x,a),b) }
    static func arred(_ x: Double) -> Double { (x * 1e8).rounded() / 1e8 }
    static func dificuldade(_ g: Int) -> Double { arred(w[4] - exp(Double(g-1)*w[5]) + 1) }
    static func nota(_ q: Int) -> Int { q <= 2 ? 1 : q == 3 ? 2 : q == 4 ? 3 : 4 }
    static func proximo(_ memoria: FSRSEstado?, t: Int, g: Int) -> (stability: Double, difficulty: Double) {
        var s: Double, d: Double
        if let o = memoria {
            let os = clamp(o.stability,0.001,36500), od = clamp(o.difficulty,1,10)
            let factor = arred(pow(0.9,-1/w[20])-1), ret = arred(pow(1+factor*Double(t)/os,-w[20]))
            if t == 0 {
                let inc = pow(os,-w[19])*exp(w[17]*(Double(g)-3+w[18]))
                s = arred(clamp(os*(g >= 2 ? max(inc,1) : inc),0.001,36500))
            } else if g == 1 {
                let fail = arred(clamp(w[11]*pow(od,-w[12])*(pow(os+1,w[13])-1)*exp((1-ret)*w[14]),0.001,36500))
                s = clamp(arred(os/exp(w[17]*w[18])),0.001,fail)
            } else {
                s = arred(clamp(os*(1+exp(w[8])*(11-od)*pow(os,-w[9])*(exp((1-ret)*w[10])-1)*(g == 2 ? w[15] : 1)*(g == 4 ? w[16] : 1)),0.001,36500))
            }
            let delta = arred(-w[6]*Double(g-3)*(10-od)/9)
            d = clamp(arred(w[7]*dificuldade(4)+(1-w[7])*(od+delta)),1,10)
        } else { s = max(w[g-1],0.1); d = clamp(dificuldade(g),1,10) }
        return (s,d)
    }
    static func responder(_ atual: FSRSEstado?, intervalo: Int, reps: Int, ultima: Date?, q: Int, agora: Date) -> (estado: FSRSEstado, intervalo: Int) {
        let g = nota(q), ts = agora.timeIntervalSince1970 * 1000
        var old = atual
        if let x = old, !x.stability.isFinite || !x.difficulty.isFinite || x.stability <= 0 || x.difficulty < 1 { old = nil }
        if old == nil && reps > 0 {
            old = FSRSEstado(stability: clamp(Double(intervalo),1,36500), difficulty: 5, lastReview: (ultima ?? agora).timeIntervalSince1970 * 1000)
        }
        let last = old?.lastReview ?? ts
        let t = last.isFinite ? max(0,Int(floor((ts-last)/86400000))) : 0
        let m = proximo(old,t:t,g:g), s = m.stability, d = m.difficulty
        var iv = g == 1 ? 0 : Int(clamp(s.rounded(),1,36500))
        if old != nil && g > 1 {
            let h = Int(clamp(proximo(old,t:t,g:2).stability.rounded(),1,36500))
            let good = Int(clamp(proximo(old,t:t,g:3).stability.rounded(),1,36500))
            let hard = min(h,good), bom = max(good,hard+1)
            iv = g == 2 ? hard : g == 3 ? bom : max(iv,bom+1)
        }
        var hist = atual?.history ?? []
        hist.append(FSRSRegistro(at:ts,rating:g,elapsed:t,interval:iv))
        return (FSRSEstado(stability:s,difficulty:d,lastReview:ts,lapses:(atual?.lapses ?? 0)+(g == 1 ? 1 : 0),history:hist),iv)
    }
}
