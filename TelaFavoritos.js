// TelaFavoritos.js
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, Alert, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { db, rtdb } from './firebaseConexao'; // Ajuste o caminho se necessário
import { getDatabase, ref, set } from 'firebase/database';
import { collection, getDocs, doc, getDoc, orderBy, query,  deleteDoc } from 'firebase/firestore';
import { File } from 'expo-file-system';

const { width } = Dimensions.get('window');

export default function TelaFavoritos() {
  const navigation = useNavigation();
  const [looks, setLooks] = useState([]);

  // 1. Primeiro, declare usarLook AQUI, dentro do componente
  const usarLook = async (numeroLook) => {
    try {
      await set(ref(rtdb, 'comandoLook'), {
        status: 'pendente',
        look: numeroLook
      });
      Alert.alert('Sucesso!', `Comando para Look ${numeroLook} enviado!`);
    } catch (error) {
      console.error('Erro ao enviar comando:', error);
      Alert.alert('Erro', 'Falha ao enviar comando.');
    }
  };


  useEffect(() => {
    const fetchLooks = async () => {
  try {
    // Busca em ordem de criação ASC (mais antigo primeiro)
    const q = query(collection(db, 'looks'), orderBy('dataCriacao', 'asc'));
    const querySnapshot = await getDocs(q);
    
    // Mapeia mantendo a ordem de cadastro (para numerar corretamente)
    const looksOrdenadosPorCadastro = await Promise.all(
      querySnapshot.docs.map(async (docSnap, index) => {
        const look = { id: docSnap.id, ...docSnap.data() };

        // Buscar peças (mesmo código)
        const pecas = {};
        const pecasPromises = [];

        if (look.superiorId) {
          pecasPromises.push(
            getDoc(doc(db, 'roupas', look.superiorId)).then(snap => {
              if (snap.exists()) return { tipo: 'superior', data: snap.data() };
              return null;
            })
          );
        }
        if (look.inferiorId) {
          pecasPromises.push(
            getDoc(doc(db, 'roupas', look.inferiorId)).then(snap => {
              if (snap.exists()) return { tipo: 'inferior', data: snap.data() };
              return null;
            })
          );
        }
        if (look.calçadoId) {
          pecasPromises.push(
            getDoc(doc(db, 'roupas', look.calçadoId)).then(snap => {
              if (snap.exists()) return { tipo: 'calçado', data: snap.data() };
              return null;
            })
          );
        }

        const resultados = await Promise.all(pecasPromises);
        for (const res of resultados) {
          if (res) pecas[res.tipo] = res.data;
        }

        // Converter imagens (mesmo código)
        const pecasComImagem = {};
        for (const tipo of ['superior', 'inferior', 'calçado']) {
          if (pecas[tipo]) {
            try {
              const file = new File(pecas[tipo].imagePath);
              const base64 = await file.base64();
              pecasComImagem[tipo] = { ...pecas[tipo], imageBase64: `data:image/jpeg;base64,${base64}` };
            } catch (error) {
              pecasComImagem[tipo] = { ...pecas[tipo], imageBase64: null };
            }
          }
        }

        // 🔑 AQUI: número baseado na ordem de cadastro (não na exibição)
        return {
          ...look,
          ...pecasComImagem,
          numero: (index + 1).toString(), // Sem zero à esquerda (ex: "1", "2")
        };
      })
    );

    // Inverte a lista para exibir do mais novo ao mais antigo
    const looksParaExibir = looksOrdenadosPorCadastro.reverse();

    setLooks(looksParaExibir);
  } catch (error) {
    console.error('Erro ao buscar looks:', error);
    Alert.alert('Erro', 'Falha ao carregar looks');
  }
};

    fetchLooks();
  }, []);

   // Nova função para deletar o look
  const handleDeleteLook = async (lookId) => {
    try {
      // Pergunta ao usuário se tem certeza
      Alert.alert(
        'Excluir Look',
        'Tem certeza que deseja excluir este look dos favoritos?',
        [
          {
            text: 'Cancelar',
            style: 'cancel'
          },
          {
            text: 'Excluir',
            style: 'destructive', // Estilo vermelho para "excluir"
            onPress: async () => {
              try {
                // Deleta o documento do look no Firestore
                await deleteDoc(doc(db, 'looks', lookId));

                // Atualiza o estado local para remover o look deletado
                setLooks(prevLooks => prevLooks.filter(look => look.id !== lookId));

                Alert.alert('Sucesso!', 'Look excluído dos favoritos!');
              } catch (error) {
                console.error('Erro ao excluir look:', error);
                Alert.alert('Erro', 'Falha ao excluir o look. Tente novamente.');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Erro na função handleDeleteLook:', error);
      Alert.alert('Erro', 'Ocorreu um erro inesperado.');
    }
  };

  const renderItem = ({ item }) => (
  <View style={styles.lookContainer}>
    <Text style={styles.lookTitle}>{item.nome}</Text>

    {/* TODO O CONTEÚDO É UM BOTÃO (exceto lixeira) */}
    <TouchableOpacity
      style={styles.lookContent}
      onPress={() => usarLook(item.numero)}
      activeOpacity={0.9}
    >
      <Text style={styles.lookNumber}>{item.numero}</Text>
      <View style={styles.peçasContainer}>
        {item.superior?.imageBase64 && (
          <Image source={{ uri: item.superior.imageBase64 }} style={styles.peçaImage} />
        )}
        {item.inferior?.imageBase64 && (
          <Image source={{ uri: item.inferior.imageBase64 }} style={styles.peçaImage} />
        )}
        {item.calçado?.imageBase64 && (
          <Image source={{ uri: item.calçado.imageBase64 }} style={styles.peçaImage} />
        )}
      </View>
    </TouchableOpacity>

    {/* Lixeira permanece como botão separado */}
   
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={(e) => {
          e.stopPropagation(); // Impede que o clique na lixeira ative o look
          handleDeleteLook(item.id);
        }}
      >
        <Image
          source={require('./assets/images/lixeira.png')}
          style={styles.deleteIcon}
          resizeMode="contain"
        />
      </TouchableOpacity>
   
  </View>
);
  
  // Cálculo dinâmico do marginBottom com base no número de looks
  // A cada novo look, o espaço diminui para acomodar a altura total dos looks
  const baseMargin = 100;
  const decrementoPorLook = 30; // Ajuste este valor conforme a altura real de cada lookContainer
  const looksExtras = Math.max(0, looks.length - 3); // Só conta looks extras a partir do 4º
  const marginBottom = Math.max(20, baseMargin - (decrementoPorLook * looksExtras));

  return (
    <LinearGradient
      colors={['#050505', '#050505']}
      style={styles.container}
    >
      {/* Background images (opcional) */}
      <Image
        source={require('./assets/images/bola1.png')}
        style={styles.backgroundImage1}
        resizeMode="cover"
      />
      <Image
        source={require('./assets/images/bola2.png')}
        style={styles.backgroundImage2}
        resizeMode="cover"
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconContainer}
          onPress={() => navigation.navigate('TelaGuardaRoupa')}
        >
          <Image
            source={require("./assets/images/seta.png")}
            style={styles.IconFav}
            resizeMode="contain"
          />
        </TouchableOpacity>

        <Image
          source={require('./assets/images/logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>

      {/* Card principal */}
      <View style={[styles.card, { marginBottom }]}>
        <FlatList
          data={looks}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  backgroundImage1: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 230,
    height: 400,
    marginTop: 180,
  },
  backgroundImage2: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 200,
    height: 470,
    marginTop: 430,
    marginLeft: 210,
  },
  header: {
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 50,
    paddingBottom: 10,
    marginBottom: 80
  },
  logoImage: {
    position: "absolute",
    top: 20,
    right: 50,
    width: 350,
    height: 110,
  },
  iconContainer: {
    position: "absolute",
    right: 20,
    top: 55,
  },
  IconFav: {
    width: 63,
    height: 63,
  },
  card: {
    backgroundColor: 'rgba(168, 156, 242, 0.09)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#fff',
    padding: 20,
    flex: 1,
    minHeight: 500,
  },
  listContent: {
    flexGrow: 1, // Garante que o conteúdo cresça
    paddingBottom: 100, // Espaço extra na parte inferior
  },
  lookContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lookTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  lookContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lookNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginRight: 15,
  },
   deleteButton: {
    marginTop: 5,
    padding: 10,
    backgroundColor: 'transparent', // Para visualizar melhor
  },
  deleteIcon: {
    width: 20,
    height: 20,
  },
  
  peçasContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  peçaImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
});