import { PermissionsAndroid, Platform } from "react-native";

export async function solicitarPermissaoMicrofone() {
  if (Platform.OS !== "android") return true;

  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    {
      title: "Permissão de Microfone",
      message: "Este app precisa do microfone para reconhecer comandos de voz.",
      buttonPositive: "Permitir",
    }
  );

  if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new Error("Permissão de microfone negada.");
  }
  return true;
}