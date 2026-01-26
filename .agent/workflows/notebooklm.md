---
description: Iniciar e gerenciar o servidor NotebookLM MCP para integração com Gemini
---

# NotebookLM MCP Server

## ✅ Status: Configurado

O servidor está configurado em: `C:\Users\Kelson\AppData\Roaming\Code\User\mcp.json`

---

## Pré-requisitos

- Python 3.13 (instalado via `py -3.13`)
- Pacote `notebooklm-mcp` instalado: `py -3.13 -m pip install notebooklm-mcp`
- Arquivo `notebooklm-config.json` no root do projeto

---

## Comandos

### 1. Inicializar (primeira vez ou reconfigurar)

```powershell
py -3.13 -m notebooklm_mcp.cli init "https://notebooklm.google.com/notebook/YOUR_NOTEBOOK_ID"
```

> Isso abrirá uma janela do Chrome para login no Google (uma única vez).

### 2. Iniciar servidor manualmente (STDIO)

```powershell
// turbo
$env:PYTHONIOENCODING='utf-8'; $env:NO_COLOR='1'; py -3.13 -m notebooklm_mcp.cli --config notebooklm-config.json server
```

### 3. Iniciar servidor HTTP (para testes REST)

```powershell
$env:PYTHONIOENCODING='utf-8'; $env:NO_COLOR='1'; py -3.13 -m notebooklm_mcp.cli --config notebooklm-config.json server --http --port 8080
```

---

## Configuração VS Code (Já aplicada)

Arquivo: `C:\Users\Kelson\AppData\Roaming\Code\User\mcp.json`

```json
{
  "servers": {
    "notebooklm": {
      "type": "stdio",
      "command": "py",
      "args": ["-3.13", "-m", "notebooklm_mcp.cli", "--config", "C:/Users/Kelson/Desktop/Moveis.pro 0.1/notebooklm-config.json", "server"],
      "env": {
        "PYTHONIOENCODING": "utf-8",
        "NO_COLOR": "1"
      }
    }
  }
}
```

---

## Troubleshooting

### Erro: "coroutine was never awaited"
- Use Python 3.13: `py -3.13 -m notebooklm_mcp.cli ...`

### Erro: UnicodeEncodeError
- Adicione as variáveis de ambiente: `PYTHONIOENCODING=utf-8` e `NO_COLOR=1`

### Erro de autenticação
- Delete a pasta `chrome_profile_notebooklm` e rode `init` novamente.

### Servidor não aparece no Gemini
- **Reinicie o VS Code** após configurar o mcp.json
