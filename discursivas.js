/* Cátedra — BANCO DE DISCURSIVAS.
 *
 * Questões discursivas de concursos, com o espelho de correção quando a banca o
 * publicou. Tudo vem de FONTE PÚBLICA E OFICIAL: prova aplicada divulgada pela banca ou
 * pelo tribunal. Nada de material de cursinho.
 *
 * Cada item:
 *   id          identificador estável (orgao-ano-n)
 *   banca       VUNESP, CEBRASPE, FGV, FCC…
 *   orgao       TJ-SP, TRF-3…
 *   cargo       Juiz Substituto…
 *   ano         número
 *   disciplina  usada no filtro
 *   tema        assunto em poucas palavras
 *   enunciado   TRANSCRITO da prova — nunca reescrito
 *   espelho     [{quesito, pontos}] na ordem da banca; [] quando não foi publicado
 *   total       pontuação total da questão (null se não publicada)
 *   fonte       URL de onde o texto foi lido
 *
 * O espelho alimenta o raio-X ponto a ponto que a Redação já faz: com quesito e peso, a
 * correção deixa de ser "ficou bom" e passa a ser "você fez 6 de 9, faltou X (0,5)".
 */
window.CT_DISCURSIVAS = [];
