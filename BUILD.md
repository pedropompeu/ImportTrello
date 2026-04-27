# Build Guide — Trello Smart Importer v2

## Pré-requisitos

- Node.js 18+ e npm 9+
- Python 3 (para pós-instalação do better-sqlite3)
- Para Linux: `rpmbuild` (pacote `rpm` ou `rpm-build`) se quiser gerar `.rpm`
- Para macOS: Xcode Command Line Tools + conta Apple Developer (para assinar)
- Para Windows: pode ser gerado a partir do Linux/macOS via Wine ou CI

---

## 1. Gerar ícones reais (antes de publicar)

Os ícones em `build/` são **placeholders azuis** gerados automaticamente.
Substitua-os por ícones reais antes de distribuir.

### Opção A — electron-icon-builder (recomendado)

```bash
npm install -g electron-icon-builder

# Crie uma imagem master PNG de 1024x1024 px
# Em seguida rode:
electron-icon-builder --input=./icon-master.png --output=./build
```

Isso gera automaticamente:
- `build/icon.ico` (Windows)
- `build/icon.icns` (macOS)
- `build/icons/*.png` (Linux, todos os tamanhos)

### Opção B — Conversão manual

| Formato | Ferramenta              | Comando resumido                          |
|---------|-------------------------|-------------------------------------------|
| `.ico`  | ImageMagick             | `convert icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico` |
| `.icns` | macOS `iconutil`        | Criar `.iconset/` com PNGs nomeados corretamente, depois `iconutil -c icns icon.iconset` |
| PNGs    | ImageMagick / Inkscape  | `convert icon.png -resize NxN icons/NxN.png` |

---

## 2. Instalar dependências e reconstruir módulos nativos

```bash
npm install

# Reconstrói o better-sqlite3 contra a versão do Electron instalada
npm run rebuild
```

> O `postinstall` no package.json roda `electron-rebuild` automaticamente
> no `npm install`. Se der erro, execute `npm run rebuild` manualmente.

---

## 3. Builds por plataforma

### Linux (AppImage + deb + rpm)

```bash
npm run build:linux
```

Saída em `dist-electron/`:
```
Trello Smart Importer-2.0.0.AppImage
trello-smart-importer_2.0.0_amd64.deb
trello-smart-importer-2.0.0.x86_64.rpm
```

> **Requisito para .rpm:** `sudo apt install rpm` (Debian/Ubuntu) ou equivalente.

### Windows (NSIS + Portable)

```bash
npm run build:win
```

> Pode ser executado no Linux (cross-compile via Wine+Mono) ou no Windows.
> No Linux, instale: `sudo apt install wine64 mono-complete`

Saída:
```
Trello Smart Importer Setup 2.0.0.exe   (instalador NSIS)
Trello Smart Importer 2.0.0.exe         (portable)
```

### macOS (DMG + ZIP)

```bash
npm run build:mac
```

> **Limitação:** o build para macOS **só pode ser feito no macOS**.
> O electron-builder usa APIs exclusivas do macOS para assinar e empacotar.

Saída:
```
Trello Smart Importer-2.0.0.dmg
Trello Smart Importer-2.0.0-mac.zip
```

### Todas as plataformas de uma vez

```bash
npm run build:all
```

---

## 4. Assinatura digital (opcional, mas recomendado para distribuição)

### Windows (Code Signing)

1. Obtenha um certificado EV Code Signing (Sectigo, DigiCert, etc.)
2. Configure as variáveis de ambiente antes do build:

```bash
export CSC_LINK="caminho/para/certificate.p12"
export CSC_KEY_PASSWORD="senha-do-certificado"
npm run build:win
```

Ou no `package.json`, seção `"win"`:
```json
"certificateFile": "build/certificate.p12",
"certificatePassword": "${env.CSC_KEY_PASSWORD}"
```

### macOS (Notarização Apple)

1. Obtenha uma conta Apple Developer ($99/ano)
2. Configure:

```bash
export APPLE_ID="seu@email.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="XXXXXXXXXX"
npm run build:mac
```

O `hardenedRuntime: true` e o `entitlements.mac.plist` já estão configurados.
Para notarizar, adicione ao `package.json`:

```json
"afterSign": "scripts/notarize.js"
```

---

## 5. Onde ficam os arquivos gerados

```
dist-electron/
  ├── Trello Smart Importer-2.0.0.AppImage
  ├── trello-smart-importer_2.0.0_amd64.deb
  ├── trello-smart-importer-2.0.0.x86_64.rpm
  ├── Trello Smart Importer Setup 2.0.0.exe
  ├── Trello Smart Importer 2.0.0.exe
  ├── Trello Smart Importer-2.0.0.dmg
  └── Trello Smart Importer-2.0.0-mac.zip
```

---

## 6. Variáveis de ambiente para o processo principal

O app não usa `.env` em produção — as configurações são salvas pelo usuário
diretamente no SQLite via tela de Configurações (criptografadas com AES-256).

---

## 7. Depuração de builds com problemas

```bash
# Ver log detalhado do electron-builder
DEBUG=electron-builder npm run build:linux

# Testar o build sem empacotar (só compila o Vite)
npx vite build

# Inspecionar o que será empacotado
npx electron-builder --linux --dir
```

A flag `--dir` gera a pasta descompactada em `dist-electron/linux-unpacked/`
sem criar o instalador, útil para testar antes do empacotamento final.
