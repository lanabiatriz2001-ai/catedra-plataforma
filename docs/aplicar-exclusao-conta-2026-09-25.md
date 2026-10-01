# Aplicar no banco vivo: "Excluir minha conta" apaga tudo (25/09/2026)

Migração: `supabase/migrations/2026-09-25-excluir-minha-conta-completa.sql`.
Banco: projeto **catedraplataforma** (`frcnfqxniwzdyykvgqqu`), pelo SQL Editor do Supabase.

O merge do `.sql` não conserta nada sozinho. O teste `tests/exclusao-conta-cobertura.mjs` passa assim
que o arquivo entra no repositório, esteja ele aplicado ou não. O item só está feito depois dos passos
abaixo, com a fumaça do passo 5 limpa.

Antes de começar:

- O projeto precisa estar **ativo**. Ele já ficou pausado por fatura; pausado, nada disto roda.
- O passo 3 (A1) **apaga linhas em produção sem volta**. Só rode com o sim da dona, dado depois de ela
  ver as contagens do passo 1.
- Rode cada passo **sozinho**, um por vez. O SQL Editor põe um script de vários comandos numa transação
  só. Se A2 e A3 forem juntos, o bloqueio de `auth.users` dura até o fim, e o login grava nela.

---

## 1. Levantamento (só leitura)

**1a. Há tabela por conta que só existe no vivo?** Compare com a lista do teste: admin_log, admins,
ai_uso, beta_acesso, beta_allow, erros_cliente, feedback, grupo_atividade, grupos, ia_plano,
lista_espera, user_data e uso_telas. Se aparecer tabela fora dela, pare: a migração não a cobre.

```sql
select table_name, column_name
  from information_schema.columns
 where table_schema = 'public'
   and (column_name in ('user_id', 'criador', 'admin_uid', 'membros') or column_name like '%email')
 order by 1, 2;
```

**1b. As três tabelas existem? Quantos órfãos cada uma tem?** Estas são as linhas que o passo 3 apaga.
Se uma tabela não existir, a linha dela dá erro; rode as outras separadamente.

```sql
select 'erros_cliente' as tabela, count(*) as orfaos from public.erros_cliente e
 where not exists (select 1 from auth.users u where u.id = e.user_id)
union all
select 'uso_telas', count(*) from public.uso_telas t
 where not exists (select 1 from auth.users u where u.id = t.user_id)
union all
select 'ia_plano', count(*) from public.ia_plano p
 where not exists (select 1 from auth.users u where u.id = p.user_id);
```

**1c. A telemetria está ligada?** Isso diz se já houve coleta, e portanto órfãos.

```sql
select chave, valor, atualizado_em from public.app_config where chave = 'telemetria';
```

**1d. Guarde a função de hoje.** Salve a saída num arquivo: ela serve para comparar no passo 4.

```sql
select pg_get_functiondef('public.excluir_minha_conta()'::regprocedure);
```

**1e. As FKs já existem?** Numa primeira aplicação, a consulta volta vazia.

```sql
select conrelid::regclass as tabela, conname, convalidated
  from pg_constraint
 where conname in ('erros_cliente_user_fk', 'uso_telas_user_fk', 'ia_plano_user_fk');
```

---

## 2. Ordem

| Passo | Parte do arquivo | O que faz | Volta atrás? |
|---|---|---|---|
| 3 | (A1) | apaga os órfãos contados em 1b | **não** |
| 4a | (A2) | FKs `not valid` e índice em `erros_cliente(user_id)` | sim (drop constraint) |
| 4b | (A3) | valida as FKs | sim |
| 4c | (B) | `create or replace function public.excluir_minha_conta()` com revoke e grant | sim (rode o arquivo de 2026-09-08 de novo) |

Cada parte é um bloco `do $$ … $$`, exceto (B), que é o `create or replace` mais o revoke e o grant.
Copie do arquivo **exatamente** o trecho entre os cabeçalhos `(A1)`, `(A2)`, `(A3)` e `(B)`. Todos são
idempotentes: se um passo falhar no meio, rode de novo.

## 3. (A1): limpeza de órfãos, com o sim da dona

Rode o bloco `(A1)`. Depois repita a consulta 1b: as três contagens têm de dar 0.

## 4. (A2), (A3) e (B)

- **4a.** Rode o bloco `(A2)`. Repita 1e: as três FKs aparecem com `convalidated = false`.
- **4b.** Rode o bloco `(A3)`. Repita 1e: agora com `convalidated = true`. Se der 23503, entrou órfão
  depois do passo 3. Rode (A1) e (A3) de novo.
- **4c.** Rode o trecho `(B)` inteiro, do `create or replace` até o `grant`.

Confira a função nova:

```sql
select pg_get_functiondef('public.excluir_minha_conta()'::regprocedure);
```

A saída tem de conter:

- `select email into em from auth.users where id = uid`, antes do primeiro `delete`;
- `update public.grupos set criador = null where criador = uid`;
- os três `if to_regclass('public.…') is not null then delete from public.… where user_id = uid`,
  para erros_cliente, uso_telas e ia_plano;
- `delete from public.beta_allow where lower(email) = lower(em)`;
- `'versao', 2` no insert em admin_log;
- `delete from auth.users where id = uid` como última escrita.

Compare com o que foi guardado em 1d. A diferença deve ser só isso.

Confira as permissões:

```sql
select has_function_privilege('anon',          'public.excluir_minha_conta()', 'execute') as anon,           -- false
       has_function_privilege('authenticated', 'public.excluir_minha_conta()', 'execute') as authenticated;  -- true
```

Confira o índice:

```sql
select indexname from pg_indexes where schemaname = 'public' and tablename = 'erros_cliente';
-- tem de listar erros_cliente_user_idx
```

---

## 5. Fumaça: tudo dentro de `begin; … rollback;`

Rode o bloco inteiro de uma vez. Ele cria uma conta de teste, põe uma linha dela em cada tabela, exclui
a conta pela RPC como `authenticated` e confere o resultado. No fim, o `rollback` desfaz tudo, inclusive
a telemetria ligada dentro da transação.

A conta de teste é `00000000-0000-4000-8000-00000000e2c1`, com o e-mail `fumaca-exclusao@teste.invalid`.

```sql
begin;

-- conta de teste e uma linha dela em cada tabela
insert into auth.users (id, instance_id, aud, role, email)
values ('00000000-0000-4000-8000-00000000e2c1', '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated', 'fumaca-exclusao@teste.invalid');

insert into public.user_data (user_id, data) values ('00000000-0000-4000-8000-00000000e2c1', '{"x":1}');
insert into public.beta_acesso (user_id) values ('00000000-0000-4000-8000-00000000e2c1');
insert into public.feedback (user_id, email, mensagem) values ('00000000-0000-4000-8000-00000000e2c1', 'fumaca-exclusao@teste.invalid', 'fumaça');
insert into public.ai_uso (user_id, endpoint, chars) values ('00000000-0000-4000-8000-00000000e2c1', 'complete', 1);
insert into public.erros_cliente (user_id, mensagem) values ('00000000-0000-4000-8000-00000000e2c1', 'fumaça');
insert into public.uso_telas (user_id, dia, tela, n) values ('00000000-0000-4000-8000-00000000e2c1', current_date, 'inicio', 1);
insert into public.ia_plano (user_id, plano) values ('00000000-0000-4000-8000-00000000e2c1', 'beta');
insert into public.beta_allow (email) values ('fumaca-exclusao@teste.invalid');
insert into public.lista_espera (email) values ('fumaca-exclusao@teste.invalid');

-- grupo A: só ela, criadora (tem de sumir). Grupo B: ela e outra pessoa, ela criadora (fica sem ela e sem criador).
insert into public.grupos (codigo, nome, membros, criador) values
  ('FUMACA-A', 'Fumaça A', '[{"uid":"00000000-0000-4000-8000-00000000e2c1","nome":"T"}]', '00000000-0000-4000-8000-00000000e2c1'),
  ('FUMACA-B', 'Fumaça B', '[{"uid":"00000000-0000-4000-8000-00000000e2c1","nome":"T"},{"uid":"00000000-0000-4000-8000-00000000e2c2","nome":"O"}]', '00000000-0000-4000-8000-00000000e2c1');
insert into public.grupo_atividade (grupo_id, user_id, semana)
  select id, '00000000-0000-4000-8000-00000000e2c1', date_trunc('week', current_date)::date from public.grupos where codigo = 'FUMACA-B';

-- a exclusão, como o app chama: papel authenticated, sub = a conta de teste
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000e2c1","role":"authenticated"}', true);
set local role authenticated;
select public.excluir_minha_conta();
reset role;

-- conferência: todas as colunas 0, exceto as indicadas
select
  (select count(*) from auth.users            where id = '00000000-0000-4000-8000-00000000e2c1') as auth_users,
  (select count(*) from public.user_data      where user_id = '00000000-0000-4000-8000-00000000e2c1') as user_data,
  (select count(*) from public.beta_acesso    where user_id = '00000000-0000-4000-8000-00000000e2c1') as beta_acesso,
  (select count(*) from public.feedback       where user_id = '00000000-0000-4000-8000-00000000e2c1'
                                                 or email = 'fumaca-exclusao@teste.invalid')           as feedback,
  (select count(*) from public.ai_uso         where user_id = '00000000-0000-4000-8000-00000000e2c1') as ai_uso,
  (select count(*) from public.erros_cliente  where user_id = '00000000-0000-4000-8000-00000000e2c1') as erros_cliente,
  (select count(*) from public.uso_telas      where user_id = '00000000-0000-4000-8000-00000000e2c1') as uso_telas,
  (select count(*) from public.ia_plano       where user_id = '00000000-0000-4000-8000-00000000e2c1') as ia_plano,
  (select count(*) from public.beta_allow     where lower(email) = 'fumaca-exclusao@teste.invalid')    as beta_allow,
  (select count(*) from public.grupo_atividade where user_id = '00000000-0000-4000-8000-00000000e2c1') as grupo_atividade,
  (select count(*) from public.grupos where codigo = 'FUMACA-A')                                       as grupo_a_sumiu,
  (select count(*) from public.grupos where criador = '00000000-0000-4000-8000-00000000e2c1')          as criador,
  (select jsonb_array_length(membros) from public.grupos where codigo = 'FUMACA-B')                    as grupo_b_membros,    -- 1
  (select count(*) from public.lista_espera   where lower(email) = 'fumaca-exclusao@teste.invalid')    as lista_espera_retida, -- 1 (decisão da dona)
  (select count(*) from public.admin_log where acao = 'conta_excluida_pela_pessoa'
      and alvo = '00000000-0000-4000-8000-00000000e2c1' and detalhe->>'versao' = '2')                  as admin_log_v2;       -- 1

-- telemetria atrasada (token ainda válido depois da exclusão): com a telemetria ligada, o insert tem de ser barrado pela FK
insert into public.app_config (chave, valor) values ('telemetria', 'true'::jsonb)
  on conflict (chave) do update set valor = excluded.valor;
do $$
begin
  perform public.registrar_uso_telas(current_date, '{"inicio":1}'::jsonb);
  raise exception 'FALHOU: o registro atrasado de uso_telas passou sem a conta';
exception when foreign_key_violation then
  raise notice 'OK: 23503, o registro atrasado foi barrado pela FK';
end $$;
do $$
begin
  perform public.registrar_erro_cliente('fumaca', 'web', 'inicio', 'fumaça', now());
  raise exception 'FALHOU: o registro atrasado de erros_cliente passou sem a conta';
exception when foreign_key_violation then
  raise notice 'OK: 23503, o erro atrasado foi barrado pela FK';
end $$;

rollback;
```

Critério:

- Todas as colunas dão 0, exceto `grupo_b_membros`, `lista_espera_retida` e `admin_log_v2`, que dão 1.
- As duas mensagens `OK: 23503` aparecem.

Qualquer `FALHOU`, ou erro antes do `rollback`, significa **não encerrar o item**. Se a própria RPC der
erro, a exclusão está quebrada para todo mundo. Restaure a versão 1 na hora, rodando
`supabase/migrations/2026-09-08-excluir-minha-conta.sql`, e investigue.

Depois do `rollback`, confira que nada ficou:

```sql
select count(*) from auth.users where id = '00000000-0000-4000-8000-00000000e2c1';   -- 0
select valor from public.app_config where chave = 'telemetria';                       -- o mesmo de 1c
```

---

## 6. Desfazer, se precisar

- **Função:** rode de novo `supabase/migrations/2026-09-08-excluir-minha-conta.sql`. É um
  `create or replace` com a mesma assinatura.
- **FKs:**

  ```sql
  alter table public.erros_cliente drop constraint if exists erros_cliente_user_fk;
  alter table public.uso_telas     drop constraint if exists uso_telas_user_fk;
  alter table public.ia_plano      drop constraint if exists ia_plano_user_fk;
  ```

- **Órfãos:** apagados no passo 3, não voltam. Só existe cópia no backup do provedor.
