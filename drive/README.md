# Nexi Drive

Passe arquivos do celular para o computador (e do computador para o celular) usando um **código**.

## Como usar

1. Instale o [Node.js](https://nodejs.org) (versão 18 ou mais nova) no computador.
2. Abra o programa:
   - **Windows:** clique duas vezes em `iniciar-windows.bat`
   - **Mac/Linux:** rode `./iniciar-mac-linux.sh` (ou `node server.js`)
3. A janela mostra dois endereços:
   ```
   Neste computador:  http://localhost:8080
   No celular:        http://192.168.0.15:8080
   ```
4. Abra o primeiro no navegador do computador e o segundo no navegador do celular
   (os dois precisam estar **no mesmo Wi-Fi**).
5. Digite **o mesmo código** nos dois (ex.: `CASA2024`, ou toque em "Gerar código").
6. Arraste o arquivo para dentro da área tracejada (no celular, toque nela e escolha o arquivo).
   Ele aparece na hora no outro aparelho — é só clicar em ⬇️ para baixar.

Dica: no celular, use "Adicionar à tela inicial" no navegador para abrir como um app.

## Onde ficam os arquivos

Na pasta `arquivos/<SEU CÓDIGO>/`, ao lado do `server.js`. Você também pode abrir essa
pasta direto no computador.

## Configurações opcionais

| Variável      | Padrão      | O que faz                         |
|---------------|-------------|-----------------------------------|
| `PORT`        | `8080`      | Porta do servidor                 |
| `DRIVE_DIR`   | `./arquivos`| Pasta onde os arquivos são salvos |
| `MAX_FILE_MB` | `4096`      | Tamanho máximo por arquivo (MB)   |

## Problemas comuns

- **O celular não abre o endereço:** confira se está no mesmo Wi-Fi e permita o Node.js
  no Firewall do Windows quando ele perguntar (marque "Redes privadas").
- **Segurança:** quem estiver na mesma rede e souber o código vê os arquivos. Use um
  código difícil (o botão "Gerar código" cria um de 8 caracteres).
