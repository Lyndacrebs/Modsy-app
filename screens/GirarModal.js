import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

export default function GirarModal({ visible, onClose, onGirar }) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Girar Seção</Text>

          <TouchableOpacity
            style={styles.button}
            onPress={() => onGirar('superior')}
          >
            <Text style={styles.buttonText}>SUPERIOR</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={() => onGirar('inferior')}
          >
            <Text style={styles.buttonText}>INFERIOR</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={() => onGirar('calçado')}
          >
            <Text style={styles.buttonText}>CALÇADO</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onClose}
          >
            <Text style={styles.buttonText}>Cancelar</Text>
          </TouchableOpacity>
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
    width: '80%',
    maxWidth: 350,
    backgroundColor: 'rgba(168, 156, 242, 0.09)',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#A89CF2',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  cancelButton: {
    backgroundColor: '#E3E3E3',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
});