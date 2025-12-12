import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Image,
} from 'react-native';
import { db, rtdb } from './firebaseConexao';
import { collection, doc, getDocs, addDoc, query, where, orderBy } from 'firebase/firestore';
import { ref as rtdbRef, set as rtdbSet} from 'firebase/database';
import { useNavigation } from '@react-navigation/native';
import { File } from 'expo-file-system';

export default function SalvarLookModal({ visible, onClose, selectedItems }) {
  const navigation = useNavigation();
  const [nome, setNome] = useState('');
  const [peçasSelecionadas, setPeçasSelecionadas] = useState({
    superior: null,
    inferior: null,
    calçado: null,
  });

  const getImageBase64 = async (imagePath) => {
    try {
      const file = new File(imagePath);
      const base64 = await file.base64();
      return `data:image/jpeg;base64,${base64}`;
    } catch (error) {
      console.warn('Erro ao carregar imagem:', error);
      return null;
    }
  };

  useEffect(() => {
    const fetchPeças = async () => {
      const novasPeças = { ...peçasSelecionadas };

      const categorias = ['superior', 'inferior', 'calçado'];
      for (const tipo of categorias) {
        const id = selectedItems[`${tipo}Id`];
        if (id) {
          const docRef = doc(db, 'roupas', id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            const imageBase64 = await getImageBase64(data.imagePath);
            novasPeças[tipo] = { ...data, imageBase64 };
          }
        }
      }

      setPeçasSelecionadas(novasPeças);
    };

    if (visible) fetchPeças();
  }, [visible, selectedItems]);

  const salvar = async () => {
  if (!nome.trim()) {
    Alert.alert('Erro', 'Por favor, informe o nome do look');
    return;
  }

  const selectedCount = [
    selectedItems.superiorId,
    selectedItems.inferiorId,
    selectedItems.calçadoId,
  ].filter((id) => id !== null).length;

  if (selectedCount < 2) {
    Alert.alert('Erro', 'Selecione pelo menos duas peças de categorias diferentes.');
    return;
  }

  try {
    // =========== PASSO 1: Atualizar posições em /mapaPecas ===========
    const tipos = ['superior', 'inferior', 'calçado'];
    for (const tipo of tipos) {
      // Busca todas as peças do tipo, ordenadas por data de cadastro
      const q = query(
        collection(db, 'roupas'),
        where('tipo', '==', tipo),
     
      );
      const snapshot = await getDocs(q);
      
      // Atribui posição com base na ordem (máx 4)
      let pos = 1;
      for (const docSnap of snapshot.docs) {
        if (pos > 4) break; // Só 4 posições

        await rtdbSet(
          rtdbRef(rtdb, `mapaPecas/${docSnap.id}`),
          {
            posicao: pos,
            tipo: tipo,
          }
        );
        pos++;
      }
    }

    // =========== PASSO 2: Salvar o look no Firestore ===========
    const lookDoc = await addDoc(collection(db, 'looks'), {
      nome: nome.trim(),
      superiorId: selectedItems.superiorId || null,
      inferiorId: selectedItems.inferiorId || null,
      calçadoId: selectedItems.calçadoId || null,
      dataCriacao: new Date(),
    });

    // =========== PASSO 3: Salvar no Realtime Database (/posicoesRoupas) ===========
    // Gera um ID de look fixo (look1, look2, ...) com base na contagem
    const looksSnapshot = await getDocs(collection(db, 'looks'));
    const lookNumber = Math.min(looksSnapshot.size, 4); // máximo 4 looks
    const lookKey = `look${lookNumber}`;

    const lookData = {};
    if (selectedItems.superiorId) lookData.superior = selectedItems.superiorId;
    if (selectedItems.inferiorId) lookData.inferior = selectedItems.inferiorId;
    if (selectedItems.calçadoId) lookData.calçado = selectedItems.calçadoId;

    await rtdbSet(
      rtdbRef(rtdb, `posicoesRoupas/${lookKey}`),
      lookData
    );

    Alert.alert('Sucesso!', 'Look salvo e posições atualizadas!');
    setNome('');
    onClose();
    navigation.navigate('TelaFavoritos');
  } catch (e) {
    console.error('Erro ao salvar look:', e);
    Alert.alert('Erro', 'Falha ao salvar o look.');
  }
};


  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      pointerEvents="auto"
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>Salvar Look</Text>

          {/* Peças selecionadas */}
          <View style={styles.peçasContainer}>
            {peçasSelecionadas.superior && (
              <Image
                source={{ uri: peçasSelecionadas.superior.imageBase64 }}
                style={styles.peçaImage}
                resizeMode="cover"
              />
            )}
            {peçasSelecionadas.inferior && (
              <Image
                source={{ uri: peçasSelecionadas.inferior.imageBase64 }}
                style={styles.peçaImage}
                resizeMode="cover"
              />
            )}
            {peçasSelecionadas.calçado && (
              <Image
                source={{ uri: peçasSelecionadas.calçado.imageBase64 }}
                style={styles.peçaImage}
                resizeMode="cover"
              />
            )}
          </View>

         <View style={styles.inputContainer}>
         <Text style={styles.inputLabel}>Nome</Text>
          {/* Campo nome */}
          <TextInput
            placeholder="Ex: roupa de academia"
            placeholderTextColor="#bfa7ff"
            value={nome}
            onChangeText={setNome}
            style={styles.input}
          />
          </View>

        

<View style={styles.bottomBox}>
  <View style={styles.buttonRow}>
    <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
      <Text style={styles.cancelText}>Cancelar</Text>
    </TouchableOpacity>

    <TouchableOpacity style={styles.saveButton} onPress={salvar}>
      <Text style={styles.saveText}>Criar</Text>
    </TouchableOpacity>
  </View>
</View>


        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)', 
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: "90%",
    height: 335,
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
  title: {
    fontSize: 20,
    color: '#000',
    fontFamily: 'CreatoDisplay-Bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  peçasContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  peçaImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: '#A89CF2',
  },
  inputLabel: {
  fontSize: 16,
  color: "#000", 
  marginBottom: 8,
  fontFamily: 'CreatoDisplay-Medium',
},
  input: {
   borderWidth: 2,
    borderColor: 'black',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  bottomBox: {
    width: 345,
  borderWidth: 2,
  borderColor: "#bfa7ff",
  borderRadius: 15,
  marginTop: 10,
  padding: 45,
  alignItems: "center",
  position: "absolute",
  bottom: 2,
  left: 2,
},
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  cancelButton: {
   backgroundColor: "#E3E3E3",
    paddingVertical: 10,
    borderRadius: 10,
    width: 80,
    height: 43,
    alignItems: "center",
    position: "absolute",
    top: -10,
    left: -30,
  },
  saveButton: {
    backgroundColor: '#A89CF2',
    paddingVertical: 10,
    borderRadius: 10,
    width: 80,
    height: 43,
    alignItems: "center",
    position: "absolute",
    top: -10,
    left: 70,
  },
  cancelText: {
    color: '#000',
    textAlign: 'center',
    fontFamily: 'CreatoDisplay-Medium'
  },
  saveText: {
    color: '#000',
    textAlign: 'center',
    fontFamily: 'CreatoDisplay-Medium'
  },
});
