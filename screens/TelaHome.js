

// Screens/HomeScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  Animated,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GirarModal from './GirarModal';
import { db, rtdb } from '../firebaseConexao';
import { iniciarSegurarFala, pararSegurarFala, interpretarIntencao } from '../src/voice';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { ref, set, serverTimestamp } from 'firebase/database';
import * as Speech from 'expo-speech';



export default function TelaHome() {
  const navigation = useNavigation();
  const [modalVisible, setModalVisible] = useState(false);
  const [fontsLoaded] = useFonts({
    'CreatoDisplay-Bold': require('../assets/fonts/CreatoDisplay-Bold.otf'),
    'CreatoDisplay-Light': require('../assets/fonts/CreatoDisplay-Light.otf'),
    'CreatoDisplay-MediumItalic': require('../assets/fonts/CreatoDisplay-MediumItalic.otf'),
    'CreatoDisplay-Medium': require('../assets/fonts/CreatoDisplay-Medium.otf'),
    'CreatoDisplay-Regular': require('../assets/fonts/CreatoDisplay-Regular.otf'),
    'CreatoDisplay-Thin': require('../assets/fonts/CreatoDisplay-Thin.otf'),
    'Futura-Bold': require('../assets/fonts/Futura-Bold.otf'),
  });

  const [helpSound, setHelpSound] = useState();
  const [rotateSound, setRotateSound] = useState();
  const [girarModalVisible, setGirarModalVisible] = useState(false);

  const [pressionandoMicrofone, setPressionandoMicrofone] = useState(false);
  const [ultimoReconhecido, setUltimoReconhecido] = useState("");
  

useEffect(() => {
  const auth = getAuth();
  signInAnonymously(auth)
    .then(() => {
      console.log('Autenticado anonimamente no Firebase!');
    })
    .catch((error) => {
      console.error('Erro ao autenticar anonimamente:', error);
    });

  // Cleanup: só limpa os sons que existem no estado
  return () => {
    if (helpSound) helpSound.unloadAsync();
    if (rotateSound) rotateSound.unloadAsync();
  };
}, [helpSound, rotateSound]); 


const aoPressionarMicrofoneInicio = async () => {
  if (pressionandoMicrofone) return;

  //Tocar som de "microfone ligado"
  try {
    const { sound: micSound } = await Audio.Sound.createAsync(
      require('../assets/sounds/microfone_ligado.mp3')
    );
    await micSound.playAsync();
    await micSound.unloadAsync(); // Libera imediatamente
  } catch (err) {
    console.warn("Erro ao tocar som do microfone:", err);
  }

  // Fala a instrução
  await Speech.speak("Diga: girar parte superior, inferior ou calçado.", { language: "pt-BR" });

  setPressionandoMicrofone(true);
  setUltimoReconhecido("(ouvindo...)");

  try {
    await iniciarSegurarFala((parcial) => setUltimoReconhecido(parcial), { idioma: "pt-BR" });
  } catch (e) {
    console.error("Erro ao iniciar reconhecimento:", e);
    Speech.speak("Erro ao ativar o microfone.");
    setPressionandoMicrofone(false);
  }
};

// Ao soltar o botão
const aoPressionarMicrofoneFim = async () => {
  if (!pressionandoMicrofone) return;

  try {
    const texto = await pararSegurarFala();
    setPressionandoMicrofone(false);
    setUltimoReconhecido(texto || "(não entendi)");

    const intencao = interpretarIntencao(texto);
    if (intencao === "superior" || intencao === "inferior" || intencao === "calcado") {
      await sendGirarCommand(intencao);
    } else {
      Speech.speak("Comando não reconhecido. Tente dizer: girar parte superior.");
    }
  } catch (e) {
    console.error("Erro ao parar reconhecimento:", e);
    Speech.speak("Ocorreu um erro ao processar sua fala.");
    setPressionandoMicrofone(false);
  }
};


  const playHelpSound = async () => {
    if (helpSound) {
      await helpSound.unloadAsync();
    }

    const { sound: newSound } = await Audio.Sound.createAsync(
      require('../assets/sounds/manual_de_uso.mp3')
    );
    setHelpSound(newSound);
    await newSound.playAsync();
    setModalVisible(true);
  };

  const playRotateSound = async () => {
  if (rotateSound) {
    await rotateSound.unloadAsync();
  }

  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  // Em vez de girar imediatamente, abra o modal
  setGirarModalVisible(true);
};

  const rotation = useRef(new Animated.Value(0)).current;

  const spin = () => {
    rotation.setValue(0);
    Animated.spring(rotation, {
      toValue: 180,
      speed: 5,
      bounciness: 8,
      useNativeDriver: true,
    }).start();
  };

  if (!fontsLoaded) {
    return null;
  }

 const handleGirarSeção = async (seção) => {
  console.log(`Solicitando giro da seção: ${seção}`);
  
  try {
    // Referência para o nó 'comandoGirar' no Realtime Database
    const comandoRef = ref(rtdb, 'comandoGirar');

    // Envia os dados para o RTDB
    await set(comandoRef, {
      secao: seção,
      status: 'pendente', 
      timestamp: serverTimestamp(), 
     
    });

    console.log(`Comando de giro para ${seção} enviado para o Firebase RTDB.`);
    
   
    if (rotateSound) {
      await rotateSound.unloadAsync();
    }

  
    const { sound: newSound } = await Audio.Sound.createAsync(
      require('../assets/sounds/girando_o_guarda_roupa.mp3')
    );
    setRotateSound(newSound);
    await newSound.playAsync();

    // Fecha o modal após enviar o comando
    setGirarModalVisible(false);


  } catch (error) {
    console.error('Erro ao enviar comando de giro para o Firebase:', error);
    Alert.alert('Erro', 'Falha ao enviar comando para o guarda-roupa. Tente novamente.');
  }
};



const sendGirarCommand = async (secao) => {
  const secaoExibicao = secao === "calcado" ? "calçado" : secao;
  try {
    const comandoRef = ref(rtdb, 'comandoGirar');
    await set(comandoRef, {
      secao: secao, // mantém "calcado" sem acento no Firebase (recomendado)
      status: 'pendente',
      timestamp: serverTimestamp(),
    });

    Speech.speak(`Girando a seção ${secaoExibicao}.`);

    // Tocar som
    if (rotateSound) await rotateSound.unloadAsync();
    const { sound: newSound } = await Audio.Sound.createAsync(
      require('../assets/sounds/girando_o_guarda_roupa.mp3')
    );
    setRotateSound(newSound);
    await newSound.playAsync();
  } catch (error) {
    console.error('Erro ao enviar comando:', error);
    Speech.speak("Falha ao enviar comando.");
  }
};

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
        <Image
          source={require('../assets/images/logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />

        <View style={styles.buttonRow}>
        <TouchableOpacity
  style={styles.circleButton}
  onPressIn={aoPressionarMicrofoneInicio}
  onPressOut={aoPressionarMicrofoneFim}
  disabled={pressionandoMicrofone}
>
            <Image
              source={require('../assets/images/microfone.png')}
              style={styles.microfone}
              resizeMode="contain"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.squareButton}
            onPress={playHelpSound}
          >
            <Image
              source={require('../assets/images/help.png')}
              style={styles.help}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.largeButton}
          onPress={playRotateSound}
          activeOpacity={0.8}
        >
          <Animated.Image
            source={require('../assets/images/girar.png')}
            style={[
              styles.Button,
              {
                transform: [
                  {
                    rotate: rotation.interpolate({
                      inputRange: [0, 360],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                ],
              },
            ]}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <View style={styles.bottomBar}>
          <TouchableOpacity style={[styles.bottomButton, styles.activeButton]}>
            <Image
              source={require('../assets/images/house.png')}
              style={styles.icon}
              resizeMode="contain"
            />
            <Text style={styles.bottomText}>início</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bottomButton}
            onPress={() => navigation.navigate('TelaGuardaRoupa')}
          >
            <Image
              source={require('../assets/images/cabide.png')}
              style={styles.icon2}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <LinearGradient
            colors={['#11001E', '#11001E']}
            style={styles.modalContainer}
          >
            <Image
              source={require('../assets/images/bola3.png')}
              style={styles.backgroundImage3}
              resizeMode="cover"
            />
            <Image
              source={require('../assets/images/bola4.png')}
              style={styles.backgroundImage4}
              resizeMode="cover"
            />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Manual de uso do{'\n'}App Modsy</Text>
            <Text style={styles.modalSubtitle}>
              Bem-vindo ao Modsy - sua assistente{'\n'}inteligente para se vestir com autonomia!
            </Text>

            <ScrollView style={styles.modalContent}>
              <View style={styles.step}>
                <View style={styles.stepIconContainer}>
                  <Image
                    source={require('../assets/images/microfone.png')}
                    style={styles.stepIcon}
                  />
                </View>
                <View style={styles.stepTextContainer}>
                  <Text style={styles.stepTitle}>Escolha seu look por voz:</Text>
                  <Text style={styles.stepDescription}>
                    Toque no ícone do microfone e diga: "Roupa do trabalho", "Combinação 2".
                  </Text>
                </View>
              </View>

              <View style={styles.step}>
                <View style={styles.stepNumberContainer}>
                  <Text style={styles.stepNumber}>2</Text>
                </View>
                <View style={styles.stepTextContainer}>
                  <Text style={styles.stepTitle}>Escolha seu look por toque{'\n'}(Braille)</Text>
                  <Text style={styles.stepDescription}>
                    Toque nos botões numerados de 1 a 4{'\n'}no painel:
                    {'\n'}   •  Cada número corresponde a uma{'\n'}      combinação pré-cadastrada.
                  </Text>
                </View>
              </View>

              <View style={styles.step}>
                <View style={styles.stepNumberContainer}>
                  <Text style={styles.stepNumber}>3</Text>
                </View>
                <View style={styles.stepTextContainer}>
                  <Text style={styles.stepTitle}>Descubra o que tem no seu guarda-roupa</Text>
                  <Text style={styles.stepDescription}>
                    Na página do guarda roupa, clique no{'\n'}ícone de + e use a câmera do celular{'\n'}para tirar uma foto de qualquer peça.
                  </Text>
                </View>
              </View>

              <View style={styles.step}>
                <View style={styles.stepNumberContainer}>
                  <Text style={styles.stepNumber}>4</Text>
                </View>
                <View style={styles.stepTextContainer}>
                  <Text style={styles.stepTitle}>Gire o guarda-roupa automaticamente</Text>
                  <Text style={styles.stepDescription}>
                    Após escolher seu look, toque no botão{'\n'}"Girar Guarda-Roupa" 🔄.
                    {'\n'}   •  O guarda-roupa girará até posicionar {'\n'}      exatamente a combinação que você{'\n'}      escolheu.
                  </Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.footerButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.footerButtonText}>
                Antes de começar, peça ajuda a alguém para cadastrar suas combinações favoritas no app
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </Modal>

{/* Modal para escolher a seção a girar */}
<GirarModal
  visible={girarModalVisible}
  onClose={() => setGirarModalVisible(false)}
  onGirar={handleGirarSeção}
/>


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
    justifyContent: 'center',
    alignItems: 'center',
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
  logoImage: {
    width: 340,
    height: 110,
    marginBottom: 110,
    marginTop: 50
  },
  Button: {
    width: 250,
    height: 180,
  },
  microfone: {
    width: 70,
    height: 70,
  },
  help: {
    width: 80,
    height: 80,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
    marginBottom: 20,
  },
  circleButton: {
    width: 124,
    height: 124,
    backgroundColor: 'rgba(168, 156, 242, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#A89CF2',
    overflow: 'hidden',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 0,
  },
  squareButton: {
    width: 130,
    height: 121,
    borderRadius: 30,
    backgroundColor: 'rgba(168, 156, 242, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A89CF2',
  },
  largeButton: {
    width: 276,
    height: 220,
    borderRadius: 30,
    backgroundColor: 'rgba(168, 156, 242, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A89CF2',
    marginBottom: 210,
  },
  icon: {
    width: 20,
    height: 20,
  },
  icon2: {
    width: 26,
    height: 20,
    marginLeft: 5,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#050505',
    borderRadius: 40,
    paddingHorizontal: 10,
    paddingVertical: 5,
    width: 215,
    height: 70,
    marginLeft: 75,
    justifyContent: 'center',
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
    width: 120,
    height: 45,
  },
  bottomText: {
    color: '#000000',
    fontSize: 15,
    marginLeft: 10,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 50,
    paddingBottom: 80,
    position: 'relative',
  },
  backgroundImage3: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 230,
    height: 400,
  },
  backgroundImage4: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 200,
    height: 400,
    marginTop: 460,
    marginLeft: 210,
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeIcon: {
    fontSize: 24,
    color: '#ffffff',
  },
  modalTitle: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 15,
    textAlign: 'left',
    fontFamily: 'CreatoDisplay-Bold',
    paddingLeft: 10,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 40,
    textAlign: 'left',
    lineHeight: 22,
    fontFamily: 'CreatoDisplay-Regular',
    paddingLeft: 10,
  },
  modalContent: {
    flex: 1,
    marginBottom: 20,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  stepIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 40,
    backgroundColor: '#A89CF2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  stepNumberContainer: {
    width: 25,
    height: 25,
    borderRadius: 45,
    backgroundColor: 'rgb(255, 255, 255)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    marginLeft: 5,
  },
  stepNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'black',
    fontFamily: 'CreatoDisplay-Bold',
  },
  stepIcon: {
    width: 45,
    height: 45,
    tintColor: '#ffffff',
  },
  stepTextContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 17,
    color: '#ffffff',
    marginBottom: 7,
    fontFamily: 'CreatoDisplay-Bold',
    letterSpacing: 1,
  },
  stepDescription: {
    fontSize: 15,
    color: '#ffffff',
    lineHeight: 20,
    fontFamily: 'CreatoDisplay-Regular',
  },
  footerButton: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: '#A89CF2',
    borderRadius: 30,
    paddingVertical: 8,
    paddingHorizontal: 15,
    alignItems: 'center',
    shadowColor: '#8A38F5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(138, 56, 245, 0.6)',
    elevation: 16,
  },
  footerButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
});