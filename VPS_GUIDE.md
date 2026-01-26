# Guia de Migração para VPS Ubuntu 24.04

Este guia assume que você já tem o IP da VPS e acesso root (ou usuário com sudo).

## 1. Acesso Inicial
Acesse sua VPS via terminal (PowerShell ou CMD):
```bash
ssh root@SEU_IP_DA_VPS
# (Digite a senha se solicitado)
```

## 2. Preparar o Ambiente
Primeiro, vamos copiar o script de setup para a VPS.
No seu **computador local** (abra outro terminal na pasta do projeto):

```powershell
# Copiar o script de setup
scp ./vps_setup.sh root@SEU_IP_DA_VPS:/root/
```

Volte para o terminal da **VPS** e execute:
```bash
chmod +x vps_setup.sh
./vps_setup.sh
```
*Isso vai instalar Docker, Node.js, Supabase CLI e configurar o Firewall. Pode demorar alguns minutos.*
> **Importante:** Quando terminar, faça logout (`exit`) e login novamente para aplicar permissões.

## 3. Transferir o Projeto
Agora vamos copiar todo o código para a VPS.
No seu **computador local**:

```powershell
# (Certifique-se de estar na pasta raiz do projeto)
# Exemplo usando rsync (se tiver git bash) ou scp recursivo
# O scp funciona no PowerShell
scp -r . root@SEU_IP_DA_VPS:/root/moveis-pro
```

## 4. Iniciar os Serviços na VPS
Acesse a VPS novamente:
```bash
ssh root@SEU_IP_DA_VPS
cd moveis-pro
```

### Iniciar Backend (Supabase)
```bash
supabase start
```
*Anote as chaves e URLs que aparecerem!*

### Iniciar Evolution API
```bash
docker compose up -d
```

### Iniciar Frontend (Dev Mode)
Para desenvolver remotamente:
```bash
npm install
npm run dev -- --host
```
*O frontend ficará acessível em http://SEU_IP_DA_VPS:8083*

## 5. (Opcional) Desenvolvimento Remoto com VS Code
Para editar arquivos direto na VPS:
1. No VS Code, instale a extensão **Remote - SSH**.
2. Clique no ícone verde no canto inferior esquerdo > **Connect to Host**.
3. Digite `root@SEU_IP_DA_VPS`.
4. Abra a pasta `/root/moveis-pro`.

Agora você programa no Linux robusto, mas com a interface do Windows! 🚀
