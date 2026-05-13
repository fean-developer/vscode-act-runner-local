# Skill: Boas Práticas de Segurança para Secrets

## Objetivo
Guiar o desenvolvedor em práticas seguras de gerenciamento de secrets no GitHub Actions, prevenindo vazamentos e garantindo conformidade com políticas de segurança corporativas.

## Princípios Fundamentais

1. **Nunca commitar secrets** — secrets jamais devem aparecer em código ou histórico git
2. **Menor privilégio** — cada secret deve ter somente as permissões necessárias
3. **Rotação periódica** — tokens e senhas devem ser trocados regularmente
4. **Auditoria** — todo acesso a secrets deve ser rastreável

## Onde Armazenar Secrets

### Para uso local com act

| Arquivo | Uso | Deve estar no .gitignore |
|---|---|---|
| `.secrets` | Secrets e tokens locais para act | ✅ Obrigatório |
| `.env` | Variáveis de ambiente não-secretas | ✅ Recomendado |
| `.actrc` | Configurações do act (sem valores) | ⚠️ Verificar conteúdo |

### Para uso no GitHub Actions (remoto)
- **GitHub Secrets** (`Settings > Secrets and variables > Actions`)
- **GitHub Environments** — secrets por ambiente (dev/staging/prod)
- **GitHub OIDC** — autenticação sem secrets via OpenID Connect

## Alternativas Corporativas ao GitHub Secrets

### Azure Key Vault
```yaml
- name: Obter secrets do Azure Key Vault
  uses: azure/get-keyvault-secrets@v1
  with:
    keyvault: meu-key-vault
    secrets: 'DATABASE-PASSWORD, API-TOKEN'
  id: keyvault
```

### AWS Secrets Manager
```yaml
- name: Obter secrets da AWS
  uses: aws-actions/aws-secretsmanager-get-secrets@v2
  with:
    secret-ids: |
      meu/segredo/database
      meu/segredo/api-token
```

### HashiCorp Vault
```yaml
- name: Importar secrets do Vault
  uses: hashicorp/vault-action@v3
  with:
    url: https://vault.empresa.com
    token: ${{ secrets.VAULT_TOKEN }}
    secrets: |
      secret/data/prod database_password | DB_PASSWORD;
      secret/data/prod api_token | API_TOKEN
```

## Uso Seguro no GitHub Actions YAML

### ✅ Correto — usar via contexto `secrets`
```yaml
- name: Deploy
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    API_TOKEN: ${{ secrets.API_TOKEN }}
  run: deploy.sh
```

### ❌ Errado — nunca hardcodar
```yaml
- name: Deploy
  env:
    DATABASE_URL: postgres://user:SENHA_REAL@host/db  # NUNCA!
  run: deploy.sh
```

### ✅ Correto — usar OIDC em vez de tokens de longa duração
```yaml
permissions:
  id-token: write
  contents: read

- name: Autenticar na AWS via OIDC
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::123456789:role/GitHubActions
    aws-region: us-east-1
```

## Proteção de Secrets nos Logs

O GitHub Actions mascara automaticamente os valores de secrets registrados em `secrets.*`. Para mascarar valores adicionais:

```yaml
- name: Mascarar valor dinâmico
  run: echo "::add-mask::${{ steps.get-token.outputs.token }}"
```

No act, os valores do `.secrets` são mascarados automaticamente nos logs com `***`.

## Validação de Segurança no .gitignore

```gitignore
# Arquivos de secrets locais — NUNCA commitar
.secrets
.env.local
.env.production
*.pem
*.key
id_rsa
id_ed25519
*.pfx
```

## Regras de Segurança na Extensão

A extensão Act Visual Runner DEVE:

| Regra | Implementação |
|---|---|
| Nunca exibir valores de secrets na UI | Campos com `type="password"`, sem serialização no store |
| Nunca logar secrets | Filtrar output do act antes de emitir eventos `log` |
| Nunca incluir secrets em `actArgs` | Usar `--secret-file`, nunca `--secret KEY=VALUE` inline |
| Nunca serializar `.secrets` em `globalState` | Histórico de execuções não armazena secrets |
| Alertar sobre `.secrets` não no `.gitignore` | Verificar ao abrir workspace |

## Verificação de .gitignore na Extensão

```typescript
async function checkSecretsIgnored(workspaceRoot: string): Promise<void> {
  const gitignorePath = path.join(workspaceRoot, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    vscode.window.showWarningMessage(
      '⚠️ .gitignore não encontrado. Crie um para evitar commitar secrets.'
    );
    return;
  }

  const content = fs.readFileSync(gitignorePath, 'utf-8');
  if (!content.includes('.secrets')) {
    vscode.window.showWarningMessage(
      '⚠️ ".secrets" não está no .gitignore! Risco de vazar secrets no git.',
      'Adicionar agora'
    ).then((choice) => {
      if (choice === 'Adicionar agora') {
        fs.appendFileSync(gitignorePath, '\n# Act secrets\n.secrets\n');
      }
    });
  }
}
```

## Checklist de Segurança

Antes de fazer commit:
- [ ] `.secrets` está no `.gitignore`
- [ ] Nenhum valor de secret está hardcodado no YAML
- [ ] Tokens têm o escopo mínimo necessário
- [ ] OIDC está sendo usado onde possível (sem tokens de longa duração)
- [ ] Secrets de produção estão separados dos de desenvolvimento

## Output
- Desenvolvedor ciente das práticas de segurança
- Workspace configurado para prevenir vazamento de secrets
- Extensão aplicando proteções automaticamente
