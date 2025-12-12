# Modsy-app

# 🧥 Modsy – Seu Guarda-roupa Inteligente

![Modsy Logo](assets/images/logo.png) 

O **Modsy** é um projeto desenvolvido como **Trabalho de Conclusão de Curso (TCC)** pelo meu grupo do **Curso Técnico em Análise e Desenvolvimento de Sistemas**.

Nosso objetivo é **promover autonomia, inclusão e autoestima** para **pessoas com deficiência visual** por meio de um ecossistema inteligente que une **moda, tecnologia e acessibilidade**.

## 🎯 O que é o Modsy?

O Modsy é um **sistema IoT integrado** composto por:

- **Um aplicativo móvel (React Native + Expo)**
- **Um guarda-roupa físico automatizado (ESP32 + motores de passo)**
- **Banco de dados em tempo real (Firebase Firestore + Realtime Database)**

O usuário pode:
- Cadastrar peças de roupa com **nome e foto**
- Criar **looks pré-definidos** (ex: "roupa de trabalho", "look de academia")
- Escolher um look por **comando de voz**, **toque em botões com Braille** ou **pelo app**
- Ao confirmar, o **guarda-roupa gira automaticamente** para posicionar **exatamente as peças do look escolhido**, prontas para serem usadas

Tudo pensado para oferecer **independência na hora de se vestir**, com dignidade e estilo.

---

## 📁 Estrutura do Projeto

Abaixo estão os principais arquivos do aplicativo que permitem a interação com o usuário e a integração com o hardware:

### `CadastrarRoupaModal.js`
Responsável por permitir o cadastro de novas peças de roupa. O usuário pode:
- Tirar uma foto da peça com a câmera ou selecionar da galeria
- Informar um nome descritivo (ex: "camiseta preta de manga curta")
- Escolher a seção (superior, inferior ou calçado)

> ✅ As imagens são salvas localmente no dispositivo e os metadados são armazenados no **Firestore**.

---

### `SalvarLookModal.js`
Permite que o usuário crie um **look personalizado** combinando:
- 1 peça superior
- 1 peça inferior
- 1 calçado

> ✅ Ao salvar, o app registra os **IDs das peças selecionadas** no **Firestore** e também atualiza o **Realtime Database** com as posições físicas dessas peças (`mapaPecas`) e a composição do look (`posicoesRoupas`), permitindo que o ESP32 alinhe as peças corretas.

---

### `salvarImagemLocal.js`
Função utilitária que **salva a imagem da peça no armazenamento local do dispositivo** (usando `expo-file-system`).  
- Gera um **ID único** (com `uuid`)
- Armazena a imagem em um diretório persistente (`Documents/images/`)
- Retorna o **caminho absoluto** para ser salvo no banco

> ✅ Garante que as imagens permaneçam acessíveis mesmo após o app ser fechado ou reiniciado.

---

### `GirarModal.js`
Componente de interface que **oferece ao usuário o controle manual das seções do guarda-roupa**.  
Quando o usuário clica no botão "Girar", este modal aparece com 3 opções:
- **Girar parte superior**
- **Girar parte inferior**
- **Girar calçado**

> ✅ Ao selecionar uma opção, o app envia um comando para o **Firebase Realtime Database**, que é lido pelo **ESP32**, que então gira **exatamente a seção escolhida em 360°** (movendo a engrenagem grande em 90° para a próxima posição).

---

## ⚙️ Integração com o Hardware (ESP32)

O ESP32 se comunica com o Firebase para:
- Ler comandos manuais (`/comandoGirar`)
- Ler looks automáticos (`/posicoesRoupas` e `/mapaPecas`)
- Controlar **3 motores de passo (28BYJ-48)** via drivers **ULN2003**
- Executar giros precisos de **360° (motor) = 90° (engrenagem grande) = 1 posição**

O sistema também aceita **4 botões físicos com Braille**, cada um correspondendo a um look salvo, permitindo total autonomia sem o uso do smartphone.

---

## 🛠️ Tecnologias utilizadas

- **Frontend**: React Native, Expo, TypeScript (opcional), `react-navigation`
- **Banco de dados**: Firebase Firestore (cadastros) + Firebase Realtime Database (comandos em tempo real)
- **Hardware**: ESP32, motores de passo 28BYJ-48, drivers ULN2003
- **Outras libs**: `expo-av` (áudio), `expo-file-system` (imagens), `expo-speech` (feedback por voz)

---

## 📌 Observações importantes

- Este projeto é um **protótipo funcional de TCC** e está em constante evolução.
- A estrutura do Realtime Database (`mapaPecas`, `posicoesRoupas`, `comandoGirar`) é gerada **automaticamente pelo app** — **não é necessário criar manualmente**.
- O ESP32 requer **conexão Wi-Fi** e **alimentação externa de 5V** para os motores.

---

## 🤝 Agradecimentos

Este projeto é fruto de muito estudo, testes e dedicação da nossa equipe. Esperamos que inspire outras pessoas a desenvolverem soluções **tecnológicas inclusivas e humanas**.

**Modsy – Tecnologia para vestir com autonomia.**
