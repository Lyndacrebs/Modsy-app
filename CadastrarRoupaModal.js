import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Alert,
  TouchableOpacity,
  Image,
  StyleSheet,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { db, rtdb } from "./firebaseConexao";
import { ref as rtdbRef, set as rtdbSet } from "firebase/database";
import { collection, addDoc, query, getDocs, where } from "firebase/firestore";
import { salvarImagemLocal } from "./salvarImagemLocal";
import { File } from "expo-file-system";
import { useFonts } from 'expo-font';

export default function CadastrarRoupaModal({ visible, onClose, tipo }) {
  const [descricao, setDescricao] = useState("");
  const [imageUri, setImageUri] = useState(null);

  const [fontsLoaded] = useFonts({
      'CreatoDisplay-Bold': require('./assets/fonts/CreatoDisplay-Bold.otf'),
      'CreatoDisplay-Light': require('./assets/fonts/CreatoDisplay-Light.otf'),
      'CreatoDisplay-MediumItalic': require('./assets/fonts/CreatoDisplay-MediumItalic.otf'),
      'CreatoDisplay-Medium': require('./assets/fonts/CreatoDisplay-Medium.otf'),
      'CreatoDisplay-Regular': require('./assets/fonts/CreatoDisplay-Regular.otf'),
      'CreatoDisplay-Thin': require('./assets/fonts/CreatoDisplay-Thin.otf'),
      'Futura-Bold': require('./assets/fonts/Futura-Bold.otf'),
    });
  

  const pickImage = async (fromCamera = false) => {
    try {
      let permissionStatus;
      if (fromCamera) {
        permissionStatus = await ImagePicker.requestCameraPermissionsAsync();
        if (permissionStatus.status !== "granted") {
          Alert.alert("Permissão necessária", "Precisamos de acesso à câmera.");
          return;
        }
      } else {
        permissionStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permissionStatus.status !== "granted") {
          Alert.alert("Permissão necessária", "Precisamos de acesso à galeria.");
          return;
        }
      }

      const result = await (fromCamera
        ? ImagePicker.launchCameraAsync
        : ImagePicker.launchImageLibraryAsync)({
        mediaTypes: ['images'], //Corrigido
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled) {
        const tempUri = result.assets[0].uri;

   
        const { path } = await salvarImagemLocal(tempUri);
        setImageUri(path);
      }
    } catch (error) {
      console.error("Erro ao selecionar imagem:", error);
      Alert.alert("Erro", "Não foi possível carregar a imagem.");
    }
  };

   const salvar = async () => {
    if (!descricao.trim()) {
      Alert.alert("Erro", "Por favor, informe a descrição da roupa");
      return;
    }
    if (!imageUri) {
      Alert.alert("Erro", "Por favor, selecione uma imagem");
      return;
    }

    try {
      // Extração original do imageId (FUNCIONAVA!)
      const filename = imageUri.split('/').pop();
      const imageId = filename?.split('.')[0] || 'unknown';

      // Contar peças existentes para definir posição
      const q = query(
        collection(db, "roupas"),
        where("tipo", "==", tipo.toLowerCase().trim())
      );
      const snapshot = await getDocs(q);
      const posicao = Math.min(snapshot.size + 1, 4);

      // 👇 Salvar no Firestore
      const docRef = await addDoc(collection(db, "roupas"), {
        tipo: tipo.toLowerCase().trim(),
        nome: descricao.trim(),
        imageId,
        imagePath: imageUri,
        dataCadastro: new Date(),
      });

      // 👇 Salvar no Realtime Database (mapaPecas)
      await rtdbSet(
        rtdbRef(rtdb, `mapaPecas/${docRef.id}`),
        {
          posicao,
          tipo: tipo.toLowerCase().trim(),
        }
      );

      Alert.alert("Sucesso!", "Roupa cadastrada com sucesso!");
      setDescricao("");
      setImageUri(null);
      onClose();
    } catch (e) {
      console.error(e);
      Alert.alert("Erro", "Falha ao cadastrar roupa");
    }
  };


  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Cadastrar</Text>

          <View style={styles.topButtonsRow}>
            <TouchableOpacity onPress={() => pickImage(true)} style={styles.optionButton}>
              <Image source={require("./assets/images/camera.png")} style={styles.icon} />
              <Text style={styles.iconLabel}>Abrir câmera</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => pickImage(false)} style={styles.optionButton}>
              <Image source={require("./assets/images/galeria.png")} style={styles.icon} />
              <Text style={styles.iconLabel}>Abrir galeria</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputRow}>
            {imageUri && (
              <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />
            )}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                {tipo === "superior"
                  ? "Roupa Superior"
                  : tipo === "inferior"
                  ? "Roupa Inferior"
                  : "Calçado"}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Por exemplo, regata preta"
                placeholderTextColor="#bfa7ff"
                value={descricao}
                onChangeText={setDescricao}
              />
            </View>
          </View>

          <View style={styles.bottomBox}>
            <TouchableOpacity style={styles.createButton} onPress={salvar}>
              <Text style={styles.createText}>Criar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}


const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "90%",
    height: 310,
    maxWidth: 350,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    marginBottom: 15,
    textAlign: "center",
    fontFamily: 'CreatoDisplay-Bold',
  },
  topButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 18,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  icon: {
    width: 40,
    height: 40,
    marginBottom: 5,
  },
  iconLabel: {
    fontSize: 12,
    textAlign: "center",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,

    width: "100%",
  },
  imagePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: "#ece6ff",
    justifyContent: "center",
    alignItems: "center",
  },
  imagePreview: {
    width: 70,
    height: 70,
    borderRadius: 8,
  },
  inputContainer: {
    flex: 1,
  },
  label: {
    fontWeight: "500",
    color: "#000",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "black",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  bottomBox: {
    width: 345,
    borderWidth: 2,
    borderColor: "#bfa7ff",
    borderRadius: 15,
    marginTop: 40,
    padding: 45,
    alignItems: "center",
    position: "absolute",
    bottom: 2,
    left: 2,
  },
  createButton: {
    backgroundColor: "#E3E3E3",
    paddingVertical: 10,
    borderRadius: 10,
    width: 59,
    height: 43,
    alignItems: "center",
    position: "absolute",
    top: 35,
    left: 10,
  },
  createText: {
    fontWeight: "600",
    fontSize: 15,
    fontFamily: 'CreatoDisplay-Bold',
    color: "#000",
  },
});
