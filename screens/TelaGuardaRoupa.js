
import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, Image, ScrollView, Alert, StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { db } from '../firebaseConexao';
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import CadastrarRoupaModal from '../CadastrarRoupaModal';
import SalvarLookModal from '../SalvarLookModal';
import { File } from 'expo-file-system';


export default function TelaGuardaRoupa() {
  const navigation = useNavigation();
  const [modalVisible, setModalVisible] = useState(false);
  const [lookModalVisible, setLookModalVisible] = useState(false);
  const [selectedTipo, setSelectedTipo] = useState('');
  const [roupas, setRoupas] = useState({
    superior: [],
    inferior: [],
    calçado: []
  });
  const [selectedItems, setSelectedItems] = useState({ 
  superiorId: null,
  inferiorId: null, 
  calçadoId: null 
});

const [canCreateLook, setCanCreateLook] = useState(false);

useEffect(() => {
  const selectedCount = [
    selectedItems.superiorId,
    selectedItems.inferiorId,
    selectedItems.calçadoId
  ].filter(id => id !== null).length;

  // Pelo menos 2 peças de categorias diferentes
  setCanCreateLook(selectedCount >= 2);
}, [selectedItems]);

const selectItem = (item) => {
  const newSelected = { ...selectedItems };

  if (item.tipo === 'superior') {
    newSelected.superiorId = item.id;
  } else if (item.tipo === 'inferior') {
    newSelected.inferiorId = item.id;
  } else if (item.tipo === 'calçado') {
    newSelected.calçadoId = item.id;
  }

  setSelectedItems(newSelected);
};

  const [fontsLoaded] = useFonts({
    'CreatoDisplay-Bold': require('../assets/fonts/CreatoDisplay-Bold.otf'),
    'CreatoDisplay-Light': require('../assets/fonts/CreatoDisplay-Light.otf'),
    'CreatoDisplay-MediumItalic': require('../assets/fonts/CreatoDisplay-MediumItalic.otf'),
    'CreatoDisplay-Medium': require('../assets/fonts/CreatoDisplay-Medium.otf'),
    'CreatoDisplay-Regular': require('../assets/fonts/CreatoDisplay-Regular.otf'),
    'CreatoDisplay-Thin': require('../assets/fonts/CreatoDisplay-Thin.otf'),
    'Futura-Bold': require('../assets/fonts/Futura-Bold.otf'),
  });

  const handleDelete = async (item) => {
  try {
    
    await deleteDoc(doc(db, 'roupas', item.id));


    const file = new File(item.imagePath);
    await file.delete();

   
    setRoupas(prev => ({
      ...prev,
      [item.tipo]: prev[item.tipo].filter(r => r.id !== item.id)
    }));

    Alert.alert('Sucesso!', 'Roupa excluída com sucesso!');
  } catch (error) {
    console.error('Erro ao excluir roupa:', error);
    Alert.alert('Erro', 'Falha ao excluir roupa');
  }
};



  useEffect(() => {
    const qSuperior = query(collection(db, 'roupas'), where('tipo', '==', 'superior'));
    const qInferior = query(collection(db, 'roupas'), where('tipo', '==', 'inferior'));
    const qCalçado = query(collection(db, 'roupas'), where('tipo', '==', 'calçado'));

    const fetchImageBase64 = async (imagePath) => {
      try {
        const file = new File(imagePath);
        const base64 = await file.base64();
        return `data:image/jpeg;base64,${base64}`;
      } catch (error) {
        console.warn('Erro ao carregar imagem:', error);
        return null;
      }
    };

    const processSnapshot = async (snapshot, tipo) => {
      const roupasAtualizadas = [];
      for (const doc of snapshot.docs) {
        const data = doc.data();
        const imageBase64 = await fetchImageBase64(data.imagePath);
        if (imageBase64) {
          roupasAtualizadas.push({ id: doc.id, ...data, imageBase64 });
        }
      }
      setRoupas(prev => ({ ...prev, [tipo]: roupasAtualizadas }));
    };

    const unsubscribeSuperior = onSnapshot(qSuperior, (snapshot) => {
      processSnapshot(snapshot, 'superior');
    });

    const unsubscribeInferior = onSnapshot(qInferior, (snapshot) => {
      processSnapshot(snapshot, 'inferior');
    });

    const unsubscribeCalçado = onSnapshot(qCalçado, (snapshot) => {
      processSnapshot(snapshot, 'calçado');
    });

    return () => {
      unsubscribeSuperior();
      unsubscribeInferior();
      unsubscribeCalçado();
    };
    
  },
  
  []);

  const openModal = (tipo) => {
    setSelectedTipo(tipo);
    setModalVisible(true);
  };

  const renderCategory = (title, items, tipo) => (
    <View style={styles.categoryContainer} key={tipo}>
      <Text style={styles.categoryTitle}>{title}</Text>

      <ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  style={styles.scrollView}
  contentContainerStyle={styles.scrollContent}
>
  {/* Botão adicionar*/}
  <TouchableOpacity
    style={styles.addButton}
    onPress={() => openModal(tipo)}
  >
    <Text style={styles.addButtonText}>+</Text>
  </TouchableOpacity>


{items.map((item) => {
  // Verifica se a peça está selecionada
  const isSelected = 
    (item.tipo === 'superior' && selectedItems.superiorId === item.id) ||
    (item.tipo === 'inferior' && selectedItems.inferiorId === item.id) ||
    (item.tipo === 'calçado' && selectedItems.calçadoId === item.id);

  return (
    <View key={item.id} style={[styles.roupaItem, isSelected && styles.selectedItem]}>
      {/* Imagem */}
      <TouchableOpacity
        style={styles.imageWrapper}
        onPress={() => selectItem(item)}
      >
        <Image
          source={{ uri: item.imageBase64 }}
          style={styles.roupaImage}
          resizeMode="cover"
        />
      </TouchableOpacity>

      {/* Botão de lixeira */}
      <TouchableOpacity
        style={styles.lixeiraButton}
        onPress={() => handleDelete(item)}
      >
        <Image
          source={require('../assets/images/lixeira.png')}
          style={styles.lixeiraIcon}
          resizeMode="contain"
        />
      </TouchableOpacity>
    </View>
  );
})}
</ScrollView>

    </View>
  );



  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={['#050505', '#050505']}
        style={styles.container}
      >
        <Image
          source={require('../assets/images/bola1.png')}
          style={styles.backgroundImage1}
          resizeMode="cover"
        />
        <Image
          source={require('../assets/images/bola2.png')}
          style={styles.backgroundImage2}
          resizeMode="cover"
        />

        {/* Header*/}
        <View style={styles.header}>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <TouchableOpacity
            style={styles.iconContainer}
            onPress={() => navigation.navigate('TelaFavoritos')}
          >
            <Image
              source={require("../assets/images/favoritos.png")}
              style={styles.IconFav}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        {/* Main Card  */}
        <View style={styles.card}>
          {renderCategory('Roupa superior', roupas.superior, 'superior')}
          {renderCategory('Roupa inferior', roupas.inferior, 'inferior')}
          {renderCategory('Calçados', roupas.calçado, 'calçado')}
        </View>

        {/* Botão "Criar Look"  */}
        {canCreateLook && (
          <View style={styles.createLookContainer}>
            <TouchableOpacity
              style={styles.createLookButton}
              onPress={() => setLookModalVisible(true)}
            >
              <Text style={styles.createLookText}>Criar Look</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Modal */}
        <CadastrarRoupaModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          tipo={selectedTipo}
        />

        {/* Modal de salvar look */}
        <SalvarLookModal
          visible={lookModalVisible}
          onClose={() => setLookModalVisible(false)}
          selectedItems={selectedItems}
        />

        {/* Barra inferior - fora do ScrollView */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.bottomButton}
            onPress={() => navigation.navigate('TelaHome')}
          >
            <Image
              source={require('../assets/images/house2.png')}
              style={styles.icon}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.bottomButton, styles.activeButton]}>
            <Text style={styles.bottomText}>Guarda-Roupa</Text>
            <Image
              source={require('../assets/images/cabide2.png')}
              style={styles.icon2}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#050505',
  },
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
    paddingTop: 10,
    paddingBottom: 10,
    marginBottom: 80
  },
  logoImage: {
    position: "absolute",
    top: -10,
    right: 40, 
    width: 340,
    height: 110,
  },
  iconContainer: {
    position: "absolute",
    right: 10,
    top: 25,
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
    marginBottom: 20,
    marginTop:30
  },
  categoryContainer: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 14,
    fontFamily: 'CreatoDisplay-Bold',
    color: 'white',
    marginBottom: 10,
    fontWeight: '500',
  },
  addButton: {
    width: 120,
    height: 156,
    backgroundColor: '#A89CF2',
    borderRadius: 10,
    borderColor: '#FFF',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 30,
    color: 'black',
  },
  roupaItem: {
    width: 120,
    height: 156,
    backgroundColor: '#A89CF2',
    borderRadius: 10,
    marginRight: 10,
    marginLeft: 20,
    overflow: 'hidden',
    borderColor: '#FFF',
    borderWidth: 2,
  },
  roupaImage: {
    width: '100%',
    height: '100%',
  },
  subtitle: {
    fontSize: 16,
    color: '#A89CF2',
    textAlign: 'center',
    fontFamily: 'CreatoDisplay-Regular',
    paddingHorizontal: 30,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 10,
    left: 5,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#050505',
    borderRadius: 40,
    paddingHorizontal: 10,
    paddingVertical: 5,
    width: 260,
    height: 80,
    marginLeft: 75,
    justifyContent: 'center',
    zIndex: 999,
  },
  bottomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 40,
  },
  activeButton: {
    backgroundColor: '#A89CF2',
    width: 180,
    height: 45,
  },
  icon: {
    width: 23,
    height: 23,
    marginLeft: -10
  },
  icon2: {
    width: 26,
    height: 20,
    marginLeft: 5,
  },
  bottomText: {
    color: '#000000',
    fontSize: 15,
    marginLeft: 5,
    marginRight: 10,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingHorizontal: 10,
  },
  lixeiraButton: {
    position: 'absolute',
    top: 5,
    right: 10,
    width: 24,
    height: 24,
    zIndex: 10,
  },
  lixeiraIcon: {
    width: 28,
    height: 28,
  },
  createLookContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  createLookButton: {
    backgroundColor: '#A89CF2',
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 10,
  },
  createLookText: {
    fontSize: 15,
    color: 'black',
    fontWeight: 'bold',
  },
  selectedItem: {
    borderColor: '#2200ffff',
    borderWidth: 2,
  },
});