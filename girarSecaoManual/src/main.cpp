#include <WiFi.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

// ================= CONFIGURAÇÕES WIFI / FIREBASE =================
const char* WIFI_SSID = "lyn";
const char* WIFI_PASSWORD = "lhe300302";
// 🔥 NÃO PRECISA DE API KEY SEM AUTENTICAÇÃO
const char* FIREBASE_DB_URL = "https://modsy-fa88a-default-rtdb.firebaseio.com";

// ================= CONFIGURAÇÃO DOS MOTORES =================
struct StepperMotor {
  uint8_t pins[4];
  int seqIndex;
  int posAtual;
};

StepperMotor motors[3] = {
  { {5, 18, 19, 21}, 0, 1 },   // Motor 0 → superior
  { {22, 23, 2, 4},  0, 1 },   // Motor 1 → inferior
  { {13, 15, 12, 27}, 0, 1 }   // Motor 2 → calçado
};

const uint8_t STEP_SEQUENCE[8][4] = {
  {1, 0, 0, 0},
  {1, 1, 0, 0},
  {0, 1, 0, 0},
  {0, 1, 1, 0},
  {0, 0, 1, 0},
  {0, 0, 1, 1},
  {0, 0, 0, 1},
  {1, 0, 0, 1}
};

const int STEPS_PER_REV = 4096;
int stepDelayMs = 3;

// ================= PROTÓTIPOS =================
void connectWiFi();
void syncNTP();
String firebaseReadPath(const char* path);
bool firebaseUpdatePath(const char* path, const char* jsonValue);
void initMotors();
void singleStep(StepperMotor &motor, int dir);
void rotateFullRevolution(StepperMotor &motor);
void girarParaLook(int lookIndex);

// ================= NTP =================
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org");

void syncNTP() {
  timeClient.begin();
  Serial.print("Sincronizando horário...");
  int tries = 0;
  while (!timeClient.update() && tries < 10) {
    timeClient.forceUpdate();
    delay(500);
    Serial.print(".");
    tries++;
  }
  Serial.println(tries < 10 ? " OK!" : " Falhou.");
}

// ================= WIFI =================
void connectWiFi() {
  Serial.print("Conectando ao Wi-Fi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConectado!");
}

// ================= FIREBASE SEM TOKEN =================
String firebaseReadPath(const char* path) {
  if (WiFi.status() != WL_CONNECTED) return "";

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient https;

  // 🔥 SEM ?auth= — acesso público
  String url = String(FIREBASE_DB_URL) + path + ".json";
  if (!https.begin(client, url)) return "";

  int httpCode = https.GET();
  String payload = (httpCode == 200) ? https.getString() : "";
  https.end();

  if (payload.isEmpty() || payload == "null") {
    return "null";
  }
  return payload;
}

bool firebaseUpdatePath(const char* path, const char* jsonValue) {
  if (WiFi.status() != WL_CONNECTED) return false;

  WiFiClientSecure client;
  client.setInsecure();
  client.setTimeout(12000);

  HTTPClient https;
  String url = String(FIREBASE_DB_URL) + path + ".json"; // 🔥 SEM token
  if (!https.begin(client, url)) return false;

  https.addHeader("Content-Type", "application/json");
  https.addHeader("Connection", "close");

  int httpCode = https.PUT(jsonValue);
  https.end();
  delay(100);
  return (httpCode == 200);
}

// ================= MOTORES =================
void initMotors() {
  for (int m = 0; m < 3; m++) {
    for (int i = 0; i < 4; i++) {
      pinMode(motors[m].pins[i], OUTPUT);
      digitalWrite(motors[m].pins[i], LOW);
    }
  }
}

void singleStep(StepperMotor &motor, int dir) {
  motor.seqIndex += dir;
  if (motor.seqIndex < 0) motor.seqIndex = 7;
  if (motor.seqIndex > 7) motor.seqIndex = 0;
  for (int i = 0; i < 4; i++) {
    digitalWrite(motor.pins[i], STEP_SEQUENCE[motor.seqIndex][i]);
  }
  delay(stepDelayMs);
}

void rotateFullRevolution(StepperMotor &motor) {
  Serial.println("Girando motor 360°...");
  for (int i = 0; i < STEPS_PER_REV; i++) {
    singleStep(motor, 1);
  }
  motor.posAtual = (motor.posAtual % 4) + 1;
  for (int i = 0; i < 4; i++) {
    digitalWrite(motor.pins[i], LOW);
  }
}

// ================= LÓGICA DE LOOK =================
void girarParaLook(int lookIndex) {
  Serial.printf("Iniciando giro para Look %d...\n", lookIndex);

  String lookKey = "look" + String(lookIndex);
  String lookJson = firebaseReadPath(("/posicoesRoupas/" + lookKey).c_str());
  if (lookJson == "null" || lookJson.indexOf("null") != -1) {
    Serial.println("Look não encontrado.");
    return;
  }

  String ids[3] = {"", "", ""};
  if (lookJson.indexOf("\"superior\"") != -1) {
    int start = lookJson.indexOf("\"superior\":\"") + 12;
    int end = lookJson.indexOf("\"", start);
    ids[0] = lookJson.substring(start, end);
  }
  if (lookJson.indexOf("\"inferior\"") != -1) {
    int start = lookJson.indexOf("\"inferior\":\"") + 12;
    int end = lookJson.indexOf("\"", start);
    ids[1] = lookJson.substring(start, end);
  }
  if (lookJson.indexOf("\"calçado\"") != -1 || lookJson.indexOf("\"calcado\"") != -1) {
    int start = (lookJson.indexOf("\"calçado\"") != -1)
      ? lookJson.indexOf("\"calçado\":\"") + 12
      : lookJson.indexOf("\"calcado\":\"") + 12;
    int end = lookJson.indexOf("\"", start);
    ids[2] = lookJson.substring(start, end);
  }

  const char* tipos[3] = {"superior", "inferior", "calçado"};
  for (int i = 0; i < 3; i++) {
    if (ids[i] == "") continue;

    String pecaPath = "/mapaPecas/" + ids[i] + "/posicao";
    String posStr = firebaseReadPath(pecaPath.c_str());
    if (posStr == "null" || posStr.length() == 0) continue;

    int posDesejada = posStr.toInt();
    int girosNecessarios = posDesejada - motors[i].posAtual;
    if (girosNecessarios <= 0) girosNecessarios += 4;

    Serial.printf("Motor %s: posAtual=%d, posDesejada=%d, giros=%d\n",
                  tipos[i], motors[i].posAtual, posDesejada, girosNecessarios);

    for (int g = 0; g < girosNecessarios; g++) {
      rotateFullRevolution(motors[i]);
    }
  }

  Serial.println("Look alinhado com sucesso!");
}

// ================= SETUP =================
void setup() {
  Serial.begin(115200);
  delay(2000);
  connectWiFi();
  syncNTP(); // Ainda útil para logs, mas não obrigatório sem SSL crítico
  initMotors();
  Serial.println("🟢 Sistema iniciado (sem autenticação). Aguardando comandos...");
}

// ================= LOOP =================
void loop() {
  // ============ COMANDO DE LOOK ============
  String lookCommand = firebaseReadPath("/comandoLook");
  if (lookCommand != "null" && lookCommand.indexOf("pendente") != -1) {
    int lookIndex = -1;
    if (lookCommand.indexOf("\"look\":\"1\"") != -1) lookIndex = 1;
    else if (lookCommand.indexOf("\"look\":\"2\"") != -1) lookIndex = 2;
    else if (lookCommand.indexOf("\"look\":\"3\"") != -1) lookIndex = 3;
    else if (lookCommand.indexOf("\"look\":\"4\"") != -1) lookIndex = 4;

    if (lookIndex > 0) {
      firebaseUpdatePath("/comandoLook/status", "\"em_andamento\"");
      girarParaLook(lookIndex);
      firebaseUpdatePath("/comandoLook/status", "\"concluido\"");
    } else {
      Serial.println("Look inválido.");
      firebaseUpdatePath("/comandoLook/status", "\"erro\"");
    }
    delay(2000);
    return;
  }

  // ============ COMANDO DE SEÇÃO ============
  String sectionCommand = firebaseReadPath("/comandoGirar");
  if (sectionCommand != "null" && sectionCommand.indexOf("pendente") != -1) {
    int secaoIndex = -1;
    if (sectionCommand.indexOf("\"secao\":\"superior\"") != -1) secaoIndex = 0;
    else if (sectionCommand.indexOf("\"secao\":\"inferior\"") != -1) secaoIndex = 1;
    else if (sectionCommand.indexOf("\"secao\":\"calçado\"") != -1 ||
             sectionCommand.indexOf("\"secao\":\"calcado\"") != -1) secaoIndex = 2;

    if (secaoIndex != -1) {
      bool success = false;
      for (int i = 0; i < 3 && !success; i++) {
        if (firebaseUpdatePath("/comandoGirar/status", "\"em_andamento\"")) {
          success = true;
        } else {
          delay(1000);
        }
      }

      if (success) {
        Serial.printf("Girando seção %d...\n", secaoIndex);
        rotateFullRevolution(motors[secaoIndex]);
        firebaseUpdatePath("/comandoGirar/status", "\"concluido\"");
      }
    }
    delay(2000);
    return;
  }

  delay(1000);
}